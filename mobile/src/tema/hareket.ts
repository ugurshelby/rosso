/**
 * Yay ön ayarları (mobile-design.md §6). Değerler telefonda Hareket
 * Laboratuvarı'nda (`app/hareket-lab.tsx`) ayarlanır; değişen değer spec'e de yazılır.
 * `duration` + `dampingRatio` biçimi: Reanimated 4'te algısal süre ve sönüm.
 */
/** Tüm ön ayarlar aynı biçimde: algısal süre + sönüm oranı (Reanimated 4 `withSpring`). */
export interface YayAyari {
  dampingRatio: number
  duration: number
}

export const yay = {
  /** Açıl/kapan, sekme göstergesi: sıçrama yok. */
  varsayilan: { dampingRatio: 1, duration: 350 },
  /** Sheet / çekmece bırakma (bırakma hızı ayrıca verilir). */
  sheet: { dampingRatio: 0.85, duration: 300 },
  /** Momentumla fırlatılan kart / sayfa. */
  firlat: { dampingRatio: 0.8, duration: 350 },
  /** Basma bitince 1'e dönüş. */
  basmaDonus: { dampingRatio: 0.9, duration: 220 },
} satisfies Record<string, YayAyari>

export type YayAdi = keyof typeof yay

/** Parmak inince küçülme (onPressIn, ~80 ms) — §6. */
export const BASMA_OLCEGI = 0.97
export const BASMA_SURESI_MS = 80

/** Liste öğesi belirmesi: yalnız ilk açılış, öğe başı 30 ms, en çok 8 öğe. */
export const BELIRME = { gecikmeMs: 30, enCokOge: 8, kaymaDp: 8 } as const

/** Azaltılmış hareket: yaylar yerine kısa opaklık geçişi. */
export const AZALTILMIS_SURE_MS = 150

/**
 * Momentum projeksiyonu (Apple: UIScrollView yavaşlama 0.998/ms).
 * Bırakma hızından (dp/s) parmağın "gideceği" yer; sheet kararını konum değil bu verir.
 */
export function projeksiyon(hiz: number, yavaslama = 0.998) {
  'worklet'
  return ((hiz / 1000) * yavaslama) / (1 - yavaslama)
}

/** Sınırda aşırı çekmede lastik bant (Apple §9): mesafe büyüdükçe direnç artar, boyutu geçmez. */
export function lastikBant(asim: number, boyut: number, katsayi = 0.55) {
  'worklet'
  return (1 - 1 / ((asim * katsayi) / boyut + 1)) * boyut
}

/** Sheet bırakılınca kapansın mı? Konum değil, hızın projeksiyonu karar verir (§7). */
export function kapanmaliMi(otelenme: number, hizY: number, yukseklik: number) {
  'worklet'
  return otelenme + projeksiyon(hizY) > yukseklik * 0.5
}
