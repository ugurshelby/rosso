/**
 * Edge + Node uyumlu rate limit çekirdeği.
 * Middleware ve route handler'lar bu modülü kullanır; `server-only` yok.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

interface WindowState {
  count: number
  resetAt: number
}

const buckets = new Map<string, WindowState>()

let _callsSinceSweep = 0
const _SWEEP_EVERY = 500

function _sweepExpired(now: number): void {
  for (const [key, state] of buckets) {
    if (now >= state.resetAt) buckets.delete(key)
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (++_callsSinceSweep >= _SWEEP_EVERY) {
    _callsSinceSweep = 0
    _sweepExpired(now)
  }

  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  existing.count += 1
  const allowed = existing.count <= limit
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  }
}

export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

export function _clearAllRateLimits(): void {
  buckets.clear()
  _callsSinceSweep = 0
}

export function backoffDelayMs(
  attempt: number,
  retryAfterSeconds?: number | null,
  baseMs = 1000,
  maxMs = 60_000,
): number {
  if (retryAfterSeconds != null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, maxMs)
  }
  const safeAttempt = Math.max(0, attempt)
  const delay = baseMs * 2 ** safeAttempt
  return Math.min(delay, maxMs)
}

/** Login brute-force: 5 başarısız deneme / 15 dk (e-posta). */
export const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 } as const

/** Auth API kaba IP koruması — middleware katmanı. */
export const AUTH_API_IP_LIMIT = { limit: 30, windowMs: 60 * 1000 } as const

/** OAuth/callback code exchange — IP bazlı. */
export const AUTH_CALLBACK_IP_LIMIT = { limit: 20, windowMs: 60 * 1000 } as const

/**
 * PAHALI ÜRETİM işlemleri — Spotify'a yazan / uzun süren uçlar.
 *
 * 2026-08-22 güvenlik taraması: `/playlists/generate`, `/mood/create-playlist`
 * ve `/export/queue` gibi uçlar kimlik istiyordu ama LİMİTSİZDİ. Kötü niyet
 * gerekmiyor — döngüye giren bir istemci ya da sabırsız çift tıklama, dış
 * API kotasını yakabilir. Rosso bunu bir kez yaşadı: Spotify **6,4 saat**
 * ceza verdi (bkz. ogrenilen-dersler).
 *
 * 5/dakika: normal kullanıcı bir listeyi dakikada 5 kez üretmez; kaza ve
 * kötüye kullanım ikisi de bu eşikte durur.
 */
export const PAHALI_URETIM_LIMIT = { limit: 5, windowMs: 60 * 1000 } as const

export function rateLimitRetryAfterSeconds(resetAt: number, now: number = Date.now()): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000))
}
