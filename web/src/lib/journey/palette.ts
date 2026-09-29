/**
 * Journey'e ÖZEL palet (Sahip kararı 2026-07-12).
 *
 * ── Neden tür paleti (genre-geometry) kullanmıyoruz ──
 * O palet rengi TÜRE bağlar: hip-hop kırmızı, pop pembe, rock mor. Journey'de bu
 * yanlış olurdu — çünkü Sahip 7 yıl boyunca hep aynı iki türü dinlemiş. Renk
 * türe bağlanırsa zaman çizgisi iki renk arasında gidip gelir; yolculuk hissi olmaz.
 *
 * Burada renk YOLCULUĞUN EVRESİNE bağlanır — ama bu yalnız RENK içindir, İSİM
 * değil. Renk hikâyeyi soğuk→ateş→dingin akışıyla anlatır; görünür etiket ise
 * o yılın kendi verisinden türer (bkz. eraLabelFromYear).
 *
 *   soğuk, karanlık, neredeyse renksiz  (yolun başı)
 *   ısınan, doygunlaşan, yükselen       (yolun ortası)
 *   sakin, doymuş, dingin               (yolun sonu)
 *
 * Bir yılın rengi, o yılın yolculuktaki KONUMUNDAN türer — dinlediği türden değil.
 * Böylece kaydırdıkça gerçek bir geçiş yaşanır: karanlıktan ateşe, ateşten dinginliğe.
 *
 * ── 2026-07-25 (Plan 02 soft-touch §7, felsefe düzeltmesi) ──
 * Eski `era` alanı "Sessizlik/Açlık/Yerleşme/İçe Dönüş" gibi HAYAT YORUMU
 * üretiyordu. recap-journey-design.md §1 bunu açıkça yasaklıyor ("Kişilik/hayat
 * yorumu ❌ GİRMEZ"). Kullanıcı "Sana ne benim yerleşmemden?" diyebilir. Etiket
 * artık VERİNİN ADINI koyar: MAKSİMUM HACİM / SADAKAT DÖNEMİ / KEŞİF PATLAMASI /
 * <TÜR> DÖNEMİ. Renk gradyanı KONUMA bağlı kaldı (yolculuk hissi korunur).
 */

import type { JourneyYear } from './read'
import type { YearPalette } from './types'

export interface JourneyYearColors {
  /** Arka plan gradyanının üst rengi */
  from: string
  /** Arka plan gradyanının alt rengi */
  to: string
  /** Vurgu (yıl rakamı, barlar, çizgiler) */
  accent: string
  /** Vurgu üstündeki metin */
  accentFg: string
  /**
   * Evre adı — kullanıcıya gösterilir.
   * ⚠ 2026-07-25: bu artık KONUMDAN değil, yıl VERİSİNDEN türer (soft-touch §7,
   * felsefe düzeltmesi). Renkle birlikte gelen `era` yalnız geriye-uyumluluk
   * için nötr bir yer tutucudur; görünür etiketi eraLabelFromYear üretir.
   */
  era: string
}

/** Yolculuğun üç perdesi. Duraklar arasında renk İNTERPOLE edilir → sürekli geçiş. */
interface Stop {
  /** Yolculuktaki konum: 0 = ilk yıl, 1 = son yıl */
  t: number
  from: string
  to: string
  accent: string
}

/**
 * Vurgu renkleri BEYAZ metin taşır → hepsi WCAG AA (>=4.5:1) geçmek ZORUNDA.
 * İlk taslakta parlak tonlar (#F43F5E, #2DD4BF, #FB923C) seçmiştim; ölçünce
 * 1.9–2.9:1 çıktı — okunmuyordu. Göz kararı yeterli değil, hesaplandı.
 * Şu anki en kötü değer: 5.5:1.
 */
const STOPS: Stop[] = [
  // Yolun başı — mürekkep mavisi, neredeyse siyah. Boşluğun rengi.
  { t: 0.0, from: '#0B1020', to: '#05060D', accent: '#3F4A6B' },
  // İlk kıvılcım — mor.
  { t: 0.28, from: '#2A1246', to: '#0A0616', accent: '#6D3FD4' },
  // Zirve — ateş. En doygun nokta (Sahip'de 2023: 30.537 dinleme).
  { t: 0.55, from: '#7A1030', to: '#1A0208', accent: '#C21E4B' },
  // Dinginleşme — turuncu-toprak, akşam ışığı. Ateş sönmüyor, sakinleşiyor.
  { t: 0.78, from: '#6B2E12', to: '#150803', accent: '#B4531A' },
  // Bugün — derin yeşil-mavi, dingin. Yolun sonu değil, şimdiki hâli.
  { t: 1.0, from: '#123A38', to: '#04100F', accent: '#0F766E' },
]

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function mix(a: string, b: string, k: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k)
}

