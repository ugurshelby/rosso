import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * A8 — Playlist büyüme serisi.
 * Plan: docs/plans/02-zip-verisi-urune-baglama.md → P1
 *
 * DB tarafı hazır (migration 0177 + forward-fix 0178): ay başına eklenen +
 * kümülatif toplam. Kümülatif DB'de hesaplanır — istemciye 7.614 satır değil,
 * ay başına tek satır iner.
 *
 * ⚠ **Eşleşme kısmi.** Spotify export'unda playlist URI'si yok; `playlist_uri`
 * alanı aslında playlist ADIdır (bkz. 0180). Adı export'ta geçmeyen listede
 * seri BOŞ döner — o zaman hiçbir şey render edilmez ("veri yoksa özellik yok").
 */

export interface GrowthPoint {
  /** Ayın ilk günü (YYYY-MM-DD). */
  month: string
  /** O ay eklenen şarkı sayısı. */
  added: number
  /** O ayın sonundaki toplam. */
  cumulative: number
}

interface RawGrowthRow {
  month: string
  added_count: number
  cumulative_count: number
}

function toPoints(data: unknown): GrowthPoint[] {
  if (!Array.isArray(data)) return []
  return (data as RawGrowthRow[]).map((r) => ({
    month: r.month,
    added: Number(r.added_count),
    cumulative: Number(r.cumulative_count),
  }))
}

/**
 * Tek bir playlist'in büyümesi — playlist **ID**'si ile (migration 0182).
 *
 * ⚠ ID ile çağırmak şart: RPC'nin iki imzası var ve eski `(uuid, text)`
 * yalnız `playlist_uri` sütununa birebir bakıyor. O sütun Spotify export'unda
 * kimi satırda ad, kimi satırda URI tuttuğu için tek değerle 112 listeden
 * ancak 21'i eşleşiyordu; ID'li imza ikisini birden dener → 30.
 */
export async function getPlaylistGrowth(
  userId: string,
  playlistId: string,
): Promise<GrowthPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('playlist_growth_series', {
    p_user_id: userId,
    p_playlist_id: playlistId,
  })

  if (error) return []
  return toPoints(data)
}

/**
 * Kullanıcının TÜM kütüphanesinin büyümesi — playlist ayrımı yapmadan.
 * Eşleştirme sorunundan etkilenmez: hiçbir listeye bağlanmayan satırlar da
 * sayılır, çünkü soru "hangi liste" değil "ne zaman şarkı biriktirdim".
 */
export async function getLibraryGrowth(userId: string): Promise<GrowthPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('playlist_growth_series', {
    p_user_id: userId,
    // Parametreyi atlamak = SQL DEFAULT NULL = tüm playlist'ler.
  })

  if (error) return []
  return toPoints(data)
}

/**
 * Grafiği çizmeye değer mi?
 *
 * Tek noktalı bir "eğri" çizgi değil, bir nokta — ve iki nokta da bir hikâye
 * anlatmaz. Anlatı ancak birkaç ayda bir şekil kazanır; eşiğin altında
 * grafik yerine hiçbir şey göstermeyiz.
 */
export const MIN_GROWTH_POINTS = 3

export function hasGrowthStory(series: GrowthPoint[]): boolean {
  return series.length >= MIN_GROWTH_POINTS
}

/**
 * Serinin en hareketli ayı — grafikte tek vurgulanan nokta.
 *
 * Neden yalnız BİR tane: §3.1 "bir viewport'ta TEK bağıran vurgu". Beş tepe
 * işaretlersek hiçbiri tepe olmaz.
 *
 * Beraberlikte SON ay kazanır: aynı sayıda eklenen iki ay varsa, yakın olan
 * kullanıcı için daha anlamlıdır.
 */
export function peakMonth(series: GrowthPoint[]): GrowthPoint | null {
  if (series.length === 0) return null
  return series.reduce((best, p) => (p.added >= best.added ? p : best), series[0])
}

const AYLAR = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

/** "2024-07-01" → "Temmuz 2024". Tarih değil, anlatı etiketi. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  const idx = Number(m) - 1
  if (!y || Number.isNaN(idx) || idx < 0 || idx > 11) return month
  return `${AYLAR[idx]} ${y}`
}
