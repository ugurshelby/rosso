import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  createSpotifyPlaylist,
  addTracksToSpotify,
} from '@/lib/playlists/spotify-target'
import { applyPlaylistCover } from '@/lib/playlists/cover'

/**
 * Manuel playlist üretimi (FAZ PLAYLIST).
 *
 * Kullanıcı bir tarih aralığı + şarkı sayısı seçer; o aralıkta en çok dinlediği
 * N şarkıdan (çoktan aza) yeni Spotify playlist'i oluşturulur.
 * (2026-07-28 plan 07: YT/Apple kaldırıldı → yalnız Spotify hedefi.)
 */

/** Rosso saf Spotify (plan 07). Tip, eski çok-platform imzasını sadeleştirir. */
export type MigrationPlatform = 'spotify'

const EN_MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface ManualPlaylistParams {
  from: string // 'YYYY-MM-DD'
  to: string // 'YYYY-MM-DD'
  count: number
  platforms: MigrationPlatform[]
  name?: string // verilmezse aralıktan türetilir
  /** Playlist açıklaması — platforma yazılır (P4.2). */
  description?: string
  /** Yalnız bu türlerden şarkılar. Boş/verilmemiş = tür süzgeci yok. */
  genres?: string[]
  /** Yalnız bu ana sanatçılardan. Boş/verilmemiş = sanatçı süzgeci yok. */
  artists?: string[]
  /** 'plays' = çalma sayısı (varsayılan) · 'duration' = toplam süre. */
  sortBy?: 'plays' | 'duration'
  /** Kapak görseli, `data:image/jpeg;base64,…` (≤256 KB). İsteğe bağlı. */
  coverImage?: string
}

export interface PlatformOutcome {
  platform: MigrationPlatform
  status: 'completed' | 'partial' | 'failed'
  playlistId: string | null
  /** Rosso'nun kendi UUID'si (`playlists.id`) — detay sayfasına yönlendirmek için. */
  playlistDbId: string | null
  trackCount: number
  error?: string
}

export interface ManualPlaylistResult {
  ok: boolean
  name: string
  totalTracks: number
  outcomes: PlatformOutcome[]
}

/** Aralıktan otomatik playlist adı: tam ay → "Mayıs - 2026", tam yıl → "2025",
 *  serbest aralık → "1 Oca - 15 Mar 2026". (Kullanıcı kararı 2026-07-09, dil TR.) */
