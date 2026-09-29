import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * Your Years — kullanıcının tamamlanmış her takvim yılı için Top 100 arşivi
 * (migration 0310). `mood_pkg`'in aksine BİR KEZ üretilir, bir daha
 * güncellenmez — bu dosya yalnız OKUMA sağlar, üretim cron tarafında
 * (`mood-pkg.ts::runYearPkg`).
 */

export interface YearTrack {
  trackId: string | null
  title: string
  artistName: string | null
  album: string | null
  imageUrl: string | null
  playCount: number
  spotifyId: string | null
}

export interface YearSummary {
  year: number
  coverUrl: string | null
}

/** Kullanıcının arşivlenmiş tüm yılları — en yeniden en eskiye. */
export async function getYearSummaries(userId: string): Promise<YearSummary[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('year_pkg')
      .select('year, cover_url')
      .eq('user_id', userId)
      .order('year', { ascending: false })

    if (error) throw error
    return (data ?? []).map((r) => ({ year: r.year as number, coverUrl: (r.cover_url as string | null) ?? null }))
  } catch (err) {
    console.error('[year-pkg] getYearSummaries başarısız:', err)
    return []
  }
}

/** Tek bir yılın Top 100 arşivi. */
export async function getYearPackage(userId: string, year: number): Promise<YearTrack[] | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('year_pkg')
      .select('payload')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const payload = (data.payload ?? []) as Array<{
      track_id: string | null
      title: string | null
      artist_name: string | null
      album: string | null
      image_url: string | null
      play_count: number | string
      spotify_id?: string | null
    }>

    return payload.map((r) => ({
      trackId: r.track_id ?? null,
      title: r.title ?? '',
      artistName: r.artist_name ?? null,
      album: r.album ?? null,
      imageUrl: r.image_url ?? null,
      playCount: Number(r.play_count),
      spotifyId: r.spotify_id ?? null,
    }))
  } catch (err) {
    console.error('[year-pkg] getYearPackage başarısız:', err)
    return null
  }
}
