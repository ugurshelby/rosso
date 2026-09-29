import { describe, it, expect } from 'vitest'
import {
  yilSahnesi,
  yolculukUclari,
  mansetOlcegi,
  etiketSahneyleCelisiyorMu,
} from './yil-sahnesi'
import type { JourneyYear } from './read'

/**
 * Yıl sahnesi testleri — 2026-08-13.
 *
 * Senaryolar uydurulmadı: Sahibin canlı Journey ekran görüntülerinden
 * alındı (2026-08-13 çekimi).
 *   2020 → %95 keşif · 10.432 çalma · 43 tür
 *   2025 → %27 keşif · 20.285 çalma
 * İkisi de AYNI kompozisyonla gösteriliyordu; bu testler artık
 * ayrıştıklarını garanti ediyor.
 */

function yil(p: Partial<JourneyYear>): JourneyYear {
  return {
    year: 2020,
    playCount: 5000,
    totalMinutes: 15000,
    trackCount: 1000,
    artistCount: 400,
    newArtistCount: 200,
    discoveryRate: 0.5,
    loyalty: 5,
    genreLabel: 'Hip-Hop',
    genreVariety: 20,
    dominantShare: 0.4,
    genreBreakdown: [],
    isBreakpoint: false,
    topTrack: null,
    ...p,
  }
}

describe('yilSahnesi — gerçek yıllar ayrışıyor mu', () => {
  it('2020 (%95 keşif) ile 2025 (%27 keşif, yüksek hacim) FARKLI sahne alır', () => {
    /*
     * Asıl şikâyetin testi. Canlıda ikisi de aynı üç kutuydu.
     */
    const yillar = [
      yil({ year: 2020, playCount: 10432, discoveryRate: 0.95, genreVariety: 43 }),
      yil({ year: 2025, playCount: 20285, discoveryRate: 0.27, genreVariety: 30, loyalty: 6.4 }),
    ]
    const uc = yolculukUclari(yillar)

    const s2020 = yilSahnesi(yillar[0]!, uc)
    const s2025 = yilSahnesi(yillar[1]!, uc)

    expect(s2020.tur).not.toBe(s2025.tur)
    expect(s2020.tur).toBe('kesif')
    expect(s2025.tur).toBe('hacim')
  })

  it('manşet değeri sahne türüyle tutarlı', () => {
    const yillar = [
      yil({ year: 2020, playCount: 10432, discoveryRate: 0.95, genreVariety: 43 }),
      yil({ year: 2025, playCount: 20285, discoveryRate: 0.27, loyalty: 6.4 }),
    ]
    const uc = yolculukUclari(yillar)

    // Keşif yılında manşet yüzde, hacim yılında sayı olmalı.
    expect(yilSahnesi(yillar[0]!, uc).mansetDeger).toBe('%95')
    expect(yilSahnesi(yillar[1]!, uc).mansetDeger).toBe('20,285')
  })

  it('hacim zirvesi, sönük yıldan daha ağır basar', () => {
    /*
     * ⚠ Bu testin ilk hâli iki yıla da AYNI keşif/çeşitlilik veriyordu
     * (yardımcının varsayılanı). Sonuç: ikisi de `kesif` ekseninde 1.000
     * alıp berabere kalıyordu — gerçek yıllar böyle olmaz, senaryo
     * gerçekçi değildi. Şimdi yıllar birbirinden gerçekten farklı.
     */
    const yillar = [
      yil({ year: 2019, playCount: 2000, discoveryRate: 0.4, genreVariety: 12, loyalty: 3 }),
      yil({ year: 2023, playCount: 30537, discoveryRate: 0.3, genreVariety: 20, loyalty: 9 }),
    ]
    const uc = yolculukUclari(yillar)

    const zirve = yilSahnesi(yillar[1]!, uc)
    const kucuk = yilSahnesi(yillar[0]!, uc)

    expect(zirve.tur).toBe('hacim')
    expect(zirve.agirlik).toBeGreaterThan(kucuk.agirlik)
  })

  it('az dinlenen yıl, sadık olsa bile zirveyi EZMEZ', () => {
    /*
     * Testin yakaladığı gerçek kusur: bağlılık skoru hacimden bağımsızdı,
     * 2.000 çalmalık bir yıl 30.537 çalmalık yıldan yüksek ağırlık
     * alabiliyordu. `sqrt(hacim)` çarpanı bunu düzeltti.
     */
    const yillar = [
      yil({ year: 2019, playCount: 2000, discoveryRate: 0.05, loyalty: 12, genreVariety: 6 }),
      yil({ year: 2023, playCount: 30537, discoveryRate: 0.45, loyalty: 7, genreVariety: 30 }),
    ]
    const uc = yolculukUclari(yillar)

    expect(yilSahnesi(yillar[0]!, uc).agirlik).toBeLessThan(
      yilSahnesi(yillar[1]!, uc).agirlik,
    )
  })
})

