import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { refreshUserCorePackages } from '@/lib/services/user-packages-refresh'
import { resolveOrCreateTrackByIdentity } from '@/lib/catalog/resolve-track'
import { after } from 'next/server'

export interface SyncRecentlyPlayedResult {
  outcome: 'success' | 'no_token' | 'rate_limited' | 'error' | 'skipped_debounced'
  eventsWritten: number
  latestPlayedAt: string | null
  error?: string
}

// Son tetiklenme zamanlarını bellek içi sakla (kullanıcı başına 60 sn debounce)
const _lastSyncMap = new Map<string, number>()
const SYNC_DEBOUNCE_MS = 60 * 1000

interface SpotifyTrackObject {
  id: string
  name: string
  duration_ms?: number
  artists?: Array<{ name: string }>
  album?: {
    name?: string
    images?: Array<{ url: string }>
  }
  external_ids?: { isrc?: string }
}

interface SpotifyPlayHistoryObject {
  track: SpotifyTrackObject
  played_at: string
}

interface SpotifyRecentlyPlayedResponse {
  items?: SpotifyPlayHistoryObject[]
}

async function resolveOrCreateTrack(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  track: SpotifyTrackObject,
): Promise<string | null> {
  if (!track.id || !track.name) return null

  return resolveOrCreateTrackByIdentity(supabase, {
    spotifyId: track.id,
    isrc: track.external_ids?.isrc ?? null,
    title: track.name,
    artists: track.artists?.map((a) => a.name).filter(Boolean) ?? [],
    durationMs: track.duration_ms ?? 0,
    imageUrl: track.album?.images?.[0]?.url ?? null,
    album: track.album?.name ?? null,
  })
}

/**
 * Kullanıcının Spotify son dinlenenler verisini doğrudan çeker ve veritabanına yazar.
 * Ayrı bir worker'a bağımlı olmadan, Next.js üzerinden kendi kendini onaran (self-healing)
 * kesintisiz senkronizasyon sağlar.
 */
