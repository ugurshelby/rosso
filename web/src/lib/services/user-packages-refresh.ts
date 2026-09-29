import 'server-only'

import { createServiceClient, createClient } from '@/lib/supabase/server'

interface PackageRefreshResult {
  ok: boolean
  refreshed: string[]
  errors: Array<{ rpc: string; message: string }>
}

// Kullanıcı başına aşırı RPC çağrısını önlemek için bellek içi debounce (5 dakika)
const _lastRefreshMap = new Map<string, number>()
const REFRESH_DEBOUNCE_MS = 5 * 60 * 1000

/**
 * Kullanıcının ana veri paketlerini (Dashboard istatistikleri, saatlik örüntü, dönem özetleri,
 * zevk paketi ve son dinlenenler şeridi) veritabanı RPC'lerini doğrudan çağırarak günceller.
 *
 * Harici worker veya zamanlanmış cron servisleri uyusa dahi,
 * sistemin Next.js içinden kendi kendini besleyip (self-healing) daima taze kalmasını sağlar.
 */
export async function refreshUserCorePackages(
  userId: string,
  options: { force?: boolean } = {},
): Promise<PackageRefreshResult> {
  const now = Date.now()
  const lastRun = _lastRefreshMap.get(userId) ?? 0

  if (!options.force && now - lastRun < REFRESH_DEBOUNCE_MS) {
    return { ok: true, refreshed: ['skipped_debounced'], errors: [] }
  }

  _lastRefreshMap.set(userId, now)

  let supabase: Awaited<ReturnType<typeof createClient>> | Awaited<ReturnType<typeof createServiceClient>>
  try {
    if (typeof createServiceClient === 'function') {
      supabase = await createServiceClient()
    } else {
      supabase = await createClient()
    }
  } catch {
    supabase = await createClient()
  }
  const refreshed: string[] = []
  const errors: Array<{ rpc: string; message: string }> = []

  // 1. Çekirdek paket RPC'leri (hepsi 200-500ms arasında tamamlanır)
  const coreRpcs: Array<{ name: string; params: Record<string, unknown> }> = [
    { name: 'build_user_stats_pkg', params: { p_user_id: userId } },
    { name: 'build_user_pattern_pkg', params: { p_user_id: userId } },
    { name: 'build_user_period_pkg', params: { p_user_id: userId } },
    { name: 'build_user_taste_pkg', params: { p_user_id: userId } },
    { name: 'materialize_user_top_strips', params: { p_user_id: userId, p_limit: 20 } },
  ]

  for (const item of coreRpcs) {
    try {
      // supabase.rpc method requires this context, do not unbind
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc(item.name, item.params)
      if (error) {
        errors.push({ rpc: item.name, message: error.message })
        console.warn(`[package-refresh] ${item.name} hatası:`, error.message)
      } else {
        refreshed.push(item.name)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push({ rpc: item.name, message: msg })
      console.warn(`[package-refresh] ${item.name} istisnası:`, msg)
    }
  }

  // 2. Taste Profile kontrolü: Son 7 gün içinde güncellenmemişse refresh_user_taste çalıştır
  try {
    const { data: taste } = await supabase
      .from('user_taste_profile')
      .select('updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    const lastTasteUpdated = taste?.updated_at ? new Date(taste.updated_at).getTime() : 0
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    if (options.force || lastTasteUpdated < sevenDaysAgo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: tasteErr } = await (supabase as any).rpc('refresh_user_taste', { p_user_id: userId })
      if (tasteErr) {
        errors.push({ rpc: 'refresh_user_taste', message: tasteErr.message })
        console.warn('[package-refresh] refresh_user_taste hatası:', tasteErr.message)
      } else {
        refreshed.push('refresh_user_taste')
      }
    }
  } catch (err) {
    console.warn('[package-refresh] taste profile kontrol hatası:', err)
  }

  return {
    ok: errors.length === 0,
    refreshed,
    errors,
  }
}