describe('yilSahnesi — eşik değil kıyas', () => {
  it('az dinleyen kullanıcıda da manşet üretilir', () => {
    /*
     * ⚠ Sabit eşik ("50.000 üstü hacim yılıdır") kullansaydık, toplam
     * 900 çalması olan bir kullanıcının HİÇBİR yılı manşet almazdı ve
     * yolculuğun ritmi ölürdü. Kıyas kendi ölçeğine göre çalışır.
     */
    const yillar = [
      yil({ year: 2024, playCount: 120, discoveryRate: 0.3, genreVariety: 4 }),
      yil({ year: 2025, playCount: 800, discoveryRate: 0.28, genreVariety: 5 }),
    ]
    const uc = yolculukUclari(yillar)
    expect(yilSahnesi(yillar[1]!, uc).tur).not.toBe('sakin')
  })

  it('ayırt edici sinyali olmayan yıl SAKİN kalır (zorla manşet yok)', () => {
    // Her ekseni ortalama olan yıl — boşluk konuşsun.
    const yillar = [
      yil({ year: 2021, playCount: 20000, discoveryRate: 0.9, genreVariety: 50 }),
      yil({ year: 2022, playCount: 7000, discoveryRate: 0.45, genreVariety: 18, loyalty: 4 }),
    ]
    const uc = yolculukUclari(yillar)
    const s = yilSahnesi(yillar[1]!, uc)
    expect(s.agirlik).toBeLessThan(0.6)
  })
})

describe('yilSahnesi — sınır koşulları', () => {
  it('tek yıllık yolculukta çökmez', () => {
    const yillar = [yil({ year: 2025, playCount: 5000 })]
    const uc = yolculukUclari(yillar)
    expect(() => yilSahnesi(yillar[0]!, uc)).not.toThrow()
  })

  it('sıfır çalmalı yılda çökmez ve manşeti abartmaz', () => {
    const yillar = [yil({ year: 2019, playCount: 0, discoveryRate: 0, genreVariety: 0, loyalty: 0 }), yil({ year: 2020, playCount: 9000 })]
    const uc = yolculukUclari(yillar)
    const s = yilSahnesi(yillar[0]!, uc)
    expect(s.agirlik).toBeLessThanOrEqual(0.5)
  })

  it('ağırlık her zaman 0..1 aralığında', () => {
    const yillar = [
      yil({ year: 2019, playCount: 1 }),
      yil({ year: 2023, playCount: 99999, discoveryRate: 1, genreVariety: 80, loyalty: 40 }),
    ]
    const uc = yolculukUclari(yillar)
    for (const y of yillar) {
      const s = yilSahnesi(y, uc)
      expect(s.agirlik).toBeGreaterThanOrEqual(0)
      expect(s.agirlik).toBeLessThanOrEqual(1)
    }
  })
})