export function derivePlaylistName(from: string, to: string): string {
  const f = new Date(from + 'T00:00:00Z')
  const t = new Date(to + 'T00:00:00Z')

  const isMonthStart = f.getUTCDate() === 1
  const isMonthEnd = t.getUTCDate() === lastDayOfMonth(t.getUTCFullYear(), t.getUTCMonth() + 1)
  const sameMonth = f.getUTCFullYear() === t.getUTCFullYear() && f.getUTCMonth() === t.getUTCMonth()
  const sameYear = f.getUTCFullYear() === t.getUTCFullYear()

  // Tam bir takvim ayı
  if (sameMonth && isMonthStart && isMonthEnd) {
    return `${EN_MONTHS[f.getUTCMonth() + 1]} - ${f.getUTCFullYear()}`
  }
  // Tam bir takvim yılı
  if (
    sameYear && f.getUTCMonth() === 0 && f.getUTCDate() === 1 &&
    t.getUTCMonth() === 11 && t.getUTCDate() === 31
  ) {
    return String(f.getUTCFullYear())
  }
  // Serbest aralık
  const fStr = `${f.getUTCDate()} ${EN_MONTHS[f.getUTCMonth() + 1].slice(0, 3)}`
  const tStr = `${t.getUTCDate()} ${EN_MONTHS[t.getUTCMonth() + 1].slice(0, 3)} ${t.getUTCFullYear()}`
  return `${fStr} - ${tStr}`
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

interface TopTrackRow {
  track_id: string
  raw_track_name: string | null
  raw_artist_name: string | null
  play_count: number
}

export async function generateManualPlaylist(
  userId: string,
  params: ManualPlaylistParams,
): Promise<ManualPlaylistResult> {
  const supabase = await createClient()
  const name = params.name?.trim() || derivePlaylistName(params.from, params.to)

  /**
   * 1. Şarkı seçimi.
   *
   * Süzgeç (tür/sanatçı/sıralama) VARSA `parametreli_top_tracks` (0279),
   * yoksa otomasyonla AYNI RPC (`get_top_tracks_for_rule`). İkisi de aynı
   * kimlik guard'ını ve incognito filtresini uygular — iki üretim yolu farklı
   * gizlilik davranışı göstermemeli.
   *
   * Süzgeçsiz durumda eski RPC'de kalmanın sebebi: o yol yıllardır üretimde,
   * davranışı bilinen; parametre verilmediğinde onu değiştirmek gereksiz risk.
   */
  const genres = params.genres?.filter(Boolean) ?? []
  const artists = params.artists?.filter(Boolean) ?? []
  const sortBy = params.sortBy ?? 'plays'
  const parametreli = genres.length > 0 || artists.length > 0 || sortBy !== 'plays'

  const { data, error } = parametreli
    ? await supabase.rpc('parametreli_top_tracks', {
        p_user_id: userId,
        p_from: `${params.from}T00:00:00+00:00`,
        p_to: `${params.to}T23:59:59+00:00`,
        p_limit: params.count,
        p_genres: genres.length > 0 ? genres : undefined,
        p_artists: artists.length > 0 ? artists : undefined,
        p_sort_by: sortBy,
      })
    : await supabase.rpc('get_top_tracks_for_rule', {
        p_user_id: userId,
        p_from: `${params.from}T00:00:00+00:00`,
        p_to: `${params.to}T23:59:59+00:00`,
        p_limit: params.count,
      })
  if (error || !data || data.length === 0) {
    return { ok: false, name, totalTracks: 0, outcomes: [] }
  }
  const rows = data as TopTrackRow[]
  const trackUuids = rows.map((r) => r.track_id)

  // 2. Her platform için bağımsız üret (izole hata yönetimi)
  const outcomes: PlatformOutcome[] = []
  for (const platform of params.platforms) {
    const pairs = await resolveTrackPairs(supabase, trackUuids)
    try {
      if (pairs.length === 0) {
        outcomes.push({ platform, status: 'failed', playlistId: null, playlistDbId: null, trackCount: 0, error: 'no_matched_tracks' })
        continue
      }
      const playlistId = await createSpotifyPlaylist(
        userId,
        name,
        params.description?.trim() || undefined,
      )
      // trackCount GERÇEKTEN eklenen sayıdır — pairs.length yalnızca eşleşme
      // sayısıydı, ekleme başarısız olsa bile "completed" yazan bug'la aynı sınıf
      // (addTracksToSpotify addedCount ile bunu kapatır, 2026-07-13).
      const addResult = await addTracksToSpotify(userId, playlistId, pairs.map((p) => p.spotifyId))
      const addedPairs = pairs.slice(0, addResult.addedCount)

      /* Kapak EN SONA bırakılır ve hatası YUTULUR: liste kurulmuşken "kapak
         olmadı" diye tüm işlemi başarısız saymak kullanıcının emeğini çöpe
         atardı. Kullanıcı kapak vermediyse ilk 4 track'in görselinden kolaj. */
      const cover = await applyPlaylistCover(
        userId,
        playlistId,
        params.coverImage,
        params.coverImage ? [] : await getImageUrlsForCollage(supabase, addedPairs.map((p) => p.trackUuid)),
      )

      const playlistDbId = await syncCreatedPlaylistToDb(
        supabase,
        userId,
        playlistId,
        name,
        params.description?.trim() || null,
        addedPairs.map((p) => p.trackUuid),
        cover.coverUrl,
      )

      outcomes.push({
        platform,
        status: addResult.addedCount === trackUuids.length ? 'completed' : addResult.addedCount > 0 ? 'partial' : 'failed',
        playlistId,
        playlistDbId,
        trackCount: addResult.addedCount,
      })
    } catch (err) {
      outcomes.push({
        platform,
        status: 'failed',
        playlistId: null,
        playlistDbId: null,
        trackCount: 0,
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  const ok = outcomes.some((o) => o.status !== 'failed')
  return { ok, name, totalTracks: trackUuids.length, outcomes }
}

/**
 * Hazır bir track UUID listesinden playlist oluştur (FAZ MOOD + genel).
 * generateManualPlaylist tarih aralığından türetir; bu ise track listesini
 * DOĞRUDAN alır (mood playlist'i, öneri listesi vb.). Aynı engine yazıcıları,
 * aynı rate-limit koruması (§1.6, engine.ts içinde).
 */
export async function createPlaylistFromTracks(
  userId: string,
  trackUuids: string[],
  name: string,
  platforms: MigrationPlatform[],
  description?: string,
  /**
   * `true` → otomatik kolaj kapağı UYGULANMAZ. Mood gibi zaten kendi markalı
   * kapağı olan çağıranlar için (bkz. `mood-cover-upload.ts`) — aksi halde
   * kolaj yüklenip hemen ardından mood kapağıyla ezilirdi, boşa iş.
   */
  skipAutoCover = false,
): Promise<ManualPlaylistResult> {
  const supabase = await createClient()
  if (trackUuids.length === 0) {
    return { ok: false, name, totalTracks: 0, outcomes: [] }
  }

  const outcomes: PlatformOutcome[] = []
  for (const platform of platforms) {
    const pairs = await resolveTrackPairs(supabase, trackUuids)
    try {
      if (pairs.length === 0) {
        outcomes.push({ platform, status: 'failed', playlistId: null, playlistDbId: null, trackCount: 0, error: 'no_matched_tracks' })
        continue
      }
      const playlistId = await createSpotifyPlaylist(userId, name, description)
      const addResult = await addTracksToSpotify(userId, playlistId, pairs.map((p) => p.spotifyId))
      const addedPairs = pairs.slice(0, addResult.addedCount)

      const cover = skipAutoCover
        ? { coverUrl: null, spotifyUploaded: false }
        : await applyPlaylistCover(
            userId,
            playlistId,
            undefined,
            await getImageUrlsForCollage(supabase, addedPairs.map((p) => p.trackUuid)),
          )

      const playlistDbId = await syncCreatedPlaylistToDb(
        supabase,
        userId,
        playlistId,
        name,
        description?.trim() || null,
        addedPairs.map((p) => p.trackUuid),
        cover.coverUrl,
      )

      outcomes.push({
        platform,
        status: addResult.addedCount === trackUuids.length ? 'completed' : addResult.addedCount > 0 ? 'partial' : 'failed',
        playlistId,
        playlistDbId,
        trackCount: addResult.addedCount,
      })
    } catch (err) {
      outcomes.push({
        platform, status: 'failed', playlistId: null, playlistDbId: null, trackCount: 0,
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  const ok = outcomes.some((o) => o.status !== 'failed')
  return { ok, name, totalTracks: trackUuids.length, outcomes }
}

interface TrackPair {
  trackUuid: string
  spotifyId: string
}

/** track uuid → platform-specific ID (tracks tablosu). Sıra korunur. */
async function resolveTrackPairs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trackUuids: string[],
): Promise<TrackPair[]> {
  const { data } = await supabase.from('tracks').select('id, spotify_id').in('id', trackUuids)
  if (!data) return []
  const map = new Map<string, string>()
  for (const row of data as Array<{ id: string; spotify_id: string | null }>) {
    if (row.spotify_id) map.set(row.id, row.spotify_id)
  }
  // Orijinal sırayı koru (çoktan aza)
  return trackUuids
    .map((u) => {
      const spotifyId = map.get(u)
      return spotifyId ? { trackUuid: u, spotifyId } : null
    })
    .filter((x): x is TrackPair => x !== null)
}

/** Kolaj için ilk N eklenmiş track'in kendi kapak görseli (DB-cache'li). */
async function getImageUrlsForCollage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  addedTrackUuids: string[],
  limit = 4,
): Promise<string[]> {
  if (addedTrackUuids.length === 0) return []
  const { data } = await supabase
    .from('tracks')
    .select('id, image_url')
    .in('id', addedTrackUuids.slice(0, limit))
  if (!data) return []
  const map = new Map((data as Array<{ id: string; image_url: string | null }>).map((r) => [r.id, r.image_url]))
  return addedTrackUuids
    .slice(0, limit)
    .map((id) => map.get(id))
    .filter((u): u is string => Boolean(u))
}

/**
 * Az önce Spotify'da oluşturulan playlist'i Rosso DB'sine hemen yazar —
 * bir sonraki `playlist_refresh` cron'unu (saatlerce sonra) beklemeden
 * kullanıcı kendi listesinin detay sayfasına anında yönlendirilebilsin diye
 * (Sahip, 2026-09-16: "playlists sayfasından direkt o playlistin detay
 * sayfasına yönlendirmeli bizi ki görelim"). Aynı `onConflict` deseni
 * `playlist-refresh.ts` ile birebir — bir sonraki senkron turu bu satırın
 * üstüne sorunsuz yazar.
 */
async function syncCreatedPlaylistToDb(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  spotifyPlaylistId: string,
  name: string,
  description: string | null,
  addedTrackUuids: string[],
  coverUrl: string | null,
): Promise<string | null> {
  try {
    const { data: upserted, error } = await supabase
      .from('playlists')
      .upsert(
        {
          user_id: userId,
          platform: 'spotify',
          platform_id: spotifyPlaylistId,
          name,
          description,
          track_count: addedTrackUuids.length,
          cover_url: coverUrl,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform,platform_id' },
      )
      .select('id')
      .single()
    if (error || !upserted) return null

    await supabase.from('playlist_tracks').delete().eq('playlist_id', upserted.id)
    if (addedTrackUuids.length > 0) {
      await supabase.from('playlist_tracks').insert(
        addedTrackUuids.map((trackId, position) => ({
          playlist_id: upserted.id,
          track_id: trackId,
          position,
          added_at: new Date().toISOString(),
        })),
      )
    }
    return upserted.id as string
  } catch {
    // DB senkronu başarısız olsa da Spotify'daki liste geçerli — kullanıcı
    // yalnızca "detaya git" anındalığını kaybeder, playlist_refresh cron'u
    // bir sonraki turda zaten yakalar.
    return null
  }
}
