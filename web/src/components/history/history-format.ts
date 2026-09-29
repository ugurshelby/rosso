/**
 * FAZ DİNLEME-GEÇMİŞİ: gösterim yardımcıları (saf, test edilebilir).
 */

/** ms → okunur süre: "160 dk", "2.847 dk" (stats.fm gibi dakika birimi). */
export function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60000)
  return `${minutes.toLocaleString('en-US')} min`
}

/** Çalma sayısı: "29 plays". */
export function formatPlays(count: number): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'play' : 'plays'}`
}

/** Kapak/görsel yoksa baş harf üretir (placeholder için). */
export function initialOf(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed[0].toLocaleUpperCase('tr') : '•'
}
