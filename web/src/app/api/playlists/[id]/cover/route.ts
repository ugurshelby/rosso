import { type NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
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

// Kapak yükleme de bir Spotify yazma işlemi — aynı `playlist-write` sınırı.
const PLAYLIST_WRITE_LIMIT = 20
const PLAYLIST_WRITE_WINDOW_MS = 60_000

/** Kullanıcı yüklemesi için üst sınır — sıkıştırma öncesi, kaba bir güvenlik
 * kapısı (aşırı büyük dosyayla sharp'ı meşgul etmemek). */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

/**
 * Playlist kapak yükleme — kullanıcının kendi görselini Spotify'a yazar.
 *
 * Sahip (2026-08-11): hero menüsündeki hayalet senkron paneli yerine
 * gerçek playlist yönetimi. Spotify KISITI (§1.5, `mood-cover-upload.ts`
 * ile aynı ölçüm): `PUT /playlists/{id}/images` yalnız base64 JPEG kabul
 * eder, ~256 KB tavan (base64 SONRASI). Aynı 640px + JPEG q78 tarifi
 * kullanılıyor — kaynak burada sabit bir vibe-cards dosyası değil,
 * kullanıcının yüklediği rastgele görsel (`sharp` her formatı JPEG'e çevirir).
 *
 * Spotify `images` uç noktası URL DÖNDÜRMEZ (204 boş gövde) — CDN'in kendi
 * görseli işlemesi birkaç saniye sürebilir. Yerel kapağı hemen senkronlamak
 * yerine NULL'a çekiyoruz — iki AYRI sütun var (ölçüldü, `information_schema`):
 *   `cover_url`  → hero'nun DOĞRUDAN bastığı hazır URL (`page.tsx`→ `<img>`).
 *   `image_url`  → `/api/images/playlist/[id]` proxy'sinin cache alanı,
 *                  `CoverArt kind="playlist"` (lazy) bunu okur.
 * İkisi de NULL olmazsa hero eski `cover_url`'i basmaya devam eder (proxy
 * hiç devreye girmez) YA DA proxy eski `image_url` cache'ini döner — ikisi
 * de yüklenen görseli göstermez. İkisini birden temizlemek hero'yu `CoverArt`
 * lazy yoluna düşürür, o da `image_url` boş olduğu için Spotify'dan taze çeker.
 */
export async function PUT(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = checkRateLimit(`playlist-write:${user.id}`, PLAYLIST_WRITE_LIMIT, PLAYLIST_WRITE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { id: playlistId } = await params

  const formData = await req.formData().catch(() => null)
  const file = formData?.get('cover')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'An image is required.' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are accepted.' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image is too large (12 MB max).' }, { status: 400 })
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

  let base64: string
  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const jpeg = await sharp(bytes)
      .resize(640, 640, { fit: 'cover' })
      .jpeg({ quality: 78, progressive: false })
      .toBuffer()
    base64 = jpeg.toString('base64')
  } catch {
    return NextResponse.json({ error: 'Image couldn’t be processed — the file may be corrupt.' }, { status: 400 })
  }

  try {
    const resp = await fetchWithRetry(`https://api.spotify.com/v1/playlists/${row.platform_id}/images`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
      body: base64,
    })

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.warn(`Playlist kapak yükleme başarısız: ${resp.status} ${detail.slice(0, 160)}`)
      return NextResponse.json({ error: 'Spotify cover upload failed' }, { status: 502 })
    }
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json({ error: 'Spotify is busy right now, try again in a bit.' }, { status: 429 })
    }
    throw err
  }

  // CDN'in yeni görseli işlemesi zaman alır — iki kapak sütununu da NULL'a
  // çekip lazy `CoverArt` yoluna düşürüyoruz (bkz. dosya üstü not).
  await supabase.from('playlists').update({ cover_url: null, image_url: null }).eq('id', playlistId)

  return NextResponse.json({ success: true })
}
