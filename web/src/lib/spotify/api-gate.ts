import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Merkezî API geçidi — Spotify'a giden HER istek buradan geçer.
 *
 * `worker/app/services/api_gate.py` + `worker/app/services/cooldown.py`'nin
 * TypeScript portu (01-yillik-kontrolsuz-calisma-plani.md devamı, 2026-09-16
 * — `playlist_refresh`'i GitHub Actions/Python'dan TS'e taşıma kararı).
 *
 * Sahip (2026-08-05): "Hiç ceza yemeyeceğiz çünkü sistem her zaman
 * hiyerarşiye uygun, limitten haberdar ve limit sınırına uygun çalışacak."
 *
 * NEDEN BU MODÜL — canlı deneyle ölçüldü (2026-08-05, worker/app/services/api_gate.py):
 * Spotify kalan kotayı hiç söylemiyor. Sınır HIZ değil HACİM — 4 istek/sn
 * sabit hızda 398 istekte 429 geldi, ceza 23,86 SAAT sürdü. Bu modülün varlık
 * sebebi: "429 gelince dur" yetmez, 429'a hiç varmamak gerekir.
 *
 * İki ayrı kapı: cooldown ("ceza var mı?", 429 SONRASI) + bütçe ("hakkımız
 * kaldı mı?", 429 ÖNCESİ — asıl koruma). Her ikisi de mevcut SQL RPC'lerini
 * kullanır (`budget_check_and_consume`, `cooldown_get`, `cooldown_set`) —
 * Python ve TS tarafı AYNI veritabanı durumunu paylaşır.
 */

export const SCOPE_CATALOG = 'spotify:catalog'
export const SCOPE_SEARCH = 'spotify:search'
export const SCOPE_USER = 'spotify:user'

/** Sayı küçüldükçe öncelik artar. */
export const PRIORITY_CRITICAL = 1
export const PRIORITY_HIGH = 2
export const PRIORITY_NORMAL = 3
export const PRIORITY_LOW = 4

/** Bir kat, bütçenin bu oranından azı kaldığında durur (CRITICAL hep çalışır). */
const MIN_REMAINING_RATIO: Record<number, number> = {
  [PRIORITY_CRITICAL]: 0.0,
  [PRIORITY_HIGH]: 0.1,
  [PRIORITY_NORMAL]: 0.25,
  [PRIORITY_LOW]: 0.6,
}

const MAX_COOLDOWN_S = 21600 // 6 saat — Retry-After ne derse desin üst sınır
const PACE_GAP_MS = 250 // ölçüm hızın sınır olmadığını gösterdi ama ucuz bir sigorta

export interface GateDecision {
  allowed: boolean
  reason: 'ok' | 'blocked' | 'budget' | 'priority'
  remaining: number
  used: number
  budget: number
  blockedSeconds: number
}

function providerOf(scope: string): string {
  return scope.split(':', 1)[0]
}

/** provider için aktif cooldown var mı? */
export async function isBlocked(provider: string): Promise<{ blocked: boolean; remainingSeconds: number }> {
  const supabase = await createServiceClient()
  try {
    const { data } = await supabase.rpc('cooldown_get', { p_provider: provider })
    const row = Array.isArray(data) ? data[0] : null
    const blockedUntilRaw = row?.blocked_until as string | undefined
    if (!blockedUntilRaw) return { blocked: false, remainingSeconds: 0 }

    const blockedUntil = new Date(blockedUntilRaw).getTime()
    const now = Date.now()
    if (blockedUntil <= now) return { blocked: false, remainingSeconds: 0 }

    return { blocked: true, remainingSeconds: Math.floor((blockedUntil - now) / 1000) }
  } catch {
    return { blocked: false, remainingSeconds: 0 }
  }
}

/** provider'a cooldown damgası vur. Retry-After cap'lenir; kullanılan saniyeyi döndürür. */
export async function setCooldown(
  provider: string,
  retryAfterS: number | null,
  reason: string,
): Promise<number> {
  const supabase = await createServiceClient()
  const requested = Math.max(Math.floor(retryAfterS ?? 3600), 0)
  const used = Math.min(requested, MAX_COOLDOWN_S)
  const blockedUntil = new Date(Date.now() + used * 1000).toISOString()
  try {
    await supabase.rpc('cooldown_set', {
      p_provider: provider,
      p_blocked_until: blockedUntil,
      p_reason: reason,
    })
  } catch {
    // cooldown_set başarısızsa sonraki tur yine deneyecek — sessiz geçilir.
  }
  return used
}

/**
 * İstek atmadan ÖNCE sor: geçebilir miyim?
 * `allowed=true` dönerse bütçe ZATEN TÜKETİLMİŞTİR — istek atılmazsa
 * `refund()` çağrılmalı.
 */
export async function checkGate(
  scope: string,
  options: { count?: number; priority?: number } = {},
): Promise<GateDecision> {
  const count = options.count ?? 1
  const priority = options.priority ?? PRIORITY_NORMAL
  const provider = providerOf(scope)

  const { blocked, remainingSeconds } = await isBlocked(provider)
  if (blocked) {
    return { allowed: false, reason: 'blocked', remaining: 0, used: 0, budget: 0, blockedSeconds: remainingSeconds }
  }

  const supabase = await createServiceClient()
  let row: { allowed?: boolean; remaining?: number; used?: number; budget?: number } | null = null
  try {
    const { data } = await supabase.rpc('budget_check_and_consume', {
      p_scope: scope,
      p_count: count,
    })
    row = Array.isArray(data) ? data[0] : null
  } catch {
    // Sayaç okunamıyorsa İSTEK ATMA — kapalı taraf güvenli.
    return { allowed: false, reason: 'budget', remaining: 0, used: 0, budget: 0, blockedSeconds: 0 }
  }

  if (!row) {
    return { allowed: false, reason: 'budget', remaining: 0, used: 0, budget: 0, blockedSeconds: 0 }
  }

  const allowed = Boolean(row.allowed)
  const remaining = row.remaining ?? 0
  const used = row.used ?? 0
  const budget = row.budget ?? 0

  if (!allowed) {
    return { allowed: false, reason: 'budget', remaining, used, budget, blockedSeconds: 0 }
  }

  const minRatio = MIN_REMAINING_RATIO[priority] ?? 0.25
  if (budget > 0 && remaining / budget < minRatio) {
    await refund(scope, count)
    return { allowed: false, reason: 'priority', remaining, used, budget, blockedSeconds: 0 }
  }

  return { allowed: true, reason: 'ok', remaining, used, budget, blockedSeconds: 0 }
}

/** Ayrılan bütçeyi geri ver — istek ATILMADIYSA çağrılır. */
export async function refund(scope: string, count = 1): Promise<void> {
  const supabase = await createServiceClient()
  try {
    await supabase.rpc('budget_check_and_consume', { p_scope: scope, p_count: -count })
  } catch {
    // İade başarısızsa sayaç fazla gösterir — pencere dolunca düzelir.
  }
}

/** 429 yendi — cezayı DB'ye yaz VE bütçeyi tüketilmiş say. */
export async function record429(scope: string, retryAfterS: number | null, reason: string): Promise<number> {
  const provider = providerOf(scope)
  const usedS = await setCooldown(provider, retryAfterS, reason)
  const supabase = await createServiceClient()
  try {
    // Bütçeyi tavana çek: bu pencerede daha fazla denemeyelim.
    await supabase.rpc('budget_check_and_consume', { p_scope: scope, p_count: 10_000 })
  } catch {
    // Sessiz geçilir.
  }
  return usedS
}

let lastRequestAt = 0

/** 250ms geçitli fetch — bu modüldeki tüm Spotify çağrılarının tek geçidi. */
export async function pacedFetch(url: string, init?: RequestInit): Promise<Response> {
  const wait = lastRequestAt + PACE_GAP_MS - Date.now()
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
  lastRequestAt = Date.now()
  return fetch(url, init)
}
