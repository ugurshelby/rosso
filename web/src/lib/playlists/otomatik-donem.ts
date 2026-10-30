/**
 * Otomatik playlist dönem hesabı — saf mantık (sunucu/DB yok, test edilebilir).
 *
 * NEDEN (2026-10-30): Eski üretici yalnız ayın 1-3'ünde "bir önceki ay"ı
 * deniyordu. 2026-10-01..03 arasında 57 deneme "Spotify not connected" ile
 * düştü ve Eylül listesi hiç oluşmadı — telafi yolu yoktu. Ayrıca "son çalışma
 * 20 günden eskiyse" kapısı, geç üretilen bir listeden sonra bir sonraki ayı
 * engelliyordu; yıllık kural da her ay yeniden üretiyordu.
 *
 * Artık her üretim bir DÖNEM anahtarına bağlanır (`auto_playlist_runs.donem`,
 * migration 0367) ve eksik dönemler sırayla tamamlanır:
 *   top_month  → 'YYYY-MM', son tamamlanan aydan bir önceki aya kadar (en çok 6 ay geri)
 *   top_year   → 'YYYY', yalnız bir önceki takvim yılı, yılda bir kez
 *   diğerleri  → 'YYYY-MM' (içinde bulunulan ay), ayda bir kez — kayan pencere
 */

export type DonemKuralTuru = 'top_month' | 'top_year' | 'morning_routine' | 'nostalgia' | 'most_skipped' | 'obsession'

export interface Donem {
  /** 'YYYY-MM' ya da 'YYYY' */
  anahtar: string
  from: string
  to: string
  hourFrom: number | null
  hourTo: number | null
  skipped: boolean
  /** Ad şablonu için. */
  yil: number
  ay: number | null
}

/** Ay geri telafisinin üst sınırı (kural uzun süre kapalı kaldıysa geçmişi doldurmaz). */
export const TELAFI_AY_SINIRI = 6

const AYLAR: Record<'tr' | 'en', string[]> = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

const ayAnahtari = (yil: number, ay: number) => `${yil}-${String(ay).padStart(2, '0')}`
const utc = (yil: number, ayIndeks: number) => new Date(Date.UTC(yil, ayIndeks, 1)).toISOString()
const GUN = 24 * 60 * 60 * 1000

function ayDonemi(yil: number, ay: number): Donem {
  return {
    anahtar: ayAnahtari(yil, ay),
    from: utc(yil, ay - 1),
    to: utc(yil, ay),
    hourFrom: null,
    hourTo: null,
    skipped: false,
    yil,
    ay,
  }
}

/**
 * Kural için henüz tamamlanmamış dönemler, en eskisi önce.
 *
 * @param tamamlananlar bu kural için `status='completed'` dönem anahtarları
 * @param kuralOlusturma kural oluşturulma zamanı — bundan önceki ayları doldurmaz
 */
export function bekleyenDonemler(
  kuralTuru: string,
  tamamlananlar: ReadonlySet<string>,
  simdi: Date,
  kuralOlusturma?: Date | null,
): Donem[] {
  const yil = simdi.getUTCFullYear()
  const ay = simdi.getUTCMonth() + 1

  if (kuralTuru === 'top_month') {
    // Bir önceki tam ay ve ondan geriye, ilk tamamlanmış aya ya da sınırlara kadar.
    const adaylar: Donem[] = []
    let y = ay === 1 ? yil - 1 : yil
    let m = ay === 1 ? 12 : ay - 1
    const enEski = kuralOlusturma
      ? ayAnahtari(kuralOlusturma.getUTCFullYear(), kuralOlusturma.getUTCMonth() + 1)
      : null
    for (let i = 0; i < TELAFI_AY_SINIRI; i++) {
      const anahtar = ayAnahtari(y, m)
      if (tamamlananlar.has(anahtar)) break
      // Kural oluşturulduğu aydan önceki ayları doldurma; oluşturulduğu ay ise
      // (o ay da kısmen izlenmiş olabilir) yalnız hiç tamamlanan yoksa sayılır.
      if (enEski && anahtar < enEski) break
      adaylar.push(ayDonemi(y, m))
      if (m === 1) { m = 12; y -= 1 } else { m -= 1 }
    }
    return adaylar.reverse()
  }

  if (kuralTuru === 'top_year') {
    const hedef = yil - 1
    const anahtar = String(hedef)
    if (tamamlananlar.has(anahtar)) return []
    if (kuralOlusturma && kuralOlusturma.getUTCFullYear() > hedef + 1) return []
    return [{
      anahtar,
      from: utc(hedef, 0),
      to: utc(hedef + 1, 0),
      hourFrom: null,
      hourTo: null,
      skipped: false,
      yil: hedef,
      ay: null,
    }]
  }

  // Kayan pencereli kurallar: ayda bir.
  const anahtar = ayAnahtari(yil, ay)
  if (tamamlananlar.has(anahtar)) return []
  const pencere = kuralTuru === 'morning_routine' ? 60 : kuralTuru === 'most_skipped' ? 90 : 30
  return [{
    anahtar,
    from: new Date(simdi.getTime() - pencere * GUN).toISOString(),
    to: simdi.toISOString(),
    hourFrom: kuralTuru === 'morning_routine' ? 6 : null,
    hourTo: kuralTuru === 'morning_routine' ? 11 : null,
    skipped: kuralTuru === 'most_skipped',
    yil,
    ay,
  }]
}

const SABIT_ADLAR: Record<string, string> = {
  morning_routine: 'Morning Routine — Rosso',
  obsession: 'Obsessions — Rosso',
  most_skipped: 'Skipped Relics — Rosso',
  nostalgia: 'Nostalgia — Rosso',
}

/**
 * Playlist adı. Aylık: kuralın şablonu (`{month} - {year}`), ay adı kullanıcının
 * diliyle. Yıllık: yalnız yıl ("2025"). Diğerleri sabit ad.
 */
export function donemAdi(kuralTuru: string, donem: Donem, sablon: string | null, dil: string | null): string {
  if (kuralTuru === 'top_year') return String(donem.yil)
  if (kuralTuru === 'top_month' && donem.ay) {
    const aylar = AYLAR[dil === 'en' ? 'en' : 'tr']
    const s = sablon && sablon.includes('{month}') ? sablon : '{month} - {year}'
    return s.replaceAll('{month}', aylar[donem.ay - 1]).replaceAll('{year}', String(donem.yil))
  }
  return SABIT_ADLAR[kuralTuru] ?? 'Auto Mix — Rosso'
}
