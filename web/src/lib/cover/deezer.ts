import { normalizeArtistName } from '@/lib/catalog/normalize-artist-name'

/**
 * Deezer kapak/görsel çözümleyici (2026-09-24, Sahip §14).
 *
 * Spotify bağlantısı OLMAYAN (yalnız ZIP yükleyen) kullanıcının kapakları için
 * yedek kaynak. Deezer herkese açık API'dir: kullanıcı token'ı ya da kota
 * kimliği gerekmez, hızlıdır. Bu modül YALNIZ arar ve doğrular; yazma
 * (`catalog-cache.ts`) ve öncelik kuralı (Spotify > Deezer, DB tetikleyicisi 0349)
 * başka yerde.
 *
 * ⚠ YANLIŞ KAPAK, KAPAKSIZLIKTAN KÖTÜDÜR (Spotify köprüsündeki ders, 2026-07-20).
 *   ISRC eşleşmesi kesindir; başlık+sanatçı aramasında ikisi de NORMALİZE
 *   edilmiş hâlde eşleşmiyorsa `null` döner — ilk sonucu "yaklaşık" almayız.
 * ⚠ Hata sözleşmesi: `null` = Deezer'da KESİN yok (çağıran "denendi" damgası vurur);
 *   fırlatma (`DeezerGeciciHata`) = ağ/zaman aşımı/kota — damga VURULMAZ, sonra
 *   yeniden denenir.
 */

const API = 'https://api.deezer.com'
const ZAMAN_ASIMI_MS = 4000

/** Deezer CDN kapağı: md5 dolu olmalı (boş md5 = "kapak yok" yer tutucusu). */
const KAPAK_URL_RE = /^https:\/\/(?:cdn-images|e-cdns-images)\.dzcdn\.net\/images\/(?:cover|artist)\/[0-9a-f]{32}\//i

export class DeezerGeciciHata extends Error {
  constructor(mesaj: string) {
    super(mesaj)
    this.name = 'DeezerGeciciHata'
  }
}

/** Geçerli bir Deezer görsel URL'i mi? (yer tutucu ve yabancı alan adı reddedilir) */
export function gecerliDeezerGorseli(url: unknown): string | null {
  return typeof url === 'string' && KAPAK_URL_RE.test(url) ? url : null
}

/** Ses/harf farkını yok say: aksan sil, küçült, noktalama boşluk. */
function katla(metin: string): string {
  return metin
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Şarkı başlığı karşılaştırma anahtarı: parantez/köşeli içerik ve " - Remastered
 * 2011", " - Live", " - Mono" gibi sürüm ekleri atılır ("Let It Happen" ==
 * "Let It Happen - Remastered 2015").
 */
export function baslikAnahtari(baslik: string): string {
  const govde = baslik
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\s+-\s+(?:.*(?:remaster|version|mono|stereo|live|edit|mix|radio|deluxe|bonus|from|soundtrack).*)$/i, ' ')
  return katla(govde)
}

function sanatciAnahtari(ad: string): string {
  return katla(normalizeArtistName(ad))
}

interface DeezerAlbum {
  cover_big?: string
  cover_xl?: string
}

interface DeezerTrack {
  title?: string
  title_short?: string
  artist?: { name?: string }
  album?: DeezerAlbum
  error?: unknown
}

async function getir(yol: string, fetchImpl: typeof fetch): Promise<unknown> {
  let res: Response
  try {
    res = await fetchImpl(`${API}${yol}`, { signal: AbortSignal.timeout(ZAMAN_ASIMI_MS) })
  } catch (err) {
    throw new DeezerGeciciHata(err instanceof Error ? err.message : String(err))
  }
  if (res.status >= 500 || res.status === 429) throw new DeezerGeciciHata(`HTTP ${res.status}`)
  if (!res.ok) return null
  const govde = (await res.json().catch(() => null)) as { error?: { code?: number; type?: string } } | null
  // Deezer hataları HTTP 200 + {"error": {...}} döner. Kota = geçici; diğerleri (veri yok) = kesin.
  if (govde && typeof govde === 'object' && 'error' in govde && govde.error) {
    if (govde.error.code === 4 || govde.error.type === 'Exception') {
      throw new DeezerGeciciHata(`Deezer hatası: ${JSON.stringify(govde.error).slice(0, 120)}`)
    }
    return null
  }
  return govde
}

export interface DeezerKapak {
  url: string
  /** 'isrc' = kesin eşleşme; 'arama' = normalize başlık+sanatçı eşleşmesi. */
  kaynak: 'isrc' | 'arama'
}

export interface SarkiGirdisi {
  isrc?: string | null
  title: string
  artists: readonly string[]
}

/**
 * Bir şarkının albüm kapağı. Önce ISRC (kesin), sonra başlık+sanatçı araması.
 * `null` = kesin yok; `DeezerGeciciHata` = tekrar denenmeli.
 */
export async function deezerSarkiKapagi(
  girdi: SarkiGirdisi,
  fetchImpl: typeof fetch = fetch,
): Promise<DeezerKapak | null> {
  if (girdi.isrc && /^[A-Za-z0-9]{12}$/.test(girdi.isrc)) {
    const t = (await getir(`/track/isrc:${girdi.isrc}`, fetchImpl)) as DeezerTrack | null
    const url = gecerliDeezerGorseli(t?.album?.cover_big) ?? gecerliDeezerGorseli(t?.album?.cover_xl)
    if (url) return { url, kaynak: 'isrc' }
  }

  const sanatci = girdi.artists[0]
  if (!sanatci || !girdi.title.trim()) return null

  const q = `artist:"${sanatci.replace(/"/g, '')}" track:"${girdi.title.replace(/"/g, '')}"`
  const sonuc = (await getir(`/search?q=${encodeURIComponent(q)}&limit=8`, fetchImpl)) as
    | { data?: DeezerTrack[] }
    | null

  const hedefBaslik = baslikAnahtari(girdi.title)
  const hedefSanatcilar = new Set(girdi.artists.map(sanatciAnahtari))
  for (const aday of sonuc?.data ?? []) {
    const baslikTamam =
      baslikAnahtari(aday.title ?? '') === hedefBaslik || baslikAnahtari(aday.title_short ?? '') === hedefBaslik
    const sanatciTamam = aday.artist?.name ? hedefSanatcilar.has(sanatciAnahtari(aday.artist.name)) : false
    if (!baslikTamam || !sanatciTamam) continue
    const url = gecerliDeezerGorseli(aday.album?.cover_big) ?? gecerliDeezerGorseli(aday.album?.cover_xl)
    if (url) return { url, kaynak: 'arama' }
  }
  return null
}

/** Sanatçı görseli: ada TAM eşleşen ilk sonuç. `null` = kesin yok. */
export async function deezerSanatciGorseli(
  ad: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!ad.trim()) return null
  const sonuc = (await getir(
    `/search/artist?q=${encodeURIComponent(`"${ad.replace(/"/g, '')}"`)}&limit=8`,
    fetchImpl,
  )) as { data?: Array<{ name?: string; picture_big?: string; picture_xl?: string }> } | null

  const hedef = sanatciAnahtari(ad)
  for (const a of sonuc?.data ?? []) {
    if (!a.name || sanatciAnahtari(a.name) !== hedef) continue
    const url = gecerliDeezerGorseli(a.picture_big) ?? gecerliDeezerGorseli(a.picture_xl)
    if (url) return url
  }
  return null
}