describe('mansetOlcegi', () => {
  it('ağırlıkla birlikte büyür', () => {
    expect(mansetOlcegi(1)).toBeGreaterThan(mansetOlcegi(0))
  })

  it('sakin yıl ile zirve yıl arasında belirgin fark var', () => {
    // Yolculuk filminin geniş açı ↔ yakın plan farkı.
    expect(mansetOlcegi(1) / mansetOlcegi(0)).toBeGreaterThan(2)
  })

  it('manşet, yıl rakamından BÜYÜK olabilmeli (hiyerarşi)', () => {
    /*
     * ⚠ Canlı görsel kontrolde yakalandı: ilk ölçekle (taban 3.2rem)
     * manşet, yanındaki yıl rakamından (≈7rem) küçük kalıyordu ve göz
     * önce "2020"yi görüyordu. Manşet o sayfanın kahramanı — yıl
     * yalnız adres.
     */
    expect(mansetOlcegi(1)).toBeGreaterThan(7)
  })

  it('makul tipografi aralığında kalır', () => {
    expect(mansetOlcegi(0)).toBeGreaterThanOrEqual(5)
    expect(mansetOlcegi(1)).toBeLessThanOrEqual(12.5)
  })
})

/**
 * ─── Etiket ↔ sahne çelişkisi (2026-08-25, journey turu) ────────────────
 *
 * Canlı ölçümde aynı yılın başlığı ile kompozisyonu birbirini yalanlıyordu:
 *   2021 → sahne `sakin`   · etiket "Keşif Patlaması"
 *   2026 → sahne `dagilma` · etiket "Sadakat Dönemi"
 * Ayrıca 2020 ve 2021 aynı etiketi taşıyordu.
 *
 * Sebep: iki bağımsız sınıflandırıcı — etiket SABİT eşik (`palette.ts`),
 * sahne KIYAS (`yil-sahnesi.ts`). Aynı yıla iki ad veriyorlardı.
 */
describe('etiketSahneyleCelisiyorMu', () => {
  it('etiket ile sahne uyuşuyorsa çelişki yok', () => {
    expect(etiketSahneyleCelisiyorMu('PEAK VOLUME', 'hacim')).toBe(false)
    expect(etiketSahneyleCelisiyorMu('DISCOVERY SURGE', 'kesif')).toBe(false)
    expect(etiketSahneyleCelisiyorMu('LOYALTY ERA', 'baglilik')).toBe(false)
  })

  it('🔴 ölçülen iki gerçek çelişkiyi yakalar', () => {
    // 2021 — sakin bir yılda "patlama" olmaz.
    expect(etiketSahneyleCelisiyorMu('DISCOVERY SURGE', 'sakin')).toBe(true)
    // 2026 — dağılma ile sadakat zıt iki hikâye.
    expect(etiketSahneyleCelisiyorMu('LOYALTY ERA', 'dagilma')).toBe(true)
  })

  it('tür adı bir sahne İDDİA ETMEZ — hangi sahnede olursa olsun kalır', () => {
    /*
     * "HİP-HOP DÖNEMİ" yalnız o yıl neyin baskın olduğunu söyler; hacim,
     * keşif ya da dağılma iddiası taşımaz. Gizlemek bilgi kaybı olurdu.
     */
    for (const sahne of ['hacim', 'kesif', 'baglilik', 'dagilma', 'sakin'] as const) {
      expect(etiketSahneyleCelisiyorMu('HIP-HOP ERA', sahne)).toBe(false)
      expect(etiketSahneyleCelisiyorMu('POP', sahne)).toBe(false)
    }
  })

  it('boş etiket çelişki sayılmaz', () => {
    expect(etiketSahneyleCelisiyorMu('', 'sakin')).toBe(false)
  })

  it('küçük harfli etiket de yakalanır', () => {
    // Etiket biçimlendirmeden geçebilir; karşılaştırma buna dayanıklı olmalı.
    expect(etiketSahneyleCelisiyorMu('Discovery Surge', 'sakin')).toBe(true)
  })
})