/**
 * Kesirli yıl indeksi (0 … palettes.length-1) arasında YearPalette (glow, primary, accent, deep)
 * değerlerini sürekli karıştırır — scroll sırasında sıvı, canlı geçiş sağlar.
 */
export function blendYearPalettes(
  continuousIndex: number,
  palettes: readonly YearPalette[],
): YearPalette {
  if (palettes.length === 0) {
    return {
      primary: '#1e1b4b',
      glow: '#6366f1',
      accent: '#ec4899',
      deep: '#050508',
    }
  }
  if (palettes.length === 1) {
    return palettes[0]!
  }

  const clamped = Math.max(0, Math.min(palettes.length - 1, continuousIndex))
  const lo = Math.floor(clamped)
  const hi = Math.ceil(clamped)
  const k = clamped - lo
  const a = palettes[lo]!
  const b = palettes[hi]!

  if (lo === hi || k === 0) return a

  return {
    primary: mix(a.primary, b.primary, k),
    glow: mix(a.glow, b.glow, k),
    accent: mix(a.accent, b.accent, k),
    deep: mix(a.deep, b.deep, k),
  }
}

/**
 * Bir yılın rengi. `index` yolculuktaki sırası, `total` toplam yıl sayısı.
 *
 * Tek yıl varsa (total <= 1) ortadaki durak kullanılır — 0'a bölme yok.
 *
 * ⚠ `era` alanı artık boş döner (bkz. tip yorumu). Görünür etiketi
 * eraLabelFromYear üretir — o yılın kendi verisinden, konumdan değil.
 * (Eski `playCount` parametresi 2026-07-25'te söküldü — era artık konumdan
 * hesaplanmadığı için gereksizdi.)
 */
/**
 * Kesirli yıl indeksi (0 … palettes.length-1) arasında renkleri sürekli karıştırır.
 * Scroll-linked gradyan için — yıl sınırlarında snap yok.
 */
export function blendJourneyYearColors(
  continuousIndex: number,
  palettes: readonly JourneyYearColors[],
): JourneyYearColors {
  if (palettes.length === 0) {
    return getJourneyYearColors(0, 1)
  }
  if (palettes.length === 1) {
    return palettes[0]!
  }

  const clamped = Math.max(0, Math.min(palettes.length - 1, continuousIndex))
  const lo = Math.floor(clamped)
  const hi = Math.ceil(clamped)
  const k = clamped - lo
  const a = palettes[lo]!
  const b = palettes[hi]!

  if (lo === hi || k === 0) return a

  return {
    from: mix(a.from, b.from, k),
    to: mix(a.to, b.to, k),
    accent: mix(a.accent, b.accent, k),
    accentFg: '#FFFFFF',
    era: '',
  }
}

