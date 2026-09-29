import type { JourneyYear } from './read'
import { APP_LOCALE } from '@/lib/locale'

/**
 * Yılın SAHNESİ — 2026-08-13, Sahibin doğrudan talimatı.
 *
 * Sahip: *"yılların karakteri yok veriye göre... ben kullanıcı olarak
 * baktığımda yalnızca 'bu yıl şu kadar dinlemişim, en sevdiklerim
 * bunlarmış' diyorum ama tasarım bunu bana iyi göstermiyor... journey
 * beni yolculuğa çıkarsın, bir yolculuk filmi gibi, odyssey gibi."*
 *
 * ── Ölçülen kök neden (canlı ekran görüntüleri, 2026-08-13) ─────────────
 * Renk yıldan yıla değişiyordu ama **kompozisyon hiç değişmiyordu**:
 * 2020 de 2025 de birebir aynı sırayla "türler → keşif → dinleme →
 * o yılın yüzleri" kutularını gösteriyordu.
 *
 *   2020 → %95 keşif · 10.432 çalma · 43 tür   ← olağanüstü bir keşif yılı
 *   2025 → %27 keşif · 20.285 çalma            ← tamamen başka bir hikâye
 *
 * İkisi de aynı üç gri kutuyla anlatılıyordu. Bir yolculuk filmi her
 * sahneyi aynı çekim ölçeğiyle çekmez: bazı yıl geniş açıdır, bazı yıl
 * yakın plan.
 *
 * ── Çözüm: her yılın bir MANŞETİ var ────────────────────────────────────
 * Yılın en ayırt edici sinyali "manşet" olur ve o yılın kompozisyonunu
 * belirler. Manşet sayı DEV basılır, kalan bilgi ona eşlik eder.
 * Böylece sayfada gezerken hangi yılın neyle anıldığı OKUNMADAN
 * hissedilir — Sahibin *"tasarım bunu bana iyi göstermiyor"*
 * cümlesinin karşılığı budur.
 *
 * ⚠ Bu bir HAYAT YORUMU değil — recap-journey-design.md §1 gereği
 * "Kişilik/hayat yorumu ❌ GİRMEZ". Manşet yalnız verinin hangi
 * yüzünün öne çıktığını söyler: hacim mi, keşif mi, bağlılık mı,
 * dağılma mı. Yargı yok, ölçüm var.
 */

/** Yılın kompozisyonunu belirleyen manşet türü. */
export type SahneTuru =
  /** O yıl her şeyden çok DİNLENMİŞ — hacim konuşur. */
  | 'hacim'
  /** O yıl yeniye açılmış — keşif konuşur. */
  | 'kesif'
  /** O yıl az sayıda şeye gömülmüş — tekrar konuşur. */
  | 'baglilik'
  /** O yıl her yöne dağılmış — çeşitlilik konuşur. */
  | 'dagilma'
  /** Ayırt edici sinyal yok — sakin yıl, boşluk konuşur. */
  | 'sakin'

export interface YilSahnesi {
  tur: SahneTuru
  /** Manşet olarak DEV basılacak değer (biçimlenmiş). */
  mansetDeger: string
  /** Manşetin altındaki kısa ad. */
  mansetEtiket: string
  /**
   * Sahnenin "ağırlığı" 0..1 — kompozisyonun ne kadar iddialı olacağı.
   * Zirve yıl 1'e yakın (tam genişlik, dev tipografi), sakin yıl 0'a
   * yakın (dar, sessiz). Yolculuk filminin ritmi bu.
   */
  agirlik: number
}

/** Yolculuk boyunca ölçülen uç değerler — sahne seçimi bunlara göre. */
export interface YolculukUclari {
  enYuksekCalma: number
  enYuksekKesif: number
  enYuksekCesitlilik: number
  enYuksekSadakat: number
}

export function yolculukUclari(years: JourneyYear[]): YolculukUclari {
  return {
    enYuksekCalma: Math.max(1, ...years.map((y) => y.playCount)),
    enYuksekKesif: Math.max(0.01, ...years.map((y) => y.discoveryRate)),
    enYuksekCesitlilik: Math.max(1, ...years.map((y) => y.genreVariety)),
    enYuksekSadakat: Math.max(0.01, ...years.map((y) => y.loyalty)),
  }
}

const nf = new Intl.NumberFormat(APP_LOCALE)

/**
 * Yılın sahnesini seçer.
 *
 * Yöntem: her sinyal kendi ekseninde 0..1'e normalize edilir, en yüksek
 * skoru alan manşet olur. Böylece seçim EŞİK tahminine değil, yolculuğun
 * kendi ölçeğine bağlı — 10.000 çalmanın "çok" olup olmadığı kullanıcının
 * kendi zirvesine göre belli olur, sabit bir sayıya göre değil.
 *
 * ⚠ Eşik değil, KIYAS kullanılmasının sebebi: sabit eşik ("50.000 üstü
 * hacim yılıdır") az dinleyen kullanıcıda hiçbir yılı manşet yapmaz,
 * çok dinleyende hepsini yapar. İki durumda da ritim ölür.
 */
