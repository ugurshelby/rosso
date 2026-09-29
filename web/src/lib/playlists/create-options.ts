import { createClient } from '@/lib/supabase/server'

/**
 * `/playlists/create` panellerinin seçenekleri (migration 0279).
 *
 * 🔴 Neden kullanıcının KENDİ türleri/sanatçıları, tüm katalog değil:
 * kullanıcı dinlemediği bir türü seçerse boş liste üretilir ve "bozuk"
 * görünür. Panel yalnız GERÇEKTEN dinlenmiş olanı gösterir; yanındaki
 * sayı da "bende bu kadar var" der (Sahibin P4.2 tarifi).
 */

export interface CreateOption {
  value: string
  count: number
}

export async function getKullaniciTurleri(userId: string): Promise<CreateOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('kullanici_turleri', { p_user_id: userId })
  if (error || !data) return []
  return (data as Array<{ genre: string; play_count: number }>).map((r) => ({
    value: r.genre,
    count: Number(r.play_count),
  }))
}

export async function getKullaniciSanatcilari(userId: string): Promise<CreateOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('kullanici_sanatcilari', { p_user_id: userId })
  if (error || !data) return []
  return (data as Array<{ artist: string; play_count: number }>).map((r) => ({
    value: r.artist,
    count: Number(r.play_count),
  }))
}
