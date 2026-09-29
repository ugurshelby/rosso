import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { checkRateLimit } from '@/lib/security/rate-limit'
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
export const maxDuration = 60

type RouteParams = { params: Promise<{ id: string }> }

// Playlist track ekle/çıkar için dakikada 20 yazma — tek kullanıcının
// yanlışlıkla/döngüsel istekle Spotify API'sini hammer'lamasını önler.
const PLAYLIST_WRITE_LIMIT = 20
const PLAYLIST_WRITE_WINDOW_MS = 60_000

/**
 * 🔐 S4 (2026-08-10) — Spotify track id biçim kapısı.
 *
 * Güvenlik denetimi (`decisions/guvenlik.md`)
 * bu route'u "gövde okuyor ama şema kullanmıyor" listesine koymuştu.
 * Okundu: sahiplik kontrolü SAĞLAM (`playlists` sorgusu `.eq('user_id')`
 * ile korunuyor) ama `spotifyTrackId` **hiç doğrulanmadan** URI'ye
 * gömülüyordu:  `spotify:track:${spotifyTrackId}`
 *
 * SQL enjeksiyonu değil (DB'ye gitmiyor) ama **URI enjeksiyonu**: boşluk,
 * tırnak veya `,` içeren bir değer Spotify isteğinin gövdesini bozabilir
 * ya da beklenmedik URI üretebilir.
 *
 * Spotify id'leri **22 karakter base62**'dir (ölçülebilir, sabit kural).
 */
const SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/

async function getPlaylistRow(userId: string, playlistId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('playlists')
    .select('platform_id, snapshot_id')
    .eq('id', playlistId)
    .eq('user_id', userId)
    .eq('platform', 'spotify')
    .single()
  return { supabase, row: data as { platform_id: string; snapshot_id: string | null } | null }
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`playlist-write:${user.id}`, PLAYLIST_WRITE_LIMIT, PLAYLIST_WRITE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { id: playlistId } = await params
  const { spotifyTrackId } = await req.json()

  if (typeof spotifyTrackId !== 'string' || !SPOTIFY_ID_RE.test(spotifyTrackId)) {
    return NextResponse.json({ error: 'Invalid track id.' }, { status: 400 })
  }

  const token = await ensureValidToken(user.id, 'spotify')
  if (!token) return NextResponse.json({ error: 'Spotify not connected' }, { status: 400 })

  const { supabase, row } = await getPlaylistRow(user.id, playlistId)
  if (!row) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })

  const resp = await fetch(
    `https://api.spotify.com/v1/playlists/${row.platform_id}/items`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [`spotify:track:${spotifyTrackId}`] }),
      // Yazma işlemi — timeout "sunucuda olmadı" demek DEĞİL; bu yüzden
      // burada yeniden deneme YOK, yalnız sınır var.
      signal: AbortSignal.timeout(ZAMAN_ASIMI_YAZMA),
    },
  )

  if (!resp.ok) {
    return NextResponse.json({ error: 'Spotify add failed' }, { status: 502 })
  }

  const { snapshot_id } = await resp.json()
  await supabase.from('playlists').update({ snapshot_id }).eq('id', playlistId)

  return NextResponse.json({ success: true, snapshot_id })
}

export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`playlist-write:${user.id}`, PLAYLIST_WRITE_LIMIT, PLAYLIST_WRITE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { id: playlistId } = await params
  const { spotifyTrackId } = await req.json()

  // 🔐 S4 — aynı kapı DELETE tarafında da (bkz. SPOTIFY_ID_RE notu).
  if (typeof spotifyTrackId !== 'string' || !SPOTIFY_ID_RE.test(spotifyTrackId)) {
    return NextResponse.json({ error: 'Invalid track id.' }, { status: 400 })
  }

  const token = await ensureValidToken(user.id, 'spotify')
  if (!token) return NextResponse.json({ error: 'Spotify not connected' }, { status: 400 })

  const { supabase, row } = await getPlaylistRow(user.id, playlistId)
  if (!row) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })

  const resp = await fetch(
    `https://api.spotify.com/v1/playlists/${row.platform_id}/items`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Spotify'ın DELETE /playlists/{id}/items endpoint'i "items" alanı
        // bekliyor — "tracks" deprecated endpoint şemasına ait, 400 verir
        // (canlı doğrulandı, 2026-07-02, resmi API dokümantasyonuyla teyit edildi).
        items: [{ uri: `spotify:track:${spotifyTrackId}` }],
        snapshot_id: row.snapshot_id,
      }),
      signal: AbortSignal.timeout(ZAMAN_ASIMI_YAZMA),
    },
  )

  if (!resp.ok) {
    return NextResponse.json({ error: 'Spotify remove failed' }, { status: 502 })
  }

  const { snapshot_id } = await resp.json()
  await supabase.from('playlists').update({ snapshot_id }).eq('id', playlistId)

  return NextResponse.json({ success: true, snapshot_id })
}
