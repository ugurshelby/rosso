import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { z } from 'zod'
import { ApiError } from '@google/genai'

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn(async () => undefined) }))

import { YENIDEN_DENEME, geminiJsonSemasi, hataKodu, vertexYapilandirmasi } from './vertex-core'

// ---------------------------------------------------------------------------
// vertex-core saf parçaları: yapılandırma doğrulaması, hata sınıflandırması,
// şema dönüşümü, yeniden deneme politikası.
//
// Yapılandırma testleri bir GÜVENLİK sözleşmesidir: bozuk/eksik credential
// AI'ı sessizce KAPATMALI (sistem deterministik yolla devam eder), ve servis
// hesabının TÜM alanları SDK'ya olduğu gibi gitmeli (token_uri vb. atılırsa
// kimlik doğrulama canlıda patlar, testte değil).
// ---------------------------------------------------------------------------

// Kapanış tarihi (ai-kapanis.ts) yapılandırma sözleşmesini zamana bağımlı yapmasın.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
})
afterAll(() => vi.useRealTimers())

const GECERLI_SA = {
  type: 'service_account',
  project_id: 'p',
  client_email: 'sa@p.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
  token_uri: 'https://oauth2.googleapis.com/token',
  client_id: '123',
}

describe('vertexYapilandirmasi', () => {
  it('proje yoksa null (AI kapalı)', () => {
    expect(vertexYapilandirmasi({ GOOGLE_APPLICATION_CREDENTIALS: './k.json' })).toBeNull()
  })

  it('kimlik yoksa null', () => {
    expect(vertexYapilandirmasi({ GCP_PROJECT_ID: 'p' })).toBeNull()
  })

  it('konum verilmezse Google’ın önerdiği global endpoint', () => {
    expect(vertexYapilandirmasi({ GCP_PROJECT_ID: 'p', GOOGLE_APPLICATION_CREDENTIALS: './k.json' })?.location).toBe('global')
  })

  it('verilen konuma saygı duyar', () => {
    const y = vertexYapilandirmasi({ GCP_PROJECT_ID: 'p', GCP_LOCATION: 'us-central1', GOOGLE_APPLICATION_CREDENTIALS: './k.json' })
    expect(y?.location).toBe('us-central1')
    expect(y?.kimlikKaynagi).toBe('adc')
  })

  it('bozuk JSON’da null döner (ve fırlatmaz)', () => {
    expect(vertexYapilandirmasi({ GCP_PROJECT_ID: 'p', GCP_SERVICE_ACCOUNT_JSON: '{bozuk' })).toBeNull()
  })

  it('private_key eksik servis hesabında null döner', () => {
    const { private_key: _pk, ...eksik } = GECERLI_SA
    void _pk
    expect(vertexYapilandirmasi({ GCP_PROJECT_ID: 'p', GCP_SERVICE_ACCOUNT_JSON: JSON.stringify(eksik) })).toBeNull()
  })

  it('servis hesabı olmayan bir JSON’u reddeder', () => {
    const baska = { ...GECERLI_SA, type: 'authorized_user' }
    expect(vertexYapilandirmasi({ GCP_PROJECT_ID: 'p', GCP_SERVICE_ACCOUNT_JSON: JSON.stringify(baska) })).toBeNull()
  })

  it('geçerli servis hesabının TÜM alanlarını SDK’ya aktarır', () => {
    const y = vertexYapilandirmasi({ GCP_PROJECT_ID: 'p', GCP_SERVICE_ACCOUNT_JSON: JSON.stringify(GECERLI_SA) })
    expect(y?.kimlikKaynagi).toBe('env-json')
    expect(y?.googleAuthOptions.credentials).toEqual(GECERLI_SA)
  })

  it('env JSON, dosya yolundan önceliklidir (canlı yol)', () => {
    const y = vertexYapilandirmasi({
      GCP_PROJECT_ID: 'p',
      GCP_SERVICE_ACCOUNT_JSON: JSON.stringify(GECERLI_SA),
      GOOGLE_APPLICATION_CREDENTIALS: './k.json',
    })
    expect(y?.kimlikKaynagi).toBe('env-json')
  })
})

describe('hataKodu', () => {
  it('SDK ApiError’dan HTTP durum kodunu alır (regex değil)', () => {
    expect(hataKodu(new ApiError({ message: 'Resource exhausted', status: 429 }))).toBe('429')
    expect(hataKodu(new ApiError({ message: 'Unavailable', status: 503 }))).toBe('503')
  })

  it('iptal/zaman aşımını ayırt eder', () => {
    expect(hataKodu(new DOMException('zaman doldu', 'TimeoutError'))).toBe('timeout')
    expect(hataKodu(new DOMException('iptal', 'AbortError'))).toBe('timeout')
  })

  it('bilinmeyeni “unknown” olarak işaretler', () => {
    expect(hataKodu(new Error('x'))).toBe('unknown')
    expect(hataKodu('dize')).toBe('unknown')
  })
})

describe('geminiJsonSemasi', () => {
  const Sema = z.object({ selectedIndices: z.array(z.int().min(0)).min(1) })

  it('zod şemasını JSON Schema’ya çevirir ve $schema meta anahtarını atar', () => {
    const json = geminiJsonSemasi(Sema)
    expect(json.$schema).toBeUndefined()
    expect(json.type).toBe('object')
    expect(json.required).toEqual(['selectedIndices'])
  })

  it('aynı şema için aynı nesneyi döndürür (bir kez hesaplanır)', () => {
    expect(geminiJsonSemasi(Sema)).toBe(geminiJsonSemasi(Sema))
  })

  it('modele yalnız YAPI + ENUM + zorunluluk gider; uzunluk/adet/aralık sınırları gitmez', () => {
    // Vertex 400 "too many states" ölçümünün regresyon testi.
    const Karmasik = z.object({
      items: z.array(z.object({
        i: z.int().min(0),
        ad: z.string().min(1).max(80),
        etiketler: z.array(z.string().max(60)).max(8),
        enerji: z.enum(['low', 'high']),
      })).min(1).max(40),
    })
    const metin = JSON.stringify(geminiJsonSemasi(Karmasik))
    for (const yasak of ['maxLength', 'maxItems', 'maximum', '$schema']) expect(metin).not.toContain(yasak)
    for (const kalan of ['enum', 'required', 'minItems', 'minimum']) expect(metin).toContain(kalan)
  })
})

describe('YENIDEN_DENEME politikası', () => {
  it('Google’ın önerdiği geçici hataları kapsar: 429 ve 503 dahil', () => {
    expect(YENIDEN_DENEME.httpStatusCodes).toEqual(expect.arrayContaining([429, 503]))
  })

  it('istemci hatalarını (400/401/403/404) yeniden DENEMEZ', () => {
    for (const kod of [400, 401, 403, 404]) expect(YENIDEN_DENEME.httpStatusCodes).not.toContain(kod)
  })

  it('sınırlı: en fazla 3 deneme, kısa üst gecikme (süre bütçesi bozulmasın)', () => {
    expect(YENIDEN_DENEME.attempts).toBe(3)
    expect(YENIDEN_DENEME.maxDelay).toBeLessThanOrEqual(3)
    expect(YENIDEN_DENEME.jitter).toBeGreaterThan(0)
  })
})