export async function syncRecentlyPlayed(
  userId: string,
  options: { force?: boolean } = {},
): Promise<SyncRecentlyPlayedResult> {
  const now = Date.now()
  const lastSync = _lastSyncMap.get(userId) ?? 0

  if (!options.force && now - lastSync < SYNC_DEBOUNCE_MS) {
    return { outcome: 'skipped_debounced', eventsWritten: 0, latestPlayedAt: null }
  }

  _lastSyncMap.set(userId, now)

  try {
    // 0. Test hesabı / sentetik profil savunma hattı (guard)
    // Test profilleri test-fixtures'tan beslenir, Spotify hesabı yoktur.
    const supabase = await createServiceClient()
    if (supabase.auth?.admin?.getUserById) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        const u = authUser?.user
        if (
          u?.user_metadata?.is_test === true ||
          u?.email?.toLowerCase().endsWith('@rosso-test.local')
        ) {
          return { outcome: 'no_token', eventsWritten: 0, latestPlayedAt: null }
        }
      } catch {
        // Sessiz devam et
      }
    }

    // 0b. Spotify Dev Mode allowlist kalkanı (user-system.md ADIM 4).
    // `pending`/`rejected` kullanıcı için Spotify API'ye hiç gidilmez — hem
    // gereksiz istek hem de 429/kota riskini büyütür. `approved`/`active`
    // dışındaki her durum (kayıt yoksa dahil, henüz ilk bağlantı denenmemiş
    // olabilir) API çağrısını atlar; kayıt `recordSpotifyAccess` ilk
    // bağlantıda zaten açılır.
    const { data: allowlistRow } = await supabase
      .from('spotify_allowlist_requests')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle()
    if (allowlistRow && allowlistRow.status !== 'approved' && allowlistRow.status !== 'active') {
      return { outcome: 'no_token', eventsWritten: 0, latestPlayedAt: null }
    }

    const accessToken = await ensureValidToken(userId, 'spotify')
    if (!accessToken) {
      return { outcome: 'no_token', eventsWritten: 0, latestPlayedAt: null }
    }

    const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (res.status === 429) {
      console.warn('[sync-recently-played] Spotify 429 rate limit alındı.')
      try {
        await supabase
          .from('platform_connections')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('platform', 'spotify')
      } catch {
        // DB update hatası sessizce yutulur
      }
      return { outcome: 'rate_limited', eventsWritten: 0, latestPlayedAt: null }
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[sync-recently-played] Spotify API hatası (${res.status}):`, errText)
      return {
        outcome: 'error',
        eventsWritten: 0,
        latestPlayedAt: null,
        error: `Spotify API error: ${res.status}`,
      }
    }

    const data = (await res.json()) as SpotifyRecentlyPlayedResponse
    const items = data.items ?? []
    if (items.length === 0) {
      await supabase
        .from('platform_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('platform', 'spotify')
      return { outcome: 'success', eventsWritten: 0, latestPlayedAt: null }
    }

    let eventsWritten = 0
    let latestPlayedAt: string | null = null

    for (const item of items) {
      const track = item.track
      if (!track) continue

      const playedAt = item.played_at
      if (!latestPlayedAt || playedAt > latestPlayedAt) {
        latestPlayedAt = playedAt
      }

      const trackId = await resolveOrCreateTrack(supabase, track)
      if (!trackId) continue

      // ZIP veya önceki akışla çakışmayı önlemek için +-5 saniye kontrolü
      const dt = new Date(playedAt)
      const lo = new Date(dt.getTime() - 5000).toISOString()
      const hi = new Date(dt.getTime() + 5000).toISOString()

      const { data: nearby } = await supabase
        .from('play_events')
        .select('id')
        .eq('user_id', userId)
        .eq('track_id', trackId)
        .gte('played_at', lo)
        .lte('played_at', hi)
        .limit(1)

      if (nearby && nearby.length > 0) {
        continue
      }

      // play_event kaydını yaz
      const { error: playErr } = await supabase
        .from('play_events')
        .upsert(
          {
            user_id: userId,
            track_id: trackId,
            played_at: playedAt,
            platform: 'spotify',
            source: 'api_realtime',
            ms_played: track.duration_ms ?? 0,
          },
          { onConflict: 'user_id,played_at,track_id' },
        )

      if (!playErr) {
        eventsWritten++
      }
    }

    // platform_connections damgasını güncelle: hem son kontrol (last_synced_at) hem de track cursor'ı (last_recently_played_sync_at)
    const nowIso = new Date().toISOString()
    const updatePayload: {
      last_synced_at: string
      last_recently_played_sync_at?: string
    } = {
      last_synced_at: nowIso,
    }
    if (latestPlayedAt) {
      updatePayload.last_recently_played_sync_at = latestPlayedAt
    }

    await supabase
      .from('platform_connections')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('platform', 'spotify')

    // Yeni şarkılar yazıldıysa çekirdek paketleri ve taste "Right now" şeridini arka planda tazele
    if (eventsWritten > 0) {
      after(async () => {
        try {
          await refreshUserCorePackages(userId)
        } catch (refreshErr) {
          console.warn('[sync-recently-played] refreshUserCorePackages hatası:', refreshErr)
        }
      })
    }

    return { outcome: 'success', eventsWritten, latestPlayedAt }
  } catch (err) {
    console.error('[sync-recently-played] Beklenmeyen hata:', err)
    return {
      outcome: 'error',
      eventsWritten: 0,
      latestPlayedAt: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Akıllı arka plan senkronizasyon tetikleyicisi (Faz 3 — Kota Kalkanı).
 *
 * Veritabanındaki `platform_connections` tablosunu kontrol eder.
 * Eğer kullanıcının son başarılı sync zamanı üzerinden `thresholdMs` (varsayılan 30-40 dk)
 * geçmişse (veya veri hiç yoksa), `syncRecentlyPlayed` fonksiyonunu tetikler.
 *
 * Kota Koruma:
 * Serverless ortamlarda bellek değişkenleri lambdalar arasında sıfırlanabilir.
 * DB zaman damgası sayesinde 5 kullanıcılı Developer Mode sınırlarında Spotify 429
 * kotasını aşmadan, kullanıcının son dinlemelerinin kaybolmamasını sağlar.
 *
 * Çağrı yeri: `src/app/(dashboard)/layout.tsx` içinde `void triggerSmartSyncIfNeeded(user.id)`
 * şeklinde, Promise engellemesi (blocking await) yapmadan sessizce koşturulur.
 */
export async function triggerSmartSyncIfNeeded(
  userId: string,
  thresholdMs: number = 30 * 60 * 1000,
): Promise<SyncRecentlyPlayedResult | null> {
  // 1. Hızlı bellek içi kontrol (aynı lambda içindeki peş peşe istekleri anında eler)
  const now = Date.now()
  const lastSyncInMemory = _lastSyncMap.get(userId) ?? 0
  if (now - lastSyncInMemory < SYNC_DEBOUNCE_MS) {
    return { outcome: 'skipped_debounced', eventsWritten: 0, latestPlayedAt: null }
  }

  try {
    const supabase = await createServiceClient()

    // 0. Test hesabı / sentetik profil savunma hattı (guard)
    if (supabase.auth?.admin?.getUserById) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        const u = authUser?.user
        if (
          u?.user_metadata?.is_test === true ||
          u?.email?.toLowerCase().endsWith('@rosso-test.local')
        ) {
          return { outcome: 'no_token', eventsWritten: 0, latestPlayedAt: null }
        }
      } catch {
        // Sessiz devam et
      }
    }

    const { data: conn, error } = await supabase
      .from('platform_connections')
      .select('platform, is_active, last_synced_at, last_recently_played_sync_at')
      .eq('user_id', userId)
      .eq('platform', 'spotify')
      .maybeSingle()

    if (error) {
      console.warn('[triggerSmartSyncIfNeeded] platform_connections sorgu hatası:', error)
      return null
    }

    if (!conn || conn.is_active === false) {
      return { outcome: 'no_token', eventsWritten: 0, latestPlayedAt: null }
    }

    // 2. Veritabanı zaman damgası kontrolü (30-40 dakika kalkanı)
    const lastTimestamp = conn.last_synced_at || conn.last_recently_played_sync_at
    if (lastTimestamp) {
      const lastTime = new Date(lastTimestamp).getTime()
      if (!isNaN(lastTime) && now - lastTime < thresholdMs) {
        // Henüz 30 dakika dolmadı — kotayı korumak için atla
        return { outcome: 'skipped_debounced', eventsWritten: 0, latestPlayedAt: null }
      }
    }

    // 3. Eşik aşıldı veya ilk defa senkronize ediliyor — senkronizasyonu başlat
    return await syncRecentlyPlayed(userId, { force: true })
  } catch (err) {
    console.error('[triggerSmartSyncIfNeeded] Beklenmeyen hata:', err)
    return null
  }
}