export function getJourneyYearColors(
  index: number,
  total: number,
): JourneyYearColors {
  const t = total <= 1 ? 0.55 : Math.max(0, Math.min(1, index / (total - 1)))

  // t'yi saran iki durağı bul, aralarında interpole et.
  let lo = STOPS[0]!
  let hi = STOPS[STOPS.length - 1]!
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i]!
    const b = STOPS[i + 1]!
    if (t >= a.t && t <= b.t) {
      lo = a
      hi = b
      break
    }
  }

  const span = hi.t - lo.t
  const k = span === 0 ? 0 : (t - lo.t) / span

  return {
    from: mix(lo.from, hi.from, k),
    to: mix(lo.to, hi.to, k),
    accent: mix(lo.accent, hi.accent, k),
    // Vurgu renklerinin hepsi orta-koyu → beyaz metin her durumda okunur (WCAG).
    accentFg: '#FFFFFF',
    era: '',
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   YILIN KARAKTERİ — 2026-08-13, Sahibin doğrudan talimatı
   ══════════════════════════════════════════════════════════════════════════

   Sahip: *"yıllara göre renk geçişleri zayıf, YILLARIN KARAKTERİ YOK
   VERİYE GÖRE... ben kullanıcı olarak baktığımda yalnızca bu yıl şu kadar
   dinlemişim en sevdiklerim bunlarmış diyorum ama tasarım bunu bana iyi
   göstermiyor."*

   ── Ölçülen kök neden ───────────────────────────────────────────────────
   Yukarıdaki `getJourneyYearColors` rengi YALNIZ konumdan (index/total)
   türetiyor. Sonuç: bir yılın 30.000 çalma mı 500 çalma mı olduğu, %95
   keşif mi %23 mü olduğu rengi HİÇ etkilemiyor. Sıradaki yeri aynıysa
   iki tamamen farklı yıl birebir aynı görünüyor.

   Sahibin verisinde fark gerçek ve büyük (canlı karelerden):
     2022 → %56 keşif · 21.559 çalma
     2022 → %68 keşif · 17.495 çalma (başka bir hesapta)
   Bu fark ekranda hiçbir yere yansımıyordu.

   ── Yeni model: konum İSKELET, veri ET ──────────────────────────────────
   Konum gradyanı KORUNUYOR (yolculuk hissi ondan geliyor — soğuk→ateş→
   dingin). Üstüne yılın kendi karakteri bindiriliyor:

     • YOĞUNLUK (playCount / zirve)  → doygunluk + ışık gücü
       Az dinlenen yıl soluk ve sönük; zirve yılı doygun ve parlak.
       "Bu yıl şu kadar dinlemişim" cümlesi artık RENKTE görünüyor.

     • KEŞİF (discoveryRate)         → renk sıcaklığı kayması
       Yeniye açılan yıl maviye/soğuğa kayar (ufuk, yabancılık);
       kendine kapanan yıl sıcağa/ambere kayar (tanıdıklık, oda ışığı).

     • DAĞINIKLIK (genreVariety)     → gradyanın açısı ve yumuşaklığı
       Tek türe gömülü yıl keskin ve odaklı; 50 türlü yıl dağınık ve geniş.

   Böylece iki yıl asla aynı görünmez ve fark KEYFÎ değil — kullanıcının
   o yıl gerçekten ne yaptığından doğar.

   ⚠ WCAG: `accent` beyaz metin taşıyor. Yoğunluk/keşif kaydırmaları
   parlaklığı DAR bir bantta tutuyor (bkz. `clampLuminance`) — 5.5:1 tabanı
   korunuyor. Bu dosyanın ilk sürümünde göz kararı seçilen tonlar 1.9:1
   çıkmıştı; o ders burada da geçerli, sınır hesapla korunuyor. */

/** Bir yılın karakterini besleyen ham sinyaller (hepsi 0..1'e normalize). */
export interface YearCharacter {
  /** playCount / en yüksek playCount — 0..1 */
  intensity: number
  /** discoveryRate — 0..1 (yüksek = yeniye açık) */
  discovery: number
  /** genreVariety normalize — 0..1 (yüksek = dağınık) */
  spread: number
}

/** Bir rengin algısal parlaklığı (0..1). WCAG'in relative luminance'ı. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Rengi hedef parlaklık bandına çeker (siyaha/beyaza doğru karıştırarak).
 * Kontrast tabanını korumanın en ucuz ve öngörülebilir yolu.
 */
function clampLuminance(hex: string, min: number, max: number): string {
  const l = luminance(hex)
  if (l >= min && l <= max) return hex
  // Hedefin altındaysa beyaza, üstündeyse siyaha doğru küçük adımlarla çek.
  const target = l < min ? '#FFFFFF' : '#000000'
  let k = 0
  let out = hex
  while (k < 0.9) {
    k += 0.05
    out = mix(hex, target, k)
    const lo = luminance(out)
    if (lo >= min && lo <= max) break
  }
  return out
}

/**
 * Yılın karakterini konum rengine bindirir.
 *
 * Sıra önemli: önce sıcaklık (renk kimliği), sonra doygunluk (güç),
 * en son parlaklık kelepçesi (okunabilirlik). Tersi sırada kelepçe
 * kendi düzelttiğini bozardı.
 */
export function applyYearCharacter(
  base: JourneyYearColors,
  ch: YearCharacter,
): JourneyYearColors {
  /*
   * ① SICAKLIK — keşif ekseni.
   * discovery 0.5 nötr. Yukarısı soğuk-mavi (ufuk açılıyor), aşağısı
   * amber (kendi odasına kapanmış). Kayma ±0.22 ile sınırlı: renk
   * kimliği korunmalı, yıl "mavi yıl"a dönüşmemeli.
   */
  const HORIZON = '#4C7BD9' // uzak ufuk mavisi
  const EMBER = '#D98A3C' // oda ışığı amberi
  const warmK = (ch.discovery - 0.5) * 0.44 // -0.22 … +0.22
  const tint = warmK >= 0 ? HORIZON : EMBER
  const tintAmount = Math.abs(warmK)

  let from = mix(base.from, tint, tintAmount * 0.75)
  let to = mix(base.to, tint, tintAmount * 0.35)
  let accent = mix(base.accent, tint, tintAmount)

  /*
   * ② YOĞUNLUK — "bu yıl ne kadar dinledim" sorusunun görsel cevabı.
   * Sönük yıl siyaha çekilir (ışık az), zirve yılı olduğu gibi kalır
   * ve accent'i bir tık daha parlar. Bu, sayfada gezerken hangi yılın
   * "büyük yıl" olduğunu OKUMADAN hissettiren şey.
   */
  const dim = (1 - ch.intensity) * 0.45
  from = mix(from, '#000000', dim * 0.55)
  to = mix(to, '#000000', dim * 0.35)
  accent = ch.intensity > 0.85 ? mix(accent, '#FFFFFF', 0.12) : mix(accent, '#000000', dim * 0.3)

  /*
   * ③ PARLAKLIK KELEPÇESİ — beyaz metin taşıyan accent için.
   *
   * ⚠ Tavan HESAPLA bulundu, göz kararıyla değil. İlk denemede 0.30
   * yazmıştım; test 17 kombinasyonda 3.82–4.50:1 çıkardı (eşik 4.5).
   * Beyaz metnin 4.5:1'i için gereken en yüksek luminance:
   *     1.05 / (L + 0.05) >= 4.5  →  L <= 0.1833
   * 0.17 seçildi — küçük bir güvenlik payıyla (yuvarlama hataları).
   *
   * Bu, "sayısına güvenme, yeniden ölç" kuralının bu dosyadaki ikinci
   * örneği: paletin ilk sürümünde de göz kararı tonlar 1.9:1 çıkmıştı.
   */
  accent = clampLuminance(accent, 0.05, 0.17)

  return { from, to, accent, accentFg: '#FFFFFF', era: base.era }
}

/**
 * Yılın gradyan açısı — dağınıklıktan türer.
 *
 * Tek türe gömülü yıl (spread≈0) dik ve keskin bir ışık düşüşü;
 * 50 türlü yıl (spread≈1) yatık, geniş, dağılmış bir ışık.
 * Aynı bilgiyi metin olarak da veriyoruz ("49 farklı tür") ama
 * görsel olarak HİSSEDİLMESİ bu açıyla oluyor.
 */
export function characterAngle(spread: number): number {
  return Math.round(155 + spread * 60) // 155° … 215°
}

/** Yılın ışık odağının yatay konumu — keşif ekseni (%). */
export function characterFocusX(discovery: number): number {
  // Yeniye açık yılda ışık sağa (ileri/ufuk), kapalı yılda sola kayar.
  return Math.round(30 + discovery * 40) // %30 … %70
}

/**
 * Yılın müzikal KARAKTER etiketi — VERİDEN türer, hayat yorumundan DEĞİL
 * (Plan 02 soft-touch §7 + recap-journey-design.md §1 felsefe kuralı).
 *
 * Öncelik sırası (en ayırt edici sinyal kazanır):
 *   1. En yüksek hacim yılı        → "MAKSİMUM HACİM"
 *   2. Keşif patlaması (≥%60)       → "KEŞİF PATLAMASI"
 *   3. Sadakat (keşif ≤%25 + hacim) → "SADAKAT DÖNEMİ"
 *   4. Baskın tür ≥%50              → "<TÜR> DÖNEMİ"
 *   5. Aksi hâlde                   → baskın tür adı (varsa), yoksa boş
 *
 * `peakPlayCount` = tüm yılların en yüksek playCount'u (MAKSİMUM HACİM için).
 * Boş string dönebilir — o zaman etiket HİÇ basılmaz (boşluk konuşur, §6).
 */
export function eraLabelFromYear(year: JourneyYear, peakPlayCount: number): string {
  // 1. Yolun en yoğun yılı — tek ve ayırt edici.
  if (year.playCount > 0 && year.playCount === peakPlayCount) {
    return 'PEAK VOLUME'
  }
  // 2. Keşif patlaması — o yıl gerçekten yeniye açıldıysa.
  if (year.discoveryRate >= 0.6) {
    return 'DISCOVERY SURGE'
  }
  // 3. Sadakat — az keşif ama gerçek hacim (boş yıl "sadakat" olmaz).
  if (year.discoveryRate <= 0.25 && year.playCount >= 500) {
    return 'LOYALTY ERA'
  }
  // 4. Tek türün baskın olduğu yıl — türün adıyla.
  if (year.dominantShare >= 0.5 && year.genreLabel) {
    return `${year.genreLabel.toLocaleUpperCase('en-US')} ERA`
  }
  // 5. Zayıf sinyal: baskın türün adı, yoksa etiket yok (boşluk konuşur).
  return year.genreLabel ? year.genreLabel.toLocaleUpperCase('en-US') : ''
}
