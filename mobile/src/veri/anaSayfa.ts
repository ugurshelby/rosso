import type { SupabaseClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { useOturum } from './oturum'
import { paketAnahtari } from './paketler'
import { supabase } from './supabase'
import { ayBaslangici, sanatciMetni, tekillestir } from './bicim'

export { sureMetni } from './bicim'

/**
 * Ana Sayfa verisi (PLAN 4.7b). Kaynaklar web panosuyla aynı:
 * son dinlenenler `play_events` + `tracks` (web `getRecentActivity`), ayın en
 * çokları `recap_top_tracks` RPC'si, sayılar `user_stats_pkg` (payloads: 0165).
 */
export interface StatsPayload {
  unique_tracks?: number
  unique_artists?: number
  total_ms?: number
  genres?: { genre: string; play_count: number }[]
}

export interface SarkiOzeti {
  trackId: string
  ad: string
  sanatci: string
  kapak: string | null
  sayi?: number
}

interface TrackSatiri {
  title: string | null
  artists: unknown
  image_url: string | null
  deezer_image_url: string | null
}

const kapakSec = (t: Pick<TrackSatiri, 'image_url' | 'deezer_image_url'> | null) => t?.image_url ?? t?.deezer_image_url ?? null

function useKullaniciSorgusu<T>(parca: (string | number)[], getir: (db: SupabaseClient, id: string) => Promise<T>) {
  const oturum = useOturum()
  const db = supabase()
  const id = oturum.durum === 'var' ? oturum.kullaniciId : ''
  return useQuery<T>({
    queryKey: paketAnahtari(id, ...parca),
    enabled: !!db && !!id,
    queryFn: () => getir(db as SupabaseClient, id),
  })
}

export const useSonDinlenenler = () =>
  useKullaniciSorgusu<SarkiOzeti[]>(['son-dinlenenler'], async (db, id) => {
    const { data, error } = await db
      .from('play_events')
      .select('track_id, played_at, tracks(title, artists, image_url, deezer_image_url)')
      .eq('user_id', id)
      .order('played_at', { ascending: false })
      .limit(40)
    if (error) throw new Error(error.message)
    const satirlar = (data ?? []) as unknown as { track_id: string; tracks: TrackSatiri | null }[]
    return tekillestir(
      satirlar
        .filter((s) => s.tracks?.title)
        .map((s) => ({
          trackId: s.track_id,
          ad: s.tracks?.title ?? '',
          sanatci: sanatciMetni(s.tracks?.artists),
          kapak: kapakSec(s.tracks),
        })),
      15,
    )
  })

export const useAyinEnCoklari = () =>
  useKullaniciSorgusu<SarkiOzeti[]>(['ayin-en-coklari', ayBaslangici().toISOString().slice(0, 7)], async (db, id) => {
    const { data, error } = await db.rpc('recap_top_tracks', {
      p_user_id: id,
      p_from: ayBaslangici().toISOString(),
      p_to: new Date().toISOString(),
      p_limit: 5,
      p_source: null,
    })
    if (error) throw new Error(error.message)
    const satirlar = (data ?? []) as { track_id: string; title: string; artist_name: string; play_count: number }[]
    const ids = satirlar.map((s) => s.track_id).filter(Boolean)
    const kapaklar = new Map<string, string | null>()
    if (ids.length) {
      const { data: t } = await db.from('tracks').select('id, image_url, deezer_image_url').in('id', ids)
      for (const r of (t ?? []) as { id: string; image_url: string | null; deezer_image_url: string | null }[]) {
        kapaklar.set(r.id, kapakSec(r))
      }
    }
    return satirlar.map((s) => ({
      trackId: s.track_id,
      ad: s.title,
      sanatci: s.artist_name,
      kapak: kapaklar.get(s.track_id) ?? null,
      sayi: Number(s.play_count),
    }))
  })
