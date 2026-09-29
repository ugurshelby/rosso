import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithRetry, RateLimitedError } from './fetch-retry'
import { ZAMAN_ASIMI_YAZMA } from '@/lib/fetch/zaman-asimi'

/**
 * `fetchWithRetry` taşıma motorunun tek dış kapısı — 13 dosya kullanıyor —
 * ama 2026-08-20 refine turuna kadar **testi yoktu**. Sözleşmesi ise
 * incelikli: 429'da `Retry-After`'a saygı, 5xx'te üstel geri çekilme,
 * 4xx'te retry YOK, ve (bu turda eklenen) zaman aşımı.
 */

function yanit(status: number, headers: Record<string, string> = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => headers[k] ?? null },
  } as unknown as Response
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Sahte zamanlayıcıyla bekleme içeren promise'i sonuna kadar koştur. */
async function kostur<T>(p: Promise<T>): Promise<T> {
  const bitti = p.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e }))
  await vi.runAllTimersAsync()
  const r = await bitti
  if (r.ok) return r.v
  throw r.e
}

describe('fetchWithRetry — zaman aşımı (2026-08-20)', () => {
  it('çağıran signal vermediyse VARSAYILAN zaman aşımını uygular', async () => {
    const sahte = vi.fn().mockResolvedValue(yanit(200))
    vi.stubGlobal('fetch', sahte)

    await kostur(fetchWithRetry('https://ornek/api'))

    const init = sahte.mock.calls[0][1]
    expect(init.signal, 'signal hiç verilmemiş — zaman aşımı yok').toBeDefined()
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('🔴 çağıranın signal’i zaman aşımını YUTMAZ — ikisi birleşir', async () => {
    /*
     * İlk yazımda `init?.signal ?? AbortSignal.timeout(...)` idi: çağıran
     * kendi signal'ini verdiğinde zaman aşımı sessizce kayboluyordu.
     * Bugün hiçbir çağıran signal vermiyor (ölçüldü) ama biri iptal
     * desteği eklediği gün korumayı da farkında olmadan kaldıracaktı.
     */
    const ac = new AbortController()
    const sahte = vi.fn().mockResolvedValue(yanit(200))
    vi.stubGlobal('fetch', sahte)

    await kostur(fetchWithRetry('https://ornek/api', { signal: ac.signal }))

    const gonderilen = sahte.mock.calls[0][1].signal
    expect(gonderilen).toBeInstanceOf(AbortSignal)
    // Birleşik signal, çağıranınkinin AYNISI olmamalı — olsaydı zaman
    // aşımı kaybolmuş olurdu.
    expect(gonderilen).not.toBe(ac.signal)
  })

  it('çağıran iptal ederse birleşik signal de iptal olur', async () => {
    const ac = new AbortController()
    let yakalanan: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_u: string, i: RequestInit) => {
      yakalanan = i.signal as AbortSignal
      return Promise.resolve(yanit(200))
    }))

    await kostur(fetchWithRetry('https://ornek/api', { signal: ac.signal }))
    expect(yakalanan?.aborted).toBe(false)

    ac.abort()
    expect(yakalanan?.aborted, 'çağıranın iptali birleşik signale geçmiyor').toBe(true)
  })

  it('init içindeki diğer alanlar korunur', async () => {
    const sahte = vi.fn().mockResolvedValue(yanit(200))
    vi.stubGlobal('fetch', sahte)

    await kostur(
      fetchWithRetry('https://ornek/api', {
        method: 'PUT',
        headers: { Authorization: 'Bearer x' },
      }),
    )

    const init = sahte.mock.calls[0][1]
    expect(init.method).toBe('PUT')
    expect(init.headers).toEqual({ Authorization: 'Bearer x' })
  })

  it('zaman aşımı YENİDEN DENENMEZ — yazma isteğinde çift kayıt riski', async () => {
    // TimeoutError döngüden çıkmalı; 429/5xx gibi tekrarlanmamalı.
    const hata = Object.assign(new Error('timeout'), { name: 'TimeoutError' })
    const sahte = vi.fn().mockRejectedValue(hata)
    vi.stubGlobal('fetch', sahte)

    await expect(kostur(fetchWithRetry('https://ornek/api'))).rejects.toThrow()
    expect(sahte, 'zaman aşımı tekrarlandı — çift kayıt riski').toHaveBeenCalledTimes(1)
  })

  it('varsayılan süre ortak sabitten gelir (dosyaya elle sayı yazılmamış)', () => {
    expect(ZAMAN_ASIMI_YAZMA).toBeGreaterThan(0)
  })
})

describe('fetchWithRetry — mevcut sözleşme korunuyor', () => {
  it('başarılı yanıtta tek istek atar', async () => {
    const sahte = vi.fn().mockResolvedValue(yanit(200))
    vi.stubGlobal('fetch', sahte)

    const res = await kostur(fetchWithRetry('https://ornek/api'))

    expect(res.status).toBe(200)
    expect(sahte).toHaveBeenCalledTimes(1)
  })

  it('4xx (429 hariç) YENİDEN DENENMEZ — yanıt olduğu gibi döner', async () => {
    const sahte = vi.fn().mockResolvedValue(yanit(404))
    vi.stubGlobal('fetch', sahte)

    const res = await kostur(fetchWithRetry('https://ornek/api'))

    expect(res.status).toBe(404)
    expect(sahte).toHaveBeenCalledTimes(1)
  })

  it('5xx üstel geri çekilmeyle yeniden denenir', async () => {
    const sahte = vi
      .fn()
      .mockResolvedValueOnce(yanit(500))
      .mockResolvedValueOnce(yanit(500))
      .mockResolvedValueOnce(yanit(200))
    vi.stubGlobal('fetch', sahte)

    const res = await kostur(fetchWithRetry('https://ornek/api'))

    expect(res.status).toBe(200)
    expect(sahte).toHaveBeenCalledTimes(3)
  })

  it('🔴 aşırı Retry-After beklenmeden RateLimitedError fırlatır', async () => {
    // Kullanıcıyı 20 dakika dönen spinner karşısında bırakmamak için.
    const sahte = vi.fn().mockResolvedValue(yanit(429, { 'Retry-After': '900' }))
    vi.stubGlobal('fetch', sahte)

    await expect(kostur(fetchWithRetry('https://ornek/api'))).rejects.toBeInstanceOf(
      RateLimitedError,
    )
    expect(sahte, 'cap aşıldığında beklemeden çıkmalı').toHaveBeenCalledTimes(1)
  })

  it('makul Retry-After’a saygı gösterir ve yeniden dener', async () => {
    const sahte = vi
      .fn()
      .mockResolvedValueOnce(yanit(429, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(yanit(200))
    vi.stubGlobal('fetch', sahte)

    const res = await kostur(fetchWithRetry('https://ornek/api'))

    expect(res.status).toBe(200)
    expect(sahte).toHaveBeenCalledTimes(2)
  })
})
