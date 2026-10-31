import type { SupabaseClient } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { useOturum } from './oturum'
import { paketAnahtari } from './paketler'
import { supabase } from './supabase'

/**
 * Mood listeleri (PLAN 4.7c). Durum `mood_workspace` (RLS: kullanıcının kendi
 * satırı), şarkılar `mood_pkg.payload`. "Spotify'da" durumu açılışta kaynağıyla
 * doğrulanır (`/api/mood/dogrula`, PLAN 1.3); gönderme web rotasıyla.
 */
export interface MoodCalismaAlani {
  mood_key: string
  exported_playlist_id: string | null
  exported_at: string | null
  hidden_track_ids: string[] | null
  weekly_sync_enabled: boolean | null
}

function useKimlik() {
  const oturum = useOturum()
  return oturum.durum === 'var' ? oturum.kullaniciId : ''
}

export function useMoodCalismaAlanlari() {
  const id = useKimlik()
  const db = supabase()
  return useQuery({
    queryKey: paketAnahtari(id, 'mood-calisma'),
    enabled: !!db && !!id,
    queryFn: async () => {
      const { data, error } = await (db as SupabaseClient)
        .from('mood_workspace')
        .select('mood_key, exported_playlist_id, exported_at, hidden_track_ids, weekly_sync_enabled')
        .eq('user_id', id)
      if (error) throw new Error(error.message)
      return new Map(((data ?? []) as MoodCalismaAlani[]).map((r) => [r.mood_key, r]))
    },
  })
}

export function useMoodPaketi(anahtar: string) {
  const id = useKimlik()
  const db = supabase()
  return useQuery({
    queryKey: paketAnahtari(id, 'mood-paket', anahtar),
    enabled: !!db && !!id,
    queryFn: async () => {
      const { data, error } = await (db as SupabaseClient)
        .from('mood_pkg')
        .select('payload, generated_at')
        .eq('user_id', id)
        .eq('mood_key', anahtar)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data ?? null) as { payload: unknown; generated_at: string } | null
    },
  })
}

/** Spotify'da silinen liste "eklenmemiş"e döner; değişen varsa durum yeniden okunur. */
export function useMoodDogrula() {
  const id = useKimlik()
  const istemci = useQueryClient()
  return useMutation({
    mutationFn: (moodKey?: string) =>
      api<{ kontrol: number; kaldirilan: string[] }>('/api/mood/dogrula', { yontem: 'POST', govde: moodKey ? { moodKey } : {} }),
    onSuccess: (s) => {
      if (s.kaldirilan.length) void istemci.invalidateQueries({ queryKey: paketAnahtari(id, 'mood-calisma') })
    },
  })
}

interface GonderSonucu {
  result?: { outcomes?: { status?: string; playlistId?: string; trackCount?: number }[] }
}

/**
 * Web akışıyla aynı sıra (mood-hero.tsx): önce Spotify'a gönder, BAŞARILIYSA
 * `mark_mood_exported` damgası. Önce damgalansaydı başarısız gönderim
 * "eklendi" görünürdü. Damga atılamazsa sessiz: bir sonraki doğrulama düzeltir.
 */
export function useSpotifyaGonder() {
  const id = useKimlik()
  const istemci = useQueryClient()
  return useMutation({
    mutationFn: async (moodKey: string) => {
      const yanit = await api<GonderSonucu>('/api/mood/create-playlist', {
        yontem: 'POST',
        govde: { moodKey, platforms: ['spotify'] },
      })
      const sonuc = yanit?.result?.outcomes?.[0]
      if (!sonuc || sonuc.status === 'failed') throw new Error('Spotify listeyi oluşturmadı')
      await supabase()
        ?.rpc('mark_mood_exported', { p_mood_key: moodKey, ...(sonuc.playlistId ? { p_playlist_id: sonuc.playlistId } : {}) })
        .then(
          () => undefined,
          () => undefined,
        )
      return { sarkiSayisi: sonuc.trackCount ?? 0, playlistId: sonuc.playlistId ?? null }
    },
    onSettled: () => istemci.invalidateQueries({ queryKey: paketAnahtari(id, 'mood-calisma') }),
  })
}
