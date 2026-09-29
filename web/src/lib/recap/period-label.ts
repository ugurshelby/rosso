/**
 * Recap dönem etiketini EKRANDA Türkçeleştirir.
 *
 * 🔴 NEDEN GÖSTERİM KATMANINDA, VERİTABANINDA DEĞİL
 *
 * `recaps.period_label` İngilizce üretiliyor: migration 0122
 * (`to_char(date_trunc('month', …), 'TMMonth YYYY')`). `TM` yerelleştirme ister
 * ama sunucunun `lc_time` ayarı `en_US.UTF-8` → "July 2026".
 *
 * ⚠ Bu alan yalnız bir etiket DEĞİL, aynı zamanda **URL anahtarı**
 * (`/recap/July%202026`) ve **kapak sanatı tohumu** (`${userId}:${periodLabel}`).
 * Canlıda 214 aylık kayıt bu değerle duruyor. DB'yi değiştirmek tüm mevcut
 * recap linklerini kırar ve kapak görsellerini değiştirir.
 *
 * Sahibin kararı (2026-08-14, kullanıcı testi Ş-17): **yalnız gösterimde çevir.**
 * URL'ler, DB ve tohum olduğu gibi kalır; kullanıcı Türkçe görür.
 *
 * Not: Kartların İÇİ zaten Türkçeydi ("TEMMUZ", "ARALIK") — bu yüzden aynı
 * ekranda "July 2026" ile "TEMMUZ" yan yana duruyordu.
 */

const AY_EN: Record<string, string> = {
  january: 'January',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  june: 'June',
  july: 'July',
  august: 'August',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December',
  ocak: 'January',
  şubat: 'February',
  subat: 'February',
  mart: 'March',
  nisan: 'April',
  mayıs: 'May',
  mayis: 'May',
  haziran: 'June',
  temmuz: 'July',
  ağustos: 'August',
  agustos: 'August',
  eylül: 'September',
  eylul: 'September',
  ekim: 'October',
  kasım: 'November',
  kasim: 'November',
  aralık: 'December',
  aralik: 'December',
}

/**
 * Tek bir ay adını çevirir. Tanınmayan değer (zaten Türkçe ya da beklenmedik)
 * OLDUĞU GİBİ döner — sessizce bozmaz.
 */
export function ayAdiTr(ay: string): string {
  const t = ay.trim()
  if (!t) return ay
  return AY_EN[t.toLocaleLowerCase('en-US')] ?? AY_EN[t.toLocaleLowerCase('tr-TR')] ?? ay
}

/**
 * Dönem etiketinin tamamını çevirir.
 * - `'July 2026'` → `'Temmuz 2026'`
 * - `'2025'`      → `'2025'`   (yıllık; dokunulmaz)
 * - `'Temmuz 2026'` → `'Temmuz 2026'` (zaten Türkçe; dokunulmaz)
 */
export function donemEtiketiTr(label: string): string {
  const parts = label.trim().split(/\s+/)
  if (parts.length < 2) return label
  const ay = ayAdiTr(parts[0])
  return [ay, ...parts.slice(1)].join(' ')
}
