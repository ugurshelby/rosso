import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { moodByKey } from '@/lib/analytics/mood'
import { ZAMAN_ASIMI_YAZMA } from '@/lib/fetch/zaman-asimi'

/*
 * Rota süre sınırı (2026-08-21 refine).
 *
 * Vercel varsayılanı **300 saniye**. Bu rota dış API çağırıyor; oradaki
 * `AbortSignal.timeout` isteği keser ama rotanın KENDİSİ (yeniden denemeler,
 * DB yazımı, arka plan işi) hâlâ dakikalarca sürebilir. `maxDuration` ikinci
 * ve son sınır: kullanıcı sonsuz bekleyen bir istekle kalmaz, fonksiyon
 * boşuna faturalanmaz.
 *
 * Değer, fetch zaman aşımının ÜSTÜNDE seçildi ki normal yavaşlık burada
 * değil, kendi katmanında yakalansın ve hata mesajı anlamlı olsun.
 */
export const maxDuration = 30

/**
 * Mood şarkısını Rosso'dan çıkardığında Spotify'dan da siler
 * (Sahip, 2026-08-11: "rossodan çıkardığımda spotifydan da çıkmalı").
 *
 * ⚠ ÖLÇÜLDÜ: `moodGizlenenleriKaydet` (server action) yalnız
 *   `mood_workspace.hidden_track_ids`'e yazıyordu — Spotify'a HİÇ
 *   dokunmuyordu. Playlist zaten Spotify'a eklenmişse (`exportedPlaylistId`
 *   dolu) şarkı Rosso'da kaybolur ama Spotify'da kalırdı. Bu route o
 *   boşluğu kapatır; `mood-workspace.tsx` DB yazımından SONRA bunu çağırır.
 *
 * ⚠ Mood playlist'i `playlists` tablosunda bir kayıt DEĞİL (yalnız
 *   `mood_workspace.exported_playlist_id`'de Spotify ID'si tutulur) —
 *   bu yüzden `/api/playlists/[id]/tracks` route'u burada kullanılamaz,
 *   o `playlists.id` (Rosso UUID) bekliyor. Aynı Spotify DELETE deseni
 *   (§ items formatı, snapshot_id) burada mood'a özel tekrarlanıyor.
 *
 * ⚠ SENKRON AÇIK/KAPALI FARK ETMEZ: kullanıcı "çıkar" dediğinde bu net
 *   bir niyettir — playlist zaten Spotify'daysa (exportedPlaylistId dolu)
 *   şarkı oradan da gider. `weekly_sync_enabled` yalnız CRON'un haftalık
 *   OTOMATİK güncellemesini kontrol eder, kullanıcının ANLIK eylemini değil.
 */

const PLAYLIST_WRITE_LIMIT = 20
const PLAYLIST_WRITE_WINDOW_MS = 60_000

/** Spotify id'leri 22 karakter base62 (§ URI enjeksiyonu kapısı, playlists/[id]/tracks ile aynı desen). */
const SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`playlist-write:${user.id}`, PLAYLIST_WRITE_LIMIT, PLAYLIST_WRITE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const moodKey = typeof body?.moodKey === 'string' ? body.moodKey : null
  const spotifyTrackId = typeof body?.spotifyTrackId === 'string' ? body.spotifyTrackId : null

  if (!moodKey || !moodByKey(moodKey)) {
    return NextResponse.json({ error: 'Invalid moment key.' }, { status: 400 })
  }
  if (!spotifyTrackId || !SPOTIFY_ID_RE.test(spotifyTrackId)) {
    return NextResponse.json({ error: 'Invalid track id.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Bu mood daha önce Spotify'a aktarıldı mı? Aktarılmadıysa yapacak
  // Spotify işi yok — Rosso tarafı zaten `moodGizlenenleriKaydet` ile
  // ayrıca kaydedildi, bu route yalnız Spotify SENKRONUNU tamamlıyor.
  const { data: workspace } = await supabase.rpc('get_mood_workspace', {
    p_mood_key: moodKey,
  })
  const row = Array.isArray(workspace) ? workspace[0] : null
  const playlistId = row?.exported_playlist_id as string | null | undefined

  if (!playlistId) {
    // Henüz Spotify'a hiç eklenmemiş — bu beklenen, hata değil.
    return NextResponse.json({ success: true, spotifySynced: false })
  }

  const token = await ensureValidToken(user.id, 'spotify')
  if (!token) {
    // Bağlantı kopmuş olabilir — Rosso tarafı yine de doğru (çıkarıldı),
    // yalnız Spotify senkronu bu turda atlanır.
    return NextResponse.json({ success: true, spotifySynced: false, warning: 'no_spotify_token' })
  }

  const resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Spotify DELETE /playlists/{id}/tracks: "items" alanı bekler
      // ("tracks" deprecated endpoint şemasına ait — playlists/[id]/tracks
      // route'undaki 2026-07-02 doğrulamasıyla aynı).
      items: [{ uri: `spotify:track:${spotifyTrackId}` }],
    }),
    signal: AbortSignal.timeout(ZAMAN_ASIMI_YAZMA),
  })

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    console.warn(`Mood şarkı Spotify'dan silinemedi: ${resp.status} ${detail.slice(0, 160)}`)
    // Rosso tarafı zaten doğru (kullanıcı listede görmüyor) — Spotify
    // senkronu başarısız oldu ama sayfayı BOZMAZ, kullanıcıya bildirilir.
    return NextResponse.json({ success: true, spotifySynced: false, warning: 'spotify_remove_failed' })
  }

  return NextResponse.json({ success: true, spotifySynced: true })
}
