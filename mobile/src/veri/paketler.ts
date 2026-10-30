import type { SupabaseClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { useOturum } from './oturum'
import { supabase } from './supabase'

/**
 * Web'in okuduğu paketlerin aynısı, doğrudan Supabase'den RLS ile (mimari M4,
 * docs/mobile/api.md "Okumalar"). `payload` biçimleri ekran adımlarında (4.7)
 * web'deki tiplerden taşınır; burada satır biçimi ve sorgu anahtarı sabitlenir.
 * Anahtar kullanıcıyla başlar: hesap değişince önbellek karışmaz.
 */
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

export interface PaketSatiri<P = Json> {
  payload: P
  generated_at: string
}
export interface MoodPaketi<P = Json> extends PaketSatiri<P> {
  mood_key: string
}
export interface JourneyYili<P = Json> extends PaketSatiri<P> {
  year: number
  is_closed: boolean
}
export interface RecapOzeti {
  id: string
  period_type: string
  period_label: string
  period_start: string
  period_end: string
  generated_at: string
}
export interface RecapDetayi<P = Json> extends RecapOzeti {
  payload: P
}
export interface TopSerit {
  strip: string
  rank: number
  title: string
  artist: string
  track_id: string | null
  weight: number
}
export interface Playlist {
  id: string
  name: string
  track_count: number | null
  cover_url: string | null
  image_url: string | null
  platform_id: string | null
  updated_at: string
}

export const paketAnahtari = (kullaniciId: string, ...parca: (string | number)[]) => ['paket', kullaniciId, ...parca] as const

/** Sorgu çağıran kalıp: kurulum ve oturum hazır değilse çalışmaz, Supabase hatası fırlatılır. */
function usePaket<T>(parca: (string | number)[], getir: (db: SupabaseClient, kullaniciId: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const oturum = useOturum()
  const db = supabase()
  const kullaniciId = oturum.durum === 'var' ? oturum.kullaniciId : ''
  return useQuery<T>({
    queryKey: paketAnahtari(kullaniciId, ...parca),
    enabled: !!db && !!kullaniciId,
    queryFn: async () => {
      const { data, error } = await getir(db as SupabaseClient, kullaniciId)
      if (error) throw new Error(error.message)
      return data as T
    },
  })
}

export const useStatsPaketi = () =>
  usePaket<PaketSatiri | null>(['stats'], (db, id) =>
    db.from('user_stats_pkg').select('payload, generated_at').eq('user_id', id).maybeSingle(),
  )

export const useTastePaketi = () =>
  usePaket<PaketSatiri | null>(['taste'], (db, id) =>
    db.from('user_taste_pkg').select('payload, generated_at').eq('user_id', id).maybeSingle(),
  )

export const useTopSeritler = () =>
  usePaket<TopSerit[]>(['top-seritler'], (db, id) =>
    db
      .from('user_top_strips')
      .select('strip, rank, title, artist, track_id, weight')
      .eq('user_id', id)
      .eq('is_hidden', false)
      .order('strip')
      .order('rank'),
  )

export const useMoodPaketleri = () =>
  usePaket<MoodPaketi[]>(['mood'], (db, id) =>
    db.from('mood_pkg').select('mood_key, payload, generated_at').eq('user_id', id),
  )

export const useRecapler = () =>
  usePaket<RecapOzeti[]>(['recaps'], (db, id) =>
    db
      .from('recaps')
      .select('id, period_type, period_label, period_start, period_end, generated_at')
      .eq('user_id', id)
      .order('period_start', { ascending: false }),
  )

export const useRecap = (donemEtiketi: string) =>
  usePaket<RecapDetayi | null>(['recap', donemEtiketi], (db, id) =>
    db
      .from('recaps')
      .select('id, period_type, period_label, period_start, period_end, generated_at, payload')
      .eq('user_id', id)
      .eq('period_label', donemEtiketi)
      .maybeSingle(),
  )

export const useJourneyYillari = () =>
  usePaket<JourneyYili[]>(['journey-yillar'], (db, id) =>
    db.from('journey_year_pkg').select('year, is_closed, payload, generated_at').eq('user_id', id).order('year'),
  )

export const useJourneyEslikci = () =>
  usePaket<PaketSatiri | null>(['journey-eslikci'], (db, id) =>
    db.from('journey_eslikci_pkg').select('payload, generated_at').eq('user_id', id).maybeSingle(),
  )

export const useJourneyArc = () =>
  usePaket<PaketSatiri | null>(['journey-arc'], (db, id) =>
    db.from('journey_arc').select('payload, generated_at').eq('user_id', id).maybeSingle(),
  )

export const usePlaylistler = () =>
  usePaket<Playlist[]>(['playlistler'], (db, id) =>
    db
      .from('playlists')
      .select('id, name, track_count, cover_url, image_url, platform_id, updated_at')
      .eq('user_id', id)
      .order('updated_at', { ascending: false }),
  )
