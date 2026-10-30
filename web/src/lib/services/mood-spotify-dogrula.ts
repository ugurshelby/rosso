import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { systemLog } from '@/lib/observability/logger'
import { playlistlerKutuphanede } from '@/lib/spotify/kutuphane'

export interface MoodSpotifyDogrulamaSonucu {
  /** Spotify'a sorulan liste sayısı. */
  kontrol: number
  /** Kütüphanede bulunmadığı için Rosso'da "eklenmemiş" durumuna dönen mood'lar. */
  kaldirilan: string[]
}

/**
 * Rosso'da "Spotify'a eklendi" görünen mood listelerini Spotify'la doğrular
 * (PLAN 1.3, 2026-10-30).
 *
 * NEDEN: Kullanıcı listeyi Spotify'da silince Rosso hâlâ "eklendi" gösteriyordu
 * ve günlük senkron açıksa görünmeyen (silinmiş) listeye her gün şarkı yazıyordu.
 * Liste kütüphanede yoksa `exported_at`, `exported_playlist_id` ve
 * `weekly_sync_enabled` temizlenir: ekran "Spotify'a ekle" durumuna döner,
 * senkron durur. Yalnız Spotify'ın açıkça `false` dediği listeler değişir;
 * bilinmeyen durum (token, kota, ağ) hiçbir şeyi değiştirmez.
 *
 * Çağıranlar: mood detay sayfası (tek mood, açılışta) ve mood turu (kullanıcının
 * bütün listeleri, senkrondan ÖNCE).
 */
export async function moodSpotifyDurumunuDogrula(
  userId: string,
  moodKey?: string,
): Promise<MoodSpotifyDogrulamaSonucu> {
  const supabase = await createServiceClient()
  let sorgu = supabase
    .from('mood_workspace')
    .select('mood_key, exported_playlist_id')
    .eq('user_id', userId)
    .not('exported_playlist_id', 'is', null)
  if (moodKey) sorgu = sorgu.eq('mood_key', moodKey)

  const { data, error } = await sorgu
  if (error) throw error
  const satirlar = ((data as { mood_key: string; exported_playlist_id: string | null }[] | null) ?? [])
    .filter((r): r is { mood_key: string; exported_playlist_id: string } => Boolean(r.exported_playlist_id))
  if (satirlar.length === 0) return { kontrol: 0, kaldirilan: [] }

  const token = await ensureValidToken(userId, 'spotify')
  if (!token) return { kontrol: 0, kaldirilan: [] }

  const durum = await playlistlerKutuphanede(token, satirlar.map((r) => r.exported_playlist_id))
  const kaldirilan: string[] = []

  for (const satir of satirlar) {
    if (durum.get(satir.exported_playlist_id) !== false) continue
    const { error: guncelleHata } = await supabase
      .from('mood_workspace')
      .update({ exported_at: null, exported_playlist_id: null, weekly_sync_enabled: false })
      .eq('user_id', userId)
      .eq('mood_key', satir.mood_key)
      // Bu arada kullanıcı yeniden eklediyse yeni listeye dokunma.
      .eq('exported_playlist_id', satir.exported_playlist_id)
    if (!guncelleHata) kaldirilan.push(satir.mood_key)
  }

  if (kaldirilan.length > 0) {
    void systemLog({
      operation: 'mood_spotify_dogrula',
      userId,
      severity: 'info',
      errorMessage: `Spotify'da silinmiş mood listeleri ayrıldı: ${kaldirilan.join(', ')}`,
    })
  }
  return { kontrol: durum.size, kaldirilan }
}
