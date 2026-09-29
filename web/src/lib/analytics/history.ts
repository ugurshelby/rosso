import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * FAZ DİNLEME-GEÇMİŞİ (Sahip 2026-07-26): "Dinleme Geçmişi" (/gecmis) sayfası
 * için veri erişimi. stats.fm "Top" ekranı ilhamı: 3 sekme (Şarkı/Sanatçı/Albüm)
 * × zaman aralığı × kapak + istatistik.
 *
 * Migration 0133'teki history_top_* RPC'lerine bağlanır. analytics/engine.ts'ten
 * AYRI tutuldu — o recap'e ait, bu geçmiş sayfasına. Ortak `Period`/`getDateRange`
 * engine'den yeniden kullanılır (tek kaynak).
 */
import { getDateRange, type Period } from './engine'
import { normalizeArtistName } from '@/lib/catalog/normalize-artist-name'

/** Sıralama: dinleme süresi (varsayılan) veya çalma sayısı — stats.fm iki seçenek. */
export type HistorySort = 'time' | 'count'

/** Özel tarih aralığı — takvim seçicisi buradan besler. from/to inclusive. */
export interface HistoryRange {
  from: Date | null
  to: Date
}

export interface HistoryTopTrack {
  track_id: string | null
  title: string
  artist_name: string | null
  album: string | null
  image_url: string | null
  play_count: number
  total_ms: number
}

export interface HistoryTopArtist {
  artist_name: string
  image_url: string | null
  play_count: number
  total_ms: number
}

export interface HistoryTopAlbum {
  album: string
  artist_name: string | null
  image_url: string | null
  play_count: number
  total_ms: number
}

/**
 * Period preset'i VEYA özel aralık → {from,to}. Özel aralık verilirse o kazanır;
 * yoksa preset'ten hesaplanır (aylık/yıllık/tümü — engine.getDateRange).
 */
export function resolveRange(period: Period, custom?: HistoryRange | null): HistoryRange {
  if (custom) return custom
  return getDateRange(period)
}

function rangeArgs(range: HistoryRange) {
  return {
    p_from: range.from?.toISOString() ?? undefined,
    p_to: range.to.toISOString(),
  }
}

export async function getHistoryTopTracks(
  userId: string,
  range: HistoryRange,
  sort: HistorySort = 'time',
  limit = 100,
): Promise<HistoryTopTrack[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('history_top_tracks', {
      p_user_id: userId,
      ...rangeArgs(range),
      p_limit: limit,
      p_sort: sort,
    })
    if (error || !data) return []
    const rows = (data as HistoryTopTrack[]).map((r) => ({
      track_id: r.track_id ?? null,
      title: r.title ?? '',
      artist_name: r.artist_name ?? null,
      album: r.album ?? null,
      image_url: r.image_url ?? null,
      play_count: Number(r.play_count),
      total_ms: Number(r.total_ms),
    }))

    const missingIds = rows
      .filter((r) => !r.image_url && r.track_id)
      .map((r) => r.track_id as string)

    if (missingIds.length > 0) {
      const { data: trackImages } = await supabase
        .from('tracks')
        .select('id, image_url')
        .in('id', missingIds)
      if (trackImages && trackImages.length > 0) {
        const map = new Map(trackImages.map((t) => [t.id, t.image_url]))
        return rows.map((r) => ({
          ...r,
          image_url: r.image_url || (r.track_id ? map.get(r.track_id) ?? null : null),
        }))
      }
    }

    return rows
  } catch (err) {
    console.error('[history] getHistoryTopTracks başarısız:', err)
    return []
  }
}

export async function getHistoryTopArtists(
  userId: string,
  range: HistoryRange,
  sort: HistorySort = 'time',
  limit = 100,
): Promise<HistoryTopArtist[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('history_top_artists', {
      p_user_id: userId,
      ...rangeArgs(range),
      p_limit: limit,
      p_sort: sort,
    })
    if (error || !data) return []
    const rows = (data as HistoryTopArtist[]).map((r) => ({
      artist_name: r.artist_name ?? '',
      image_url: r.image_url ?? null,
      play_count: Number(r.play_count),
      total_ms: Number(r.total_ms),
    }))

    const missingNames = rows
      .filter((r) => !r.image_url && r.artist_name)
      .map((r) => normalizeArtistName(r.artist_name))

    if (missingNames.length > 0) {
      const { data: artistImages } = await supabase
        .from('artists')
        .select('name_normalized, image_url')
        .in('name_normalized', missingNames)
      if (artistImages && artistImages.length > 0) {
        const map = new Map(artistImages.map((a) => [a.name_normalized, a.image_url]))
        return rows.map((r) => ({
          ...r,
          image_url: r.image_url || map.get(normalizeArtistName(r.artist_name)) || null,
        }))
      }
    }

    return rows
  } catch (err) {
    console.error('[history] getHistoryTopArtists başarısız:', err)
    return []
  }
}

export async function getHistoryTopAlbums(
  userId: string,
  range: HistoryRange,
  sort: HistorySort = 'time',
  limit = 100,
): Promise<HistoryTopAlbum[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('history_top_albums', {
      p_user_id: userId,
      ...rangeArgs(range),
      p_limit: limit,
      p_sort: sort,
    })
    if (error || !data) return []
    return (data as HistoryTopAlbum[]).map((r) => ({
      album: r.album ?? '',
      artist_name: r.artist_name ?? null,
      image_url: r.image_url ?? null,
      play_count: Number(r.play_count),
      total_ms: Number(r.total_ms),
    }))
  } catch (err) {
    console.error('[history] getHistoryTopAlbums başarısız:', err)
    return []
  }
}