export function yilSahnesi(y: JourneyYear, uc: YolculukUclari): YilSahnesi {
  const hacimSkor = y.playCount / uc.enYuksekCalma
  const kesifSkor = y.discoveryRate / uc.enYuksekKesif
  const cesitSkor = y.genreVariety / uc.enYuksekCesitlilik
  /*
   * Bağlılık: az keşif + yüksek tekrar.
   *
   * ⚠ Testin yakaladığı kusur: ilk sürümde yalnız
   * `(1-keşif)*0.5 + tekrar*0.5` vardı ve HACİMDEN bağımsızdı. Sonuç:
   * 2.000 çalmalık sönük bir yıl, 30.537 çalmalık zirve yıldan daha
   * yüksek ağırlık alabiliyordu — "az dinledim ama dinlediğime sadıktım"
   * cümlesi 15 kat büyük bir yılı ekranda eziyordu.
   *
   * Hacim çarpanı bunu düzeltir: bağlılık ancak o yıl gerçekten
   * dinlenmişse bir hikâyedir. `sqrt` seçildi — düz çarpım küçük yılları
   * tamamen siler, sqrt onlara hâlâ ses bırakır ama zirveyi ezmelerini
   * engeller.
   */
  const baglilikHam =
    (1 - y.discoveryRate) * 0.5 + Math.min(1, y.loyalty / uc.enYuksekSadakat) * 0.5
  const baglilikSkor = baglilikHam * Math.sqrt(hacimSkor)

  const adaylar: { tur: SahneTuru; skor: number }[] = [
    { tur: 'hacim', skor: hacimSkor },
    { tur: 'kesif', skor: kesifSkor },
    { tur: 'dagilma', skor: cesitSkor * 0.85 },
    { tur: 'baglilik', skor: baglilikSkor * 0.8 },
  ]

  adaylar.sort((a, b) => b.skor - a.skor)
  const kazanan = adaylar[0]!

  /*
   * Ayırt edicilik kontrolü: kazanan ikinciden belirgin farkla önde
   * değilse ve mutlak olarak da güçlü değilse, o yıl "sakin"dir.
   * Zorla manşet üretmek yerine boşluğun konuşmasına izin veriyoruz
   * (recap-journey-design.md §6 — "boşluk konuşur").
   */
  const ikinci = adaylar[1]!
  const belirgin = kazanan.skor - ikinci.skor >= 0.12 || kazanan.skor >= 0.82

  if (!belirgin || kazanan.skor < 0.35) {
    return {
      tur: 'sakin',
      mansetDeger: nf.format(y.playCount),
      mansetEtiket: 'plays',
      agirlik: Math.min(0.45, hacimSkor),
    }
  }

  /*
   * ── Ağırlık: eksen içi görecelik YETMEZ ────────────────────────────────
   *
   * ⚠ Testin yakaladığı ikinci kusur: ağırlık yalnız kazanan eksenin
   * skoruydu. Ama her eksen kendi içinde normalize olduğu için, 2.000
   * çalmalık sönük bir yıl "keşif" ekseninde tek başına zirveyse 1.0
   * alıyordu — 30.537 çalmalık yılla AYNI ağırlık. Ekranda ikisi de
   * dev tipografiyle basılırdı; yolculuğun ritmi yine ölürdü.
   *
   * Düzeltme: ağırlık = kazanan eksenin gücü × yılın yolculuktaki
   * MUTLAK varlığı (hacim). Bir yıl ancak hem ayırt edici hem de
   * gerçekten yaşanmışsa büyük basılır. `sqrt` yine küçük yılları
   * tamamen susturmuyor, sadece zirveyi ezmelerini engelliyor.
   */
  const varlik = Math.sqrt(hacimSkor)
  const agirlik = Math.max(0, Math.min(1, kazanan.skor * (0.35 + 0.65 * varlik)))

  switch (kazanan.tur) {
    case 'hacim':
      return {
        tur: 'hacim',
        mansetDeger: nf.format(y.playCount),
        mansetEtiket: 'plays',
        agirlik,
      }
    case 'kesif':
      return {
        tur: 'kesif',
        mansetDeger: `%${Math.round(y.discoveryRate * 100)}`,
        mansetEtiket: 'discovery',
        agirlik,
      }
    case 'dagilma':
      return {
        tur: 'dagilma',
        mansetDeger: nf.format(y.genreVariety),
        mansetEtiket: 'genres',
        agirlik,
      }
    case 'baglilik':
      return {
        tur: 'baglilik',
        mansetDeger: y.loyalty >= 10 ? Math.round(y.loyalty).toString() : y.loyalty.toFixed(1),
        mansetEtiket: 'repeats per song',
        agirlik,
      }
    default:
      /*
       * Ulaşılamaz: `adaylar` yalnız yukarıdaki dört türü içeriyor.
       * Yine de açık bir dal bırakılıyor — ileride yeni bir sahne türü
       * eklenirse burası sessizce `undefined` dönmesin. Hacim en güvenli
       * geri düşüş: her yılda tanımlı ve anlamlı bir sayı.
       */
      return {
        tur: 'hacim',
        mansetDeger: nf.format(y.playCount),
        mansetEtiket: 'plays',
        agirlik,
      }
  }
}

