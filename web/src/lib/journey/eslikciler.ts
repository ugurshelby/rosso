/**
 * Journey "eşlikçiler" paketi (migration 0362) — tipler ve saf yardımcılar.
 * Sunucu ve istemci ortak (server-only DEĞİL).
 *
 * Sahip (2026-10-04): "İlk/son dinleme hiçbir şey; asıl olay obsesif olduğum albüm,
 * sanatçı ve şarkılar — hayatımın belli dönemlerinde bana eşlik edenler. Her yıl dolu
 * olmalı." Bu modül yılı kendi eşlikçileriyle anlatacak malzemeyi hazırlar.
 */

export interface EslikciSanatci {
  name: string
  plays: number
  minutes?: number
  imageUrl: string | null
}

export interface EslikciAlbum {
  album: string
  artist: string
  plays: number
  imageUrl: string | null
}

export interface EslikciSarki {
  trackId: string
  title: string
  artist: string
  album?: string | null
  imageUrl: string | null
  plays: number
}

export interface EslikciAy {
  /** 1–12 */
  month: number
  /** O aydaki toplam dinleme. */
  plays: number
  /** Ayın baskın şarkısı. */
  track: EslikciSarki
}

export interface EslikciYil {
  year: number
  plays: number
  minutes: number
  activeMonths: number
  topArtists: EslikciSanatci[]
  topAlbums: EslikciAlbum[]
  topTracks: EslikciSarki[]
  months: EslikciAy[]
  /** Yılın tek bir ayda en çok dönülen şarkısı. */
  yogunAy: (EslikciSarki & { month: number }) | null
}

export interface OmurSanatci extends EslikciSanatci {
  firstYear: number
  lastYear: number
  yearsActive: number
}

export interface KalanSarki extends EslikciSarki {
  years: number[]
}

export interface JourneyEslikcileri {
  years: EslikciYil[]
  lifetime: { artists: OmurSanatci[]; enduring: KalanSarki[] }
}

/** Bir yılın kendi bölümünü taşıyacak kadar dolu olması için eşikler. */
export const DOLU_YIL_EN_AZ_DINLEME = 300
export const DOLU_YIL_EN_AZ_AY = 3

/**
 * Yıl kendi bölümünü "dolu" taşıyabilir mi? 2017'de 10, 2019'da 49 dinleme gibi
 * kullanımdan önceki kırıntılar ayrı bir yıl gibi sunulunca Journey boş görünüyordu.
 */
export function doluYilMi(y: Pick<EslikciYil, 'plays' | 'activeMonths'>): boolean {
  return y.plays >= DOLU_YIL_EN_AZ_DINLEME && y.activeMonths >= DOLU_YIL_EN_AZ_AY
}

export interface Donem {
  /** Başlangıç ve bitiş ayı (1–12, dahil). */
  from: number
  to: number
  artist: string
  /** Dönemin en çok dinlenen şarkısı (kapak bunun). */
  track: EslikciSarki
}

/**
 * Ardışık aylarda baskın şarkının sanatçısı aynıysa tek "dönem" olur:
 * "Ocak–Mart · Dedublüman". Ay atlanırsa (dinleme yoksa) dönem kopar.
 */
export function donemler(aylar: EslikciAy[]): Donem[] {
  const sirali = aylar.slice().sort((a, b) => a.month - b.month)
  const cikti: Donem[] = []
  for (const ay of sirali) {
    const son = cikti[cikti.length - 1]
    const ayniSanatci = son && normal(son.artist) === normal(ay.track.artist) && son.to === ay.month - 1
    if (ayniSanatci) {
      son.to = ay.month
      if (ay.track.plays > son.track.plays) son.track = ay.track
    } else {
      cikti.push({ from: ay.month, to: ay.month, artist: ay.track.artist, track: ay.track })
    }
  }
  return cikti
}

function normal(s: string): string {
  return s.toLocaleLowerCase('tr-TR').trim()
}

/** Ay adı (kısa/uzun) seçili dilde. */
export function ayAdi(month: number, locale: string, bicim: 'short' | 'long' = 'short'): string {
  const d = new Date(Date.UTC(2024, Math.min(Math.max(month, 1), 12) - 1, 15))
  return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { month: bicim, timeZone: 'UTC' })
}

/** "Oca–Mar" ya da tek ay için "Nis". */
export function donemEtiketi(d: Pick<Donem, 'from' | 'to'>, locale: string): string {
  return d.from === d.to ? ayAdi(d.from, locale) : `${ayAdi(d.from, locale)}–${ayAdi(d.to, locale)}`
}

// ── Ham paket → tip ────────────────────────────────────────────────────────────

type Ham = Record<string, unknown>
const sayi = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const metin = (v: unknown): string => (typeof v === 'string' ? v : '')
const resim = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
const dizi = (v: unknown): Ham[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Ham[]) : [])

function sarki(h: Ham): EslikciSarki {
  return {
    trackId: metin(h.track_id),
    title: metin(h.title),
    artist: metin(h.artist),
    album: typeof h.album === 'string' ? h.album : null,
    imageUrl: resim(h.image_url),
    plays: sayi(h.plays ?? h.track_plays),
  }
}

export function eslikcileriCoz(payload: unknown): JourneyEslikcileri | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Ham
  const years: EslikciYil[] = dizi(p.years).map((y) => ({
    year: sayi(y.year),
    plays: sayi(y.plays),
    minutes: sayi(y.minutes),
    activeMonths: sayi(y.active_months),
    topArtists: dizi(y.top_artists).map((a) => ({
      name: metin(a.name),
      plays: sayi(a.plays),
      minutes: sayi(a.minutes),
      imageUrl: resim(a.image_url),
    })),
    topAlbums: dizi(y.top_albums).map((a) => ({
      album: metin(a.album),
      artist: metin(a.artist),
      plays: sayi(a.plays),
      imageUrl: resim(a.image_url),
    })),
    topTracks: dizi(y.top_tracks).map(sarki),
    months: dizi(y.months).map((m) => ({
      month: sayi(m.month),
      plays: sayi(m.plays),
      track: { ...sarki(m), plays: sayi(m.track_plays) },
    })),
    yogunAy:
      y.yogun_ay && typeof y.yogun_ay === 'object'
        ? { ...sarki(y.yogun_ay as Ham), month: sayi((y.yogun_ay as Ham).month) }
        : null,
  }))
  const l = (p.lifetime && typeof p.lifetime === 'object' ? p.lifetime : {}) as Ham
  return {
    years: years.filter((y) => y.year > 0).sort((a, b) => a.year - b.year),
    lifetime: {
      artists: dizi(l.artists).map((a) => ({
        name: metin(a.name),
        plays: sayi(a.plays),
        imageUrl: resim(a.image_url),
        firstYear: sayi(a.first_year),
        lastYear: sayi(a.last_year),
        yearsActive: sayi(a.years_active),
      })),
      enduring: dizi(l.enduring).map((e) => ({
        ...sarki(e),
        years: Array.isArray(e.years) ? (e.years as unknown[]).map(sayi).filter((n) => n > 0) : [],
      })),
    },
  }
}
