import 'server-only'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { spotifyKimlikDurumu } from '@/lib/auth/spotify-kimlik'
import type { DashboardAlert } from './dashboard-alerts.types'
import { cache } from 'react'

export type { DashboardAlert } from './dashboard-alerts.types'

const SPOTIFY_PROVIDER = 'spotify'
/** Worker/cron aralığından uzun gecikme — banner adayı eşiği. */
const SYNC_STALE_HOURS = 6

async function getSpotifyCooldownRemaining(): Promise<number> {
  const service = await createServiceClient()
  const { data, error } = await service.rpc('cooldown_get', { p_provider: SPOTIFY_PROVIDER })
  if (error || !data) return 0

  const row = (data as Array<{ blocked_until: string | null }>)[0]
  if (!row?.blocked_until) return 0

  return Math.max(0, Math.round((new Date(row.blocked_until).getTime() - Date.now()) / 1000))
}

async function getSyncDelayHours(userId: string): Promise<number | null> {
  const supabase = await createClient()
  const { data: conn } = await supabase
    .from('platform_connections')
    .select('last_recently_played_sync_at')
    .eq('user_id', userId)
    .eq('platform', SPOTIFY_PROVIDER)
    .eq('is_active', true)
    .maybeSingle()

  if (!conn) return null

  const lastSync = conn.last_recently_played_sync_at
  if (!lastSync) return SYNC_STALE_HOURS

  const ageMs = Date.now() - new Date(lastSync).getTime()
  const staleMs = SYNC_STALE_HOURS * 60 * 60 * 1000
  if (ageMs <= staleMs) return null

  return Math.floor(ageMs / (60 * 60 * 1000))
}

/**
 * Dashboard banner adayları — cooldown öncelikli, tek mesaj.
 *
 * ─── Sıralama neden böyle ───────────────────────────────────────────────
 * 1. **Cooldown** — Rosso'nun kendi yaptığı bir hata (rate limit cezası).
 *    Kullanıcı ne yaparsa yapsın veri gelmez; her şeyin üstünde.
 * 2. **Veri izni eksik** — kullanıcının atabileceği TEK adım var ve
 *    dashboard'ı boş gösteren şey bu. Gecikme uyarısından önce gelir:
 *    hiç bağlantısı olmayan birine "veriler biraz geride" demek yanıltıcı
 *    olur (geride değil, hiç yok).
 * 3. **Senkron gecikmesi** — veri var, sadece tazeliği düşük.
 */
export const getDashboardAlerts = cache(async (userId: string): Promise<DashboardAlert[]> => {
  const remaining = await getSpotifyCooldownRemaining()
  if (remaining > 0) {
    return [{ kind: 'spotify_cooldown', remainingSeconds: remaining }]
  }

  const kimlik = await spotifyKimlikDurumu(userId)
  if (kimlik.veriBaglantisiEksik) {
    return [{ kind: 'spotify_veri_izni_gerekli' }]
  }

  const hours = await getSyncDelayHours(userId)
  if (hours != null) {
    return [{ kind: 'sync_delay', hoursSinceSync: hours }]
  }

  return []
})
