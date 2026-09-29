/**
 * İstemci tarafı kapak sıkıştırma — Spotify'ın 256 KB (base64 sonrası) katı
 * sınırını, dosyayı REDDETMEK yerine otomatik küçültüp sığdırarak aşar
 * (Sahip, 2026-09-16: "arttıramıyorsak çözünürlüğü otomatik güvenli sınıra
 * düşürüp ekleyelim"). Spotify'ın kendi sınırı yükseltilemez (üçüncü taraf
 * API kısıtı) — bu yüzden istemci tarafında telafi ediliyor.
 *
 * Sunucu tarafında `web/src/lib/playlists/cover.ts` AYNI garantiyi `sharp`
 * ile tekrar uygular (istemci tahmini sapabilir) — bu yalnızca hızlı önizleme
 * ve küçük yükleme payload'ı için.
 */

const SPOTIFY_BASE64_LIMIT = 256 * 1024

function base64Length(dataUri: string): number {
  const comma = dataUri.indexOf(',')
  return comma === -1 ? dataUri.length : dataUri.length - comma - 1
}

/** Dosyayı canvas üzerinden JPEG'e çevirip 256 KB base64 sınırının altına küçültür. */
export async function compressCoverImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  let size = Math.min(1000, Math.max(bitmap.width, bitmap.height))
  let quality = 0.85

  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')

    // Kare kırp (cover fit) — Spotify kapakları zaten kare gösteriyor.
    const scale = Math.max(size / bitmap.width, size / bitmap.height)
    const dw = bitmap.width * scale
    const dh = bitmap.height * scale
    ctx.drawImage(bitmap, (size - dw) / 2, (size - dh) / 2, dw, dh)

    const dataUri = canvas.toDataURL('image/jpeg', quality)
    if (base64Length(dataUri) <= SPOTIFY_BASE64_LIMIT) return dataUri

    if (quality > 0.5) {
      quality -= 0.12
    } else {
      size = Math.round(size * 0.8)
      quality = 0.7
    }
  }
  // Son çare: en küçük/en düşük kalite denemesi ne çıktıysa onu döndür —
  // sunucu tarafı `cover.ts` yine de kesin garantiyi uygulayacak.
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  const scale = Math.max(200 / bitmap.width, 200 / bitmap.height)
  ctx.drawImage(bitmap, (200 - bitmap.width * scale) / 2, (200 - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale)
  return canvas.toDataURL('image/jpeg', 0.5)
}
