/**
 * FAZ PLAYLIST-KLASÖR: playlist listesini yıl klasörlerine böler.
 *
 * Ay+yıl içeren playlist'ler ("2021 · Ağustos") yıl gruplarına; içermeyenler
 * ("2021" yıllık, "RÜYA" rastgele) tek bir "klasörsüz" listeye. Yıllar azalan
 * (en yeni üstte), her yıl içinde aylar ay indeksine göre artan sıralanır.
 */
import type { PlaylistCardData } from './playlist-card'
import { parseMonthFolder } from './parse-month-folder'

export interface YearFolder {
  /** Yıl anahtarı ("2021") — accordion state ve key için. */
  year: string
  /** O yıla ait aylık playlist'ler, ay indeksine göre artan (Ocak→Aralık). */
  playlists: PlaylistCardData[]
}

export interface GroupedPlaylists {
  /** Yıl klasörleri, en yeni yıl üstte. */
  folders: YearFolder[]
  /** Ay+yıl kalıbına uymayan playlist'ler (yıllık, rastgele isim). */
  unfoldered: PlaylistCardData[]
}

/**
 * @param playlists Filtrelenmiş/sıralanmış playlist listesi (arama sonrası).
 *   ⚠ unfoldered'ın kendi iç sırası KORUNUR — çağıran tarafın sıralaması geçerli.
 */
export function groupByYear(playlists: PlaylistCardData[]): GroupedPlaylists {
  const byYear = new Map<string, { p: PlaylistCardData; month: number }[]>()
  const unfoldered: PlaylistCardData[] = []

  for (const p of playlists) {
    const match = parseMonthFolder(p.name)
    if (!match) {
      unfoldered.push(p)
      continue
    }
    const bucket = byYear.get(match.year) ?? []
    bucket.push({ p, month: match.month })
    byYear.set(match.year, bucket)
  }

  const folders: YearFolder[] = [...byYear.entries()]
    // En yeni yıl üstte (azalan).
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, items]) => ({
      year,
      // Yıl içinde aylar artan (Ocak→Aralık).
      playlists: items.sort((a, b) => a.month - b.month).map((it) => it.p),
    }))

  return { folders, unfoldered }
}

/** Herhangi bir ay+yıl playlist'i var mı? Toggle'ı göstermeye karar için. */
export function hasFoldablePlaylists(playlists: PlaylistCardData[]): boolean {
  return playlists.some((p) => parseMonthFolder(p.name) !== null)
}
