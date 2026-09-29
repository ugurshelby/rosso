import { kilitOzelligiMi } from './kilit-katalogu'

/**
 * Animasyon anahtarı sözlüğü — `kullanici_animasyonlari.anahtar` (migration 0345).
 *
 * Bir anahtar "bu animasyon bu kullanıcıya OYNATILDI" demektir; bir kez yazılır,
 * geri alınmaz. Cihazdan bağımsız (localStorage DEĞİL): kullanıcı telefondan
 * girip masaüstünde aynı kutlamayı ikinci kez görmemeli.
 *
 * Üç aile:
 *   qs:<adim>                 Quick Start kartı çözüldü (spotify | zip)
 *   kilit:<ozellik>           Bir özelliğin kilidi ilk kez açıldı ve gösterildi
 *   kilit:<ozellik>:<bolum>   Aynı özelliğin bir BÖLÜMÜ için ayrıca (isteğe bağlı)
 *
 * ⚠ `qs:zip` ANİMASYONU ÜÇ ZIP'in TAMAMI yüklenince oynar (kart + bölüm birlikte
 *   çözülür); ara ilerleme animasyonları anahtar TÜKETMEZ.
 * ⚠ Bu sözlük migration 0345'teki geri doldurma listesiyle AYNI olmalı.
 */

export const QS_ADIMLARI = ['spotify', 'zip'] as const
export type QsAdimi = (typeof QS_ADIMLARI)[number]
/** Aynı tip, arayüz tarafının kullandığı ad (Antigravity, 2026-09-24). */
export type QuickStartAdimAdi = QsAdimi

export function qsAnahtari(adim: QsAdimi): string {
  return `qs:${adim}`
}

export function kilitAnahtari(ozellik: string, bolum?: string): string {
  return bolum ? `kilit:${ozellik}:${bolum}` : `kilit:${ozellik}`
}

/** Anahtar biçimi: DB CHECK ile aynı (küçük harf/rakam/`:`/`-`/`_`, 3–64). */
export const ANAHTAR_BICIMI = /^[a-z0-9][a-z0-9:_-]{2,63}$/

const BOLUM_BICIMI = /^[a-z0-9][a-z0-9-]{1,31}$/

export type AyrisanAnahtar =
  | { aile: 'qs'; adim: QsAdimi }
  | { aile: 'kilit'; ozellik: string; bolum: string | null }

/**
 * Anahtarı çözer; kataloğa uymuyorsa `null`. Sunucu eylemi yalnız çözülebilen
 * anahtarları kabul eder — rastgele metinle tabloyu doldurmak mümkün değil.
 */
export function anahtariAyristir(anahtar: string): AyrisanAnahtar | null {
  if (!ANAHTAR_BICIMI.test(anahtar)) return null
  const parcalar = anahtar.split(':')

  if (parcalar[0] === 'qs' && parcalar.length === 2) {
    const adim = parcalar[1]
    return (QS_ADIMLARI as readonly string[]).includes(adim ?? '')
      ? { aile: 'qs', adim: adim as QsAdimi }
      : null
  }

  if (parcalar[0] === 'kilit' && (parcalar.length === 2 || parcalar.length === 3)) {
    const ozellik = parcalar[1] ?? ''
    const bolum = parcalar[2] ?? null
    if (!kilitOzelligiMi(ozellik)) return null
    if (bolum !== null && !BOLUM_BICIMI.test(bolum)) return null
    return { aile: 'kilit', ozellik, bolum }
  }

  return null
}

export function gecerliAnimasyonAnahtari(anahtar: string): boolean {
  return anahtariAyristir(anahtar) !== null
}
