import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { fetchWithRetry, RateLimitedError } from '@/lib/playlists/fetch-retry'

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

type RouteParams = { params: Promise<{ id: string }> }

// Aynı sınır ekle/çıkar route'uyla (playlist-write) — bu da Spotify'a yazan bir işlem.
const PLAYLIST_WRITE_LIMIT = 20
const PLAYLIST_WRITE_WINDOW_MS = 60_000

const NAME_MAX = 100
const DESCRIPTION_MAX = 300

/**
 * Playlist ad + açıklama düzenleme — Spotify `PUT /playlists/{id}` ile yazar.
 *
 * Sahip (2026-08-11): hero'daki "..." menüsü hayalet bir senkron paneline
 * bağlıydı (panel zaten kaldırılmıştı, buton hiçbir şey açmıyordu). Bunun
 * yerine gerçek bir playlist yönetim eylemi — ad/açıklama Spotify'a yazılır,
 * sonra yerel `playlists` tablosuna da yansıtılır (sayfa yeniden
 * yüklenmeden doğru göstersin).
 */
export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`playlist-write:${user.id}`, PLAYLIST_WRITE_LIMIT, PLAYLIST_WRITE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { id: playlistId } = await params
  const body = await req.json().catch(() => null)
  const rawName = typeof body?.name === 'string' ? body.name.trim() : null
  const rawDescription = typeof body?.description === 'string' ? body.description.trim() : null

  if (rawName === null && rawDescription === null) {
    return NextResponse.json({ error: 'Name or description is required.' }, { status: 400 })
  }
  if (rawName !== null && (rawName.length === 0 || rawName.length > NAME_MAX)) {
    return NextResponse.json({ error: `Name must be 1–${NAME_MAX} characters.` }, { status: 400 })
  }
  if (rawDescription !== null && rawDescription.length > DESCRIPTION_MAX) {
    return NextResponse.json({ error: `Description must be at most ${DESCRIPTION_MAX} characters.` }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('playlists')
    .select('platform_id')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .eq('platform', 'spotify')
    .single()

  if (!row) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })

  const token = await ensureValidToken(user.id, 'spotify')
  if (!token) return NextResponse.json({ error: 'Spotify not connected' }, { status: 400 })

  const spotifyBody: Record<string, string> = {}
  if (rawName !== null) spotifyBody.name = rawName
  if (rawDescription !== null) spotifyBody.description = rawDescription

  try {
    const resp = await fetchWithRetry(`https://api.spotify.com/v1/playlists/${row.platform_id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(spotifyBody),
    })

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.warn(`Playlist detay güncelleme başarısız: ${resp.status} ${detail.slice(0, 160)}`)
      return NextResponse.json({ error: 'Spotify update failed' }, { status: 502 })
    }
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json({ error: 'Spotify is busy right now, try again in a bit.' }, { status: 429 })
    }
    throw err
  }

  // Spotify PUT boş gövde döner (204) — yerel tabloya biz yazıyoruz.
  // ⚠ Supabase'in üretilmiş tipleri `update()`e serbest `Record<string,
  // string>` kabul etmiyor (fazla alan reddi) — iki dal ayrı çağrılır.
  const localUpdate: { name?: string; description?: string } = {}
  if (rawName !== null) localUpdate.name = rawName
  if (rawDescription !== null) localUpdate.description = rawDescription

  await supabase.from('playlists').update(localUpdate).eq('id', playlistId)

  return NextResponse.json({ success: true, ...localUpdate })
}
