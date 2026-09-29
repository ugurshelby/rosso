/**
 * 429/5xx dayanıklı fetch — taşıma motoru için (NotebookLM raporu §2).
 *
 * ── Neden gerekli (canlı denetim, 2026-07-12) ──
 * `engine.ts` Spotify'a **çıplak `fetch`** atıyordu: 429 (rate limit) geldiğinde
 * kod bunu sıradan bir başarısızlık sayıp devam ediyordu. Sonuç:
 *   1. Şarkı SESSİZCE kayboluyor ("bulunamadı" diye işaretleniyor — ama bulundu,
 *      sadece hız sınırına takıldık). Kullanıcı yanlış bilgilendiriliyor.
 *   2. Spotify'a `Retry-After` başlığına RAĞMEN istek atmaya devam ediyoruz.
 *
 * Rapor bunu açıkça uyarıyor: *"Failure to respect this window will lead to the
 * application being banned."* Bir playlist taşıması 50-100 istek atabilir —
 * risk teorik değil.
 *
 * Worker (Python) tarafında bu koruma zaten VARDI (`spotify_lookup._with_retry`).
 * TypeScript tarafı unutulmuştu. Bu modül o boşluğu kapatır.
 */
import { ZAMAN_ASIMI_YAZMA } from '@/lib/fetch/zaman-asimi'

/** Retry-After üst sınırı (ms). Spotify absürt değerler döndürebiliyor. */
const MAX_RETRY_AFTER_MS = 60_000

/** Sunucu hatalarında taban gecikme (üstel artar). */
const BASE_DELAY_MS = 500

const MAX_ATTEMPTS = 3

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`Spotify rate limit: ${Math.round(retryAfterMs / 1000)}s bekleme istendi`)
    this.name = 'RateLimitedError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** `Retry-After` saniye cinsindendir (Spotify). Yoksa taban gecikmeye düş. */
function retryAfterMs(res: Response, fallbackMs: number): number {
  const h = res.headers.get('Retry-After')
  if (!h) return fallbackMs
  const secs = Number(h)
  if (!Number.isFinite(secs) || secs < 0) return fallbackMs
  return secs * 1000
}

/**
 * 429 ve 5xx için üstel geri çekilmeli fetch.
 *
 * - **429**: `Retry-After` başlığına SAYGI GÖSTERİR (rapor: aksi hâlde ban).
 *   Talep edilen bekleme `MAX_RETRY_AFTER_MS`'i aşarsa beklemez — `RateLimitedError`
 *   fırlatır. Çağıran bunu yakalayıp taşımayı DÜRÜSTÇE durdurabilir; kullanıcıyı
 *   dakikalarca bekletmek ya da şarkıyı "bulunamadı" diye yalanlamak yerine.
 * - **5xx**: üstel geri çekilme (500ms → 1s → 2s).
 * - **4xx (429 hariç)**: retry ANLAMSIZ — yanıt olduğu gibi döner.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  maxAttempts = MAX_ATTEMPTS,
  timeoutMs = ZAMAN_ASIMI_YAZMA,
): Promise<Response> {
  let delay = BASE_DELAY_MS
  let last: Response | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    /*
     * Zaman aşımı HER DENEMEDE ayrı uygulanır (2026-08-20 refine).
     *
     * ⚠ `??` DEĞİL, `AbortSignal.any` (aynı turda kendi kodumu gözden
     * geçirirken düzeltildi): ilk yazımda çağıran kendi `signal`ini
     * verdiğinde zaman aşımı SESSİZCE kayboluyordu. Bugün hiçbir çağıran
     * `signal` vermiyor, yani kırık değildi — ama biri iptal desteği
     * eklediği gün korumayı da farkında olmadan kaldıracaktı.
     * `any` ikisini birleştirir: hangisi önce tetiklenirse istek iptal olur.
     *
     * ⚠ Zaman aşımı YENİDEN DENENMEZ: `AbortSignal.timeout` `TimeoutError`
     * fırlatır ve bu döngüden çıkar. Bilinçli — yazma isteğinde zaman aşımı
     * "sunucuda olmadı" demek DEĞİLDİR; yeniden denemek çift kayıt üretir.
     * 429/5xx retry'ı bundan farklı: orada sunucu isteği REDDETTİĞİNİ
     * açıkça söylüyor.
     */
    const zamanAsimi = AbortSignal.timeout(timeoutMs)
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, zamanAsimi]) : zamanAsimi,
    })

    if (res.status === 429) {
      const waitMs = retryAfterMs(res, delay)
      // Cap'i aşan bekleme: kota gerçekten bitmiş. Beklemek yerine dürüstçe
      // yukarı bildir — kullanıcı 20 dakika dönen bir spinner görmesin.
      if (waitMs > MAX_RETRY_AFTER_MS) throw new RateLimitedError(waitMs)
      if (attempt === maxAttempts) throw new RateLimitedError(waitMs)
      await sleep(waitMs)
      continue
    }

    if (res.status >= 500) {
      last = res
      if (attempt === maxAttempts) return res
      await sleep(delay)
      delay *= 2
      continue
    }

    // 2xx veya 4xx (429 dışı) → retry anlamsız, olduğu gibi döndür.
    return res
  }

  return last ?? new Response(null, { status: 500 })
}
