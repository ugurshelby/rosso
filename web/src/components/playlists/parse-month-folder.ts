/**
 * FAZ PLAYLIST-KLASÖR (Sahip, 2026-07-26): Rosso'nun kendi klasörleme katmanı.
 *
 * Spotify Web API klasörleri döndürmüyor (ölçüldü — resmî doküman: "Folders are
 * not returned through the Web API"). Bu yüzden klasörlemeyi playlist İSMİNDEN
 * çıkarıyoruz. YALNIZ ay+yıl içeren playlist'ler klasörlenir; ay içermeyen
 * (yıllık "2021", rastgele "RÜYA") düz kalır.
 *
 * Tanınan biçimler (Sahibin örnekleri + canlı ölçüm):
 *   "2021 · Ağustos"  ·  "Ağustos 2021"  ·  "November 2023"  ·  "2023 November"
 * Ayraçtan bağımsız: ·, boşluk, tire, virgül serbest.
 *
 * Neden isim eşiği bu kadar geniş: kullanıcı playlist'lerini elle de
 * adlandırabilir (yalnız Rosso'nun ürettiği "yıl · ay" değil). TR + EN ay adları,
 * her iki sıra (yıl-ay ve ay-yıl) desteklenir.
 */

/** 1-tabanlı ay indeksine eşlenen tanınan ay adları (küçük harf, TR + EN). */
const MONTHS: Record<string, number> = {
  // Türkçe
  ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5,
  haziran: 6, temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9,
  ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
  // İngilizce (tam + 3 harf kısaltma)
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
}

/** Ay adı → görüntülenecek Türkçe etiket (klasör içinde tutarlı gösterim için). */
const MONTH_LABELS_TR = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface MonthFolderMatch {
  /** Klasör anahtarı — dört haneli yıl ("2021"). */
  year: string
  /** 1-12 ay indeksi. Grup içi sıralama için. */
  month: number
  /** Tutarlı Türkçe ay etiketi ("Ağustos"). */
  monthLabel: string
}

/**
 * Playlist isminden ay+yıl klasör bilgisi çıkarır.
 *
 * @returns Ay VE yıl birlikte bulunduysa `{year, month, monthLabel}`; aksi hâlde
 *   `null` (yıllık, rastgele isim, yalnız ay, yalnız yıl → klasörlenmez).
 */
export function parseMonthFolder(name: string): MonthFolderMatch | null {
  if (!name) return null

  // Ayraçları (·, tire, virgül, çoklu boşluk) tek boşluğa indir, token'lara böl.
  const tokens = name
    .replace(/[·\-,]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  let month: number | null = null
  let year: string | null = null

  for (const token of tokens) {
    const lower = token.toLocaleLowerCase('tr')
    if (month === null && lower in MONTHS) {
      month = MONTHS[lower]
      continue
    }
    // 4 haneli, makul aralıkta bir yıl (1900-2099).
    if (year === null && /^(19|20)\d{2}$/.test(token)) {
      year = token
    }
  }

  // İKİSİ de gerekli — yalnız ay ("Ağustos") veya yalnız yıl ("2021") klasörlenmez.
  if (month === null || year === null) return null

  return { year, month, monthLabel: MONTH_LABELS_TR[month] }
}
