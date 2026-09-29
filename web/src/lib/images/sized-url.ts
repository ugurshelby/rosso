/**
 * Görsel URL boyutlandırma — TEK KAYNAK (2026-09-24 performans denetimi).
 *
 * `sizedUrl(url, cssPx)`: bir kapak/sanatçı görselinin, ekranda `cssPx`
 * CSS pikselinde gösterileceğini bilerek, o boyuta en yakın (ondan küçük
 * olmayan) varyantının URL'sini döndürür. Tanımadığı URL'ye DOKUNMAZ.
 *
 * ─── Neden (HAR ölçümü, 2026-09-24) ─────────────────────────────────────
 * 36-48 px'lik satır kapakları için 640×640 orijinaller iniyordu:
 *   • Supabase Storage `object/public` → kapak başına 50-220 KB
 *     (dashboard 20 görsel = 1,9 MB; /gecmis 64 görsel = 4,8 MB)
 *   • Spotify CDN `ab67616d0000b273` (640 px) → kapak başına 60-130 KB
 *     (/gecmis 74 görsel = 4,5 MB; playlist detayı 32 görsel = 2,3 MB)
 * Aynı kapağın 300 px varyantı ~25 KB, Storage transform'u (webp) 2-15 KB.
 *
 * ─── Desteklenen kaynaklar ──────────────────────────────────────────────
 * 1. Kendi Supabase Storage kopyalarımız (`/storage/v1/object/public/`)
 *    → `render/image` transform yolu, 2× DPR, webp (P0/PERF-4, 2026-07-24).
 *    Kaynak 640 px'ten büyük üretilmez.
 * 2. Spotify CDN albüm (`ab67616d0000` + kod) ve sanatçı (`ab6761610000` +
 *    kod) görselleri. Spotify transform desteklemez AMA aynı görselin sabit
 *    boyut varyantlarını URL'deki 4 hanelik kodla sunar:
 *      albüm:   4851 = 64 px · 1e02 = 300 px · b273 = 640 px
 *      sanatçı: f178 = 160 px · 5174 = 320 px · e5eb = 640 px
 *    Playlist (`ab67706c…`) ve mosaic kapaklarının kod tablosu güvenilir
 *    değil → onlara dokunulmaz.
 * 3. Deezer yedek kapakları (0349) — `/<n>x<n>-…jpg` segmenti her boyutu
 *    kabul eder.
 *
 * Fonksiyon İDEMPOTENT'tir: zaten boyutlanmış bir URL'yi tekrar vermek onu
 * bozmaz (Storage render yolu `object/public` içermez; Spotify/Deezer kodu
 * hedefe göre yeniden seçilir). Bu yüzden `CoverArt` sunucudan gelen hazır
 * `src`'ye de güvenle uygular.
 *
 * Kural dosyası: docs/reference/kural-performans.md §2 (Görsel kuralları).
 */

/** Storage transform'unda 2× DPR hedefi, kaynak 640 px tavanı. */
const STORAGE_MAX_PX = 640

const SPOTIFY_HOST_RE = /^https:\/\/(?:i\.scdn\.co|image-cdn-(?:ak|fa)\.spotifycdn\.com)\/image\//

/** Albüm kapağı varyantları, küçükten büyüğe. */
const SPOTIFY_ALBUM = [
  { px: 64, code: '4851' },
  { px: 300, code: '1e02' },
  { px: 640, code: 'b273' },
] as const

/** Sanatçı görseli varyantları, küçükten büyüğe. */
const SPOTIFY_ARTIST = [
  { px: 160, code: 'f178' },
  { px: 320, code: '5174' },
  { px: 640, code: 'e5eb' },
] as const

const SPOTIFY_ALBUM_RE = /\/image\/ab67616d0000(4851|1e02|b273)/
const SPOTIFY_ARTIST_RE = /\/image\/ab6761610000(f178|5174|e5eb)/

const DEEZER_RE = /^(https:\/\/(?:cdn-images|e-cdns-images)\.dzcdn\.net\/images\/(?:cover|artist)\/[0-9a-f]{32}\/)(\d+)x(\d+)(-)/i

/**
 * Sabit-varyantlı CDN'lerde (Spotify) seçim eşiği: gösterim boyutunun
 * 1.5 katı. 2× istemek çoğu 150-300 px kartı 640'a iterdi (tam israfın
 * kendisi); 1.5× retina ekranda gözle ayırt edilemeyen bir yumuşaklıkla
 * 300 px varyantında kalır. Storage transform'u serbest boyut verdiği için
 * orada tam 2× kullanılır.
 */
const FIXED_VARIANT_DENSITY = 1.5

function pickVariant<T extends { px: number; code: string }>(
  table: readonly T[],
  targetPx: number,
): T {
  return table.find((v) => v.px >= targetPx) ?? table[table.length - 1]!
}

export function sizedUrl(url: string, cssPx: number): string {
  if (!url) return url
  const size = Number.isFinite(cssPx) && cssPx > 0 ? cssPx : 64

  // 1. Kendi Storage kopyamız → transform yolu.
  if (url.includes('/storage/v1/object/public/')) {
    const px = Math.min(Math.round(size * 2), STORAGE_MAX_PX)
    return (
      url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
      `?width=${px}&height=${px}&resize=cover&quality=80&format=webp`
    )
  }

  // 2. Spotify CDN sabit varyantları.
  if (SPOTIFY_HOST_RE.test(url)) {
    const target = size * FIXED_VARIANT_DENSITY
    if (SPOTIFY_ALBUM_RE.test(url)) {
      const v = pickVariant(SPOTIFY_ALBUM, target)
      return url.replace(SPOTIFY_ALBUM_RE, `/image/ab67616d0000${v.code}`)
    }
    if (SPOTIFY_ARTIST_RE.test(url)) {
      const v = pickVariant(SPOTIFY_ARTIST, target)
      return url.replace(SPOTIFY_ARTIST_RE, `/image/ab6761610000${v.code}`)
    }
    return url
  }

  // 3. Deezer — serbest boyut, 2× DPR, Deezer'in pratik tavanı 1000.
  const dz = DEEZER_RE.exec(url)
  if (dz) {
    const px = Math.min(Math.round(size * 2), 1000)
    return url.replace(DEEZER_RE, `$1${px}x${px}$4`)
  }

  return url
}
