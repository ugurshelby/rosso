import 'server-only'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/server'
import { uploadSpotifyPlaylistCover } from './spotify-target'

/**
 * Playlist kapağı — sıkıştırma + kalıcı Storage kopyası + Spotify'a itme.
 *
 * ★ Neden burada sıkıştırma tekrar yapılıyor (istemci zaten küçültüyor):
 * Spotify'ın sözleşmesi katı (base64 sonrası 256 KB) ve istemci `canvas`
 * tahminleri (JPEG kalitesi → byte boyutu) tarayıcıdan tarayıcıya sapabilir.
 * Sunucu tarafı `sharp` ile GERÇEK boyutu ölçüp gerekirse tekrar küçültmek,
 * "arttıramıyorsak güvenli sınıra düşürelim" isteğinin kesin garantisi —
 * istemci ne gönderirse göndersin Spotify'a giden veri her zaman sınır altı.
 */

const SPOTIFY_BASE64_LIMIT = 256 * 1024
const BUCKET = 'catalog-images'

/** Base64 (data URI veya çıplak) JPEG buffer'a çevirir. */
function decodeBase64Image(input: string): Buffer {
  const raw = input.includes(',') ? input.slice(input.indexOf(',') + 1) : input
  return Buffer.from(raw, 'base64')
}

/**
 * Verilen JPEG buffer'ı, base64'e çevrildiğinde Spotify'ın 256 KB sınırının
 * altında kalacak şekilde iteratif olarak küçültür (önce kalite, sonra boyut).
 */
async function compressUnderSpotifyLimit(buffer: Buffer): Promise<Buffer | null> {
  let quality = 82
  let width = 1000
  for (let attempt = 0; attempt < 8; attempt++) {
    const out = await sharp(buffer)
      // `withoutEnlargement` — zaten küçük olan bir kaynağı (ör. 600×600
      // kolaj) gereksiz yere büyütüp kaliteyi/boyutu boşa harcamasın.
      .resize(width, width, { fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()
    const base64Len = Math.ceil(out.length / 3) * 4
    if (base64Len <= SPOTIFY_BASE64_LIMIT) return out
    // Önce kaliteyi düşür, kalite tabana vurunca boyutu küçült.
    if (quality > 40) {
      quality -= 12
    } else {
      width = Math.round(width * 0.8)
      quality = 60
    }
    if (width < 200) break
  }
  return null
}

/** Track kapaklarından 2x2 kolaj üretir (Spotify'ın kendi varsayılan davranışının Rosso karşılığı). */
async function buildCollage(imageUrls: string[]): Promise<Buffer | null> {
  const urls = imageUrls.slice(0, 4)
  if (urls.length === 0) return null

  const tiles: Buffer[] = []
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      tiles.push(await sharp(buf).resize(300, 300, { fit: 'cover' }).toBuffer())
    } catch {
      // tek kapak indirilemezse atla, kalanlarla devam
    }
  }
  if (tiles.length === 0) return null

  // 4'ten azsa tek büyük kapak yeter — yapay 2x2 boşluk bırakmak yerine.
  if (tiles.length < 4) {
    return sharp(tiles[0]).resize(600, 600, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()
  }

  const canvas = sharp({
    create: { width: 600, height: 600, channels: 3, background: { r: 10, g: 10, b: 15 } },
  })
  const composite = await canvas
    .composite([
      { input: tiles[0]!, left: 0, top: 0 },
      { input: tiles[1]!, left: 300, top: 0 },
      { input: tiles[2]!, left: 0, top: 300 },
      { input: tiles[3]!, left: 300, top: 300 },
    ])
    .jpeg({ quality: 85 })
    .toBuffer()
  return composite
}

export interface ApplyCoverResult {
  /** Rosso'nun kendi Storage kopyasının kalıcı URL'i — `playlists.cover_url`'e yazılır. */
  coverUrl: string | null
  /** Spotify'a yükleme başarılı oldu mu (kritik değil, yalnız bilgi amaçlı). */
  spotifyUploaded: boolean
}

/**
 * Kullanıcının seçtiği kapağı (varsa) ya da track kapaklarından üretilen
 * kolajı (yoksa) hem Rosso Storage'ına hem Spotify'a uygular.
 *
 * Hata YUTULUR (kapak süstür, playlist'in kendisi değil) — `spotify-target.ts`
 * içindeki `uploadSpotifyPlaylistCover`'ın gerekçesiyle aynı.
 */
export async function applyPlaylistCover(
  userId: string,
  spotifyPlaylistId: string,
  userCoverDataUri: string | undefined,
  fallbackTrackImageUrls: string[],
): Promise<ApplyCoverResult> {
  try {
    const sourceBuffer = userCoverDataUri
      ? decodeBase64Image(userCoverDataUri)
      : await buildCollage(fallbackTrackImageUrls)
    if (!sourceBuffer) return { coverUrl: null, spotifyUploaded: false }

    const compressed = await compressUnderSpotifyLimit(sourceBuffer)
    if (!compressed) return { coverUrl: null, spotifyUploaded: false }

    const supabase = await createServiceClient()
    const storagePath = `playlists/${spotifyPlaylistId}.jpg`
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, compressed, { contentType: 'image/jpeg', upsert: true })

    const coverUrl = uploadErr
      ? null
      : supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl

    const spotifyUploaded = await uploadSpotifyPlaylistCover(
      userId,
      spotifyPlaylistId,
      compressed.toString('base64'),
    )

    return { coverUrl, spotifyUploaded }
  } catch {
    return { coverUrl: null, spotifyUploaded: false }
  }
}
