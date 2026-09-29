import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// callVertexJson — SDK ile SÖZLEŞME.
//
// Yeniden deneme artık SDK'nın yerleşik `retryOptions`'ında (resmi mekanizma).
// Bu testler SDK'nın kendisini değil, BİZİM ona doğru şeyi verdiğimizi ve
// döneni doğru yorumladığımızı doğruluyor:
//   • retryOptions / abortSignal / labels / responseJsonSchema gidiyor mu?
//   • HTTP deneme sayısı (SDK yeniden denemeleri) loga yansıyor mu?
//   • Nihai hata devre kesiciyi TAM BİR kez artırıyor ve KOD ile loglanıyor mu?
//   • Şemaya uymayan yanıt reddediliyor mu?
//   • Bozuk kimlikte hiç ağa/DB'ye çıkılmıyor mu?
// ---------------------------------------------------------------------------

type Cagri = { fn: string; args: Record<string, unknown> }
const rpcCagrilari: Cagri[] = []
const generateContent = vi.fn()

vi.mock('@google/genai', async (orijinal) => ({
  ...(await orijinal<typeof import('@google/genai')>()),
  GoogleGenAI: class {
    models = { generateContent }
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(async () => ({
    rpc: vi.fn((fn: string, args: Record<string, unknown>) => {
      rpcCagrilari.push({ fn, args })
      if (fn === 'ai_gunluk_hata_sayisi') return Promise.resolve({ data: 0, error: null })
      if (fn === 'ai_kota_tuket') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    }),
  })),
}))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn(async () => undefined) }))

import { ApiError } from '@google/genai'
import { callVertexJson } from './vertex-core'

const Sema = z.object({ selectedIndices: z.array(z.int().min(0)).min(1) })

function cagir() {
  return callVertexJson({
    feature: 'mood_ai_curation',
    model: 'gemini-2.5-flash',
    promptVersion: 'mood-v2-indeks',
    prompt: 'p',
    sema: Sema,
    maxOutputTokens: 100,
    gunlukTavan: 10,
    timeoutMs: 18_000,
    denemeZamanAsimiMs: 10_000,
  })
}

const log = () => rpcCagrilari.find((c) => c.fn === 'ai_log_generation')?.args
const hataKaydiSayisi = () => rpcCagrilari.filter((c) => c.fn === 'ai_hata_kaydet').length

const eskiEnv = { ...process.env }

beforeEach(() => {
  rpcCagrilari.length = 0
  generateContent.mockReset()
  process.env.GCP_PROJECT_ID = 'test-projesi'
  process.env.GOOGLE_APPLICATION_CREDENTIALS = './yok.json'
  delete process.env.GCP_SERVICE_ACCOUNT_JSON
  delete process.env.GCP_LOCATION
  // Kapanış tarihi (ai-kapanis.ts) bu sözleşme testlerini zamana bağımlı yapmasın.
  process.env.AI_KAPANIS_TARIHI = 'yok'
})

afterEach(() => {
  process.env = { ...eskiEnv }
  vi.unstubAllGlobals()
})

describe('callVertexJson — SDK’ya verilen yapılandırma', () => {
  it('resmi retryOptions, gerçek iptal sinyali, faturalama etiketi ve zod’dan türeyen şema gönderir', async () => {
    generateContent.mockResolvedValue({ text: '{"selectedIndices":[1]}', usageMetadata: {} })

    await cagir()

    const { config } = generateContent.mock.calls[0][0]
    expect(config.httpOptions.retryOptions.httpStatusCodes).toEqual(expect.arrayContaining([429, 503]))
    expect(config.httpOptions.timeout).toBe(10_000)
    expect(typeof config.httpOptions.fetch).toBe('function')
    expect(config.abortSignal).toBeInstanceOf(AbortSignal)
    expect(config.labels).toEqual({ rosso_feature: 'mood_ai_curation', rosso_prompt: 'mood-v2-indeks' })
    expect(config.responseMimeType).toBe('application/json')
    expect(config.responseJsonSchema.required).toEqual(['selectedIndices'])
  })
})

describe('callVertexJson — başarı', () => {
  it('SDK’nın HTTP denemelerini sayar, önbellek token’ını ve model sürümünü loglar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    // SDK'nın bir 429'u kendi içinde yeniden denediğini taklit et: sarılmış fetch iki kez çağrılır.
    generateContent.mockImplementation(async ({ config }) => {
      await config.httpOptions.fetch('https://x', {})
      await config.httpOptions.fetch('https://x', {})
      return {
        text: '{"selectedIndices":[2,0]}',
        modelVersion: 'gemini-2.5-flash',
        usageMetadata: { promptTokenCount: 6000, candidatesTokenCount: 180, cachedContentTokenCount: 2048 },
      }
    })

    const sonuc = await cagir()

    expect(sonuc?.data.selectedIndices).toEqual([2, 0])
    expect(sonuc?.attempts).toBe(2)
    expect(log()).toMatchObject({
      p_status: 'success',
      p_attempts: 2,
      p_cached_tokens: 2048,
      p_prompt_tokens: 6000,
      p_output_tokens: 180,
      p_model_version: 'gemini-2.5-flash',
    })
    // Kurtarılan yeniden deneme bir BAŞARISIZLIK değildir.
    expect(hataKaydiSayisi()).toBe(0)
    // Kota mantıksal çağrı başına BİR kez.
    expect(rpcCagrilari.filter((c) => c.fn === 'ai_kota_tuket')).toHaveLength(1)
  })
})

describe('callVertexJson — nihai hata', () => {
  it('ApiError 503: null döner, devre kesici TAM BİR kez, kod "503" loglanır', async () => {
    generateContent.mockRejectedValue(new ApiError({ message: 'Service Unavailable', status: 503 }))

    expect(await cagir()).toBeNull()
    expect(hataKaydiSayisi()).toBe(1)
    expect(log()).toMatchObject({ p_status: 'error', p_error_code: '503' })
  })

  it('zaman aşımı "timeout" koduyla loglanır', async () => {
    generateContent.mockRejectedValue(new DOMException('zaman doldu', 'TimeoutError'))

    expect(await cagir()).toBeNull()
    expect(log()).toMatchObject({ p_error_code: 'timeout' })
  })

  it('şemaya uymayan yanıt reddedilir ("schema") — değer değil yalnız yol loglanır', async () => {
    generateContent.mockResolvedValue({ text: '{"selectedIndices":[-5]}', usageMetadata: {} })

    expect(await cagir()).toBeNull()
    expect(log()).toMatchObject({ p_error_code: 'schema' })
    expect(String(log()?.p_error_message)).not.toContain('-5')
  })

  it('JSON olmayan yanıt "parse" koduyla reddedilir', async () => {
    generateContent.mockResolvedValue({ text: 'bu json degil', usageMetadata: {} })

    expect(await cagir()).toBeNull()
    expect(log()).toMatchObject({ p_error_code: 'parse' })
  })
})

describe('callVertexJson — kimlik freni', () => {
  it('bozuk servis hesabı JSON’unda ne SDK’ya ne DB’ye çıkılır', async () => {
    process.env.GCP_SERVICE_ACCOUNT_JSON = '{bozuk'

    expect(await cagir()).toBeNull()
    expect(generateContent).not.toHaveBeenCalled()
    expect(rpcCagrilari).toHaveLength(0)
  })
})