/**
 * Sahne ağırlığından tipografi ölçeği (rem).
 *
 * Apple tipografi kuralı: büyüdükçe tracking NEGATİFE gider, leading
 * SIKILAŞIR (apple-design §15). Ölçek burada üretilir, tracking/leading
 * CSS'te `clamp` ile bağlanır.
 *
 * Aralık bilinçli geniş: sakin yıl (3.2rem) ile zirve yıl (9rem)
 * arasında ~3 kat fark var. Yolculuk filminin geniş açı ↔ yakın plan
 * farkı bu.
 */
export function mansetOlcegi(agirlik: number): number {
  /*
   * ⚠ Taban 3.2 → 5.4 yükseltildi (canlı görsel kontrol, 2026-08-13).
   *
   * İlk değerlerle manşet, yanındaki yıl rakamından (`clamp(3.2rem,
   * 15vw, 7rem)` ≈ 7rem) KÜÇÜK kalıyordu. Hiyerarşi tersine dönüyordu:
   * göz önce "2020"yi, sonra asıl hikâyeyi (%95 keşif) görüyordu.
   *
   * Manşet o sayfanın kahramanı — yıl rakamı yalnız adres. Zirve yıl
   * artık 12.2rem'e kadar çıkıyor, yıl rakamını açıkça geçiyor.
   */
  return Number((5.4 + agirlik * 6.8).toFixed(2))
}

/**
 * Yıl etiketi sahneyle ÇELİŞİYOR mu?
 *
 * ─── Ölçülmüş kırık (2026-08-25, journey turu) ──────────────────────────
 * Canlı sayfada aynı yılın başlığı ile kompozisyonu birbirini yalanlıyordu:
 *
 *   2021 → sahne `sakin`     · etiket **"Keşif Patlaması"**
 *   2026 → sahne `dagilma`   · etiket **"Sadakat Dönemi"**
 *
 * Ayrıca 2020 ve 2021 aynı etiketi ("Keşif Patlaması") taşıyordu — oysa
 * 2020 gerçek keşif yılı, 2021 sakin bir yıl.
 *
 * Sebep: **iki bağımsız sınıflandırıcı, birbirinden habersiz.**
 *   • `eraLabelFromYear` (palette.ts) → SABİT eşik (keşif ≥%60, sadakat ≤%25)
 *   • `yilSahnesi` (bu dosya)         → KIYAS (kullanıcının kendi zirvesine göre)
 *
 * İkisi de kendi içinde tutarlı ama aynı yılı farklı adlandırıyor. Bu
 * dosyanın kendi yorumu sabit eşiği zaten reddediyor: *"sabit eşik az
 * dinleyende hiçbir yılı manşet yapmaz, çok dinleyende hepsini yapar."*
 * Etiket tam o tuzağa düşüyordu.
 *
 * ─── Neden etiketi SİLMİYORUZ, yalnız çelişeni gizliyoruz ───────────────
 * Etiket çoğu yılda doğru ve değerli (2023 "Maksimum Hacim" ↔ sahne
 * `hacim` — tam uyum). Sorun tümü değil, sahneyle ÇAKIŞAN azınlık.
 * Çelişen etiket gösterilmez; boşluk konuşur (recap-journey-design.md §6).
 * Kullanıcıya yanlış bir cümle söylemektense hiçbir şey söylememek yeğdir.
 */
export function etiketSahneyleCelisiyorMu(etiket: string, sahne: SahneTuru): boolean {
  if (!etiket) return false
  const e = etiket.toLocaleUpperCase(APP_LOCALE)

  /** Etiketin iddia ettiği sahne — yalnız GÜÇLÜ iddialar listelenir. */
  const iddia: Partial<Record<SahneTuru, RegExp>> = {
    hacim: /PEAK VOLUME|MAKSİMUM HACİM/,
    kesif: /DISCOVERY SURGE|KEŞİF PATLAMASI/,
    baglilik: /LOYALTY ERA|SADAKAT DÖNEMİ/,
  }

  for (const [tur, kalip] of Object.entries(iddia) as [SahneTuru, RegExp][]) {
    // Etiket bir sahne iddia ediyor ama gerçek sahne başkaysa → çelişki.
    if (kalip.test(e) && sahne !== tur) return true
  }

  /*
   * "<TÜR> DÖNEMİ" ve düz tür adı (ör. "HİP-HOP") bir sahne İDDİA ETMEZ —
   * yalnız o yıl neyin baskın olduğunu söyler. Hangi sahnede olursa olsun
   * doğrudur, gizlenmez.
   */
  return false
}
