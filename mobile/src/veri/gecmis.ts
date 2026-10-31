import type { SupabaseClient } from '@supabase/supabase-js'
import { useInfiniteQuery } from '@tanstack/react-query'
import { donemBaslangici, sanatciMetni, type Donem } from './bicim'
import { useOturum } from './oturum'
import { paketAnahtari } from './paketler'
import { supabase } from './supabase'

/**
 * Geçmiş (PLAN 4.7d, spec §9.5): `play_events` + `tracks`, yeniden eskiye,
 * sayfa başı 100. Büyük tabloyu REST'in 1000 satır sınırına dayanmadan, `range`
 * ile parça parça okur; liste FlashList'te sanallaştırılır.
 */
export const SAYFA = 100

export interface Dinleme {
  id: string
  trackId: string
  zaman: string
  ad: string
  sanatci: string
  kapak: string | null
  atlandi: boolean
}

export function useGecmis(donem: Donem) {
  const oturum = useOturum()
  const db = supabase()
  const id = oturum.durum === 'var' ? oturum.kullaniciId : ''
  return useInfiniteQuery({
    queryKey: paketAnahtari(id, 'gecmis', donem),
    enabled: !!db && !!id,
    initialPageParam: 0,
    getNextPageParam: (son: Dinleme[], tumu) => (son.length < SAYFA ? undefined : tumu.length * SAYFA),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await (db as SupabaseClient)
        .from('play_events')
        .select('id, track_id, played_at, skipped, tracks(title, artists, image_url, deezer_image_url)')
        .eq('user_id', id)
        .gte('played_at', donemBaslangici(donem).toISOString())
        .order('played_at', { ascending: false })
        .range(pageParam, pageParam + SAYFA - 1)
      if (error) throw new Error(error.message)
      type Satir = {
        id: string
        track_id: string
        played_at: string
        skipped: boolean | null
        tracks: { title: string | null; artists: unknown; image_url: string | null; deezer_image_url: string | null } | null
      }
      return ((data ?? []) as unknown as Satir[]).map(
        (s): Dinleme => ({
          id: s.id,
          trackId: s.track_id,
          zaman: s.played_at,
          ad: s.tracks?.title ?? 'Bilinmeyen şarkı',
          sanatci: sanatciMetni(s.tracks?.artists),
          kapak: s.tracks?.image_url ?? s.tracks?.deezer_image_url ?? null,
          atlandi: !!s.skipped,
        }),
      )
    },
  })
}
