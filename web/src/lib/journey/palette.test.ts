import { describe, expect, it } from 'vitest'
import { getJourneyYearColors, eraLabelFromYear } from './palette'
import type { JourneyYear } from './read'

/** Test için minimal JourneyYear — ilgili alanlar dolu, gerisi nötr. */
function mkYear(over: Partial<JourneyYear>): JourneyYear {
  return {
    year: 2023,
    playCount: 0,
    totalMinutes: 0,
    trackCount: 0,
    artistCount: 0,
    newArtistCount: 0,
    discoveryRate: 0,
    loyalty: 0,
    genreLabel: '',
    genreVariety: 0,
    dominantShare: 0,
    genreBreakdown: [],
    isBreakpoint: false,
    topTrack: null,
    ...over,
  }
}

/** WCAG bağıl parlaklık (sRGB). */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const TOTAL = 7 // Sahip: 2020–2026

describe('Journey paleti', () => {
  /**
   * Bu testin varlık sebebi: ilk taslakta parlak tonlar (#F43F5E, #2DD4BF)
   * seçmiştim, göze güzel geliyordu — ölçünce beyaz metinle 1.9:1 çıktı.
   * Okunmuyordu. Göz kararı YETMİYOR.
   */
  it('her yılın vurgusu beyaz metinle WCAG AA geçer (>=4.5:1)', () => {
    for (let i = 0; i < TOTAL; i++) {
      const c = getJourneyYearColors(i, TOTAL)
      expect(
        contrast('#FFFFFF', c.accent),
        `yıl ${i} vurgusu (${c.accent}) okunmuyor`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('her yılın arka planı beyaz metinle WCAG AA geçer', () => {
    for (let i = 0; i < TOTAL; i++) {
      const c = getJourneyYearColors(i, TOTAL)
      expect(contrast('#FFFFFF', c.from)).toBeGreaterThanOrEqual(4.5)
      expect(contrast('#FFFFFF', c.to)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('renk yolculuk boyunca DEĞİŞİR (türe değil, evreye bağlı)', () => {
    const first = getJourneyYearColors(0, TOTAL)
    const last = getJourneyYearColors(TOTAL - 1, TOTAL)
    expect(first.from).not.toBe(last.from)
    expect(first.accent).not.toBe(last.accent)
  })

  it('renk artık görünür EVRE İSMİ üretmez (era boş — etiket veriden gelir)', () => {
    // Plan 02 soft-touch §7: renk konumdan gelir ama İSİM konumdan gelmez.
    for (let i = 0; i < TOTAL; i++) {
      expect(getJourneyYearColors(i, TOTAL).era).toBe('')
    }
  })

  it('tek yıllık kullanıcıda renk çökmez', () => {
    const c = getJourneyYearColors(0, 1)
    expect(c.from).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('sınır dışı index güvenli (kırpılır)', () => {
    expect(getJourneyYearColors(-5, TOTAL).from).toMatch(/^#[0-9a-f]{6}$/i)
    expect(getJourneyYearColors(999, TOTAL).from).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('hep geçerli hex üretir', () => {
    for (let i = 0; i < TOTAL; i++) {
      const c = getJourneyYearColors(i, TOTAL)
      for (const v of [c.from, c.to, c.accent]) {
        expect(v).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})

describe('eraLabelFromYear — veri etiketi, hayat yorumu DEĞİL', () => {
  // recap-journey-design.md §1: kişilik/hayat yorumu YASAK. Bu test o yasağı
  // kalıcılaştırır — etiketler asla eski hayat-yorumu kelimelerine dönmemeli.
  const FORBIDDEN = ['Sessizlik', 'Açlık', 'Yerleşme', 'İçe Dönüş']

  it('en yoğun yıla MAKSİMUM HACİM der', () => {
    const y = mkYear({ playCount: 30_000 })
    expect(eraLabelFromYear(y, 30_000)).toBe('PEAK VOLUME')
  })

  it('keşif ≥%60 olan yıla KEŞİF PATLAMASI der', () => {
    const y = mkYear({ discoveryRate: 0.72, playCount: 4000 })
    expect(eraLabelFromYear(y, 30_000)).toBe('DISCOVERY SURGE')
  })

  it('az keşif + gerçek hacimli yıla SADAKAT DÖNEMİ der', () => {
    const y = mkYear({ discoveryRate: 0.18, playCount: 5000 })
    expect(eraLabelFromYear(y, 30_000)).toBe('LOYALTY ERA')
  })

  it('baskın türlü yıla <TÜR> ERA der (en-US locale: i → I)', () => {
    const y = mkYear({ dominantShare: 0.62, genreLabel: 'Hip-Hop', playCount: 3000, discoveryRate: 0.4 })
    expect(eraLabelFromYear(y, 30_000)).toBe('HIP-HOP ERA')
  })

  it('zayıf sinyalli boş yılda etiket üretmez (boşluk konuşur)', () => {
    const y = mkYear({ playCount: 100, discoveryRate: 0.4, genreLabel: '' })
    expect(eraLabelFromYear(y, 30_000)).toBe('')
  })

  it('hiçbir yasak hayat-yorumu kelimesi üretmez', () => {
    const samples = [
      mkYear({ playCount: 30_000 }),
      mkYear({ discoveryRate: 0.9, playCount: 3000 }),
      mkYear({ discoveryRate: 0.1, playCount: 8000 }),
      mkYear({ dominantShare: 0.7, genreLabel: 'Pop', playCount: 2000, discoveryRate: 0.4 }),
    ]
    for (const y of samples) {
      const label = eraLabelFromYear(y, 30_000)
      for (const bad of FORBIDDEN) expect(label).not.toContain(bad)
    }
  })
})
