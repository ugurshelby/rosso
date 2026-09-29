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
export const maxDuration = 60

type RouteParams = { params: Promise<{ id: string }> }

// Aynı sınır ekle/çıkar/detay route'larıyla — Spotify'a yazan bir işlem.
const PLAYLIST_WRITE_LIMIT = 20
const PLAYLIST_WRITE_WINDOW_MS = 60_000

/**
 * Şarkı sıralaması — tek adım yukarı/aşağı taşıma, Spotify
 * `PUT /playlists/{id}/tracks` (reorder modu: `range_start`/`insert_before`/
 * `range_length` — `uris` alanı DEĞİL, `/tracks` route'undaki replace/
 * add-remove'dan tamamen ayrı bir kullanım şekli).
 *
 * Sahip (2026-08-11): hero menüsündeki hayalet senkron paneli yerine
 * gerçek playlist yönetimi — sıralama üçüncü parça.
 *
 * ⚠ TEK ADIM: UI yukarı/aşağı ok kullanıyor (sürükle-bırak değil — mobil
 * dokunmatikte daha zor, ok erişilebilirlik açısından daha basit, bkz. plan
 * notu). Spotify'ın reorder formülü:
 *   yukarı (i → i-1):  range_start=i, insert_before=i-1, range_length=1
 *   aşağı  (i → i+1):  range_start=i, insert_before=i+2, range_length=1
 * (insert_before "bu indeksten ÖNCEYE koy" anlamına gelir — kaydırılan öğe
 * çıkarıldıktan SONRAKİ diziye göre; aşağı taşımada +2 gerekir çünkü hedef
 * kendisinden sonraki öğenin YERİNE değil ONUN SONRASINA gitmeli.)
 *
 * Yazma başarılıysa `playlist_tracks.position` DB'de de senkron edilir
 * (aksi hâlde büyüme grafiği/track_added_at eşleşmesi ve sayfanın kendi
 * `order('position')` sorgusu bozulur — bkz. `page.tsx`).
 */
export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`playlist-write:${user.id}`, PLAYLIST_WRITE_LIMIT, PLAYLIST_WRITE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { id: playlistId } = await params
  const body = await req.json().catch(() => null)
  const position = typeof body?.position === 'number' ? body.position : null
  const direction = body?.direction === 'up' || body?.direction === 'down' ? body.direction : null

  if (position === null || !Number.isInteger(position) || position < 0) {
    return NextResponse.json({ error: 'Invalid position.' }, { status: 400 })
  }
  if (!direction) {
    return NextResponse.json({ error: 'Invalid direction.' }, { status: 400 })
  }
  if (direction === 'up' && position === 0) {
    return NextResponse.json({ error: 'Already at the top.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('playlists')
    .select('platform_id, track_count, snapshot_id')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .eq('platform', 'spotify')
    .single()

  if (!row) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })

  const trackCount = row.track_count ?? 0
  if (direction === 'down' && position >= trackCount - 1) {
    return NextResponse.json({ error: 'Zaten en altta.' }, { status: 400 })
  }

  const token = await ensureValidToken(user.id, 'spotify')
  if (!token) return NextResponse.json({ error: 'Spotify not connected' }, { status: 400 })

  const insertBefore = direction === 'up' ? position - 1 : position + 2

  let snapshotId: string
  try {
    const resp = await fetchWithRetry(`https://api.spotify.com/v1/playlists/${row.platform_id}/tracks`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        range_start: position,
        insert_before: insertBefore,
        range_length: 1,
      }),
    })

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.warn(`Playlist sıralama başarısız: ${resp.status} ${detail.slice(0, 160)}`)
      return NextResponse.json({ error: 'Spotify reorder failed' }, { status: 502 })
    }

    const data = (await resp.json()) as { snapshot_id: string }
    snapshotId = data.snapshot_id
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json({ error: 'Spotify is busy right now, try again in a bit.' }, { status: 429 })
    }
    throw err
  }

  // DB tarafında iki satırın pozisyonunu takas et — Spotify tarafında da
  // tam olarak bu iki öğe yer değiştirdi (range_length=1).
  //
  // ⚠ Ölçüldü (pg_constraint): `playlist_tracks` hem `PRIMARY KEY
  // (playlist_id, track_id)` hem `UNIQUE (playlist_id, position)` taşıyor.
  // İkinci kısıt yüzünden iki satırı TEK adımda doğrudan takas etmek
  // (`position=swapWith` / `position=position`) aynı transaction içinde
  // geçici bir çakışmaya (iki satır aynı anda aynı position) düşebilir —
  // bu yüzden üç adımlı geçici değer (-1) yolu kullanılıyor.
  const swapWith = direction === 'up' ? position - 1 : position + 1
  const TEMP_POSITION = -1

  await supabase
    .from('playlist_tracks')
    .update({ position: TEMP_POSITION })
    .eq('playlist_id', playlistId)
    .eq('position', position)

  await supabase
    .from('playlist_tracks')
    .update({ position })
    .eq('playlist_id', playlistId)
    .eq('position', swapWith)

  await supabase
    .from('playlist_tracks')
    .update({ position: swapWith })
    .eq('playlist_id', playlistId)
    .eq('position', TEMP_POSITION)

  await supabase.from('playlists').update({ snapshot_id: snapshotId }).eq('id', playlistId)

  return NextResponse.json({ success: true, snapshot_id: snapshotId })
}
