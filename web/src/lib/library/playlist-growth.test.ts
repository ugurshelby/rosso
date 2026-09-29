import { describe, it, expect, vi } from 'vitest'

/**
 * A8 — Playlist büyüme serisi testleri.
 *
 * Buradaki asıl risk grafik çizimi değil, **ne zaman çizilmeyeceği**:
 * eşleşmeyen playlist'te seri boş döner ve UI hiçbir şey göstermemeli.
 * "Veri yoksa özellik yok" kuralı bir kod yolu, bu testler onun bekçisi.
 */

vi.mock('server-only', () => ({}))

import {
  hasGrowthStory,
  peakMonth,
  monthLabel,
  MIN_GROWTH_POINTS,
  type GrowthPoint,
} from './playlist-growth'

function pt(month: string, added: number, cumulative: number): GrowthPoint {
  return { month, added, cumulative }
}

describe('hasGrowthStory — çizmeye değer mi', () => {
  it('boş seri anlatı taşımaz', () => {
    expect(hasGrowthStory([])).toBe(false)
  })

  it('tek nokta bir eğri değildir', () => {
    expect(hasGrowthStory([pt('2026-01-01', 5, 5)])).toBe(false)
  })

  it('iki nokta hâlâ yetersiz', () => {
    expect(hasGrowthStory([pt('2026-01-01', 5, 5), pt('2026-02-01', 3, 8)])).toBe(false)
  })

  it('eşik tam üç noktada geçilir', () => {
    const seri = [
      pt('2026-01-01', 5, 5),
      pt('2026-02-01', 3, 8),
      pt('2026-03-01', 2, 10),
    ]
    expect(seri).toHaveLength(MIN_GROWTH_POINTS)
    expect(hasGrowthStory(seri)).toBe(true)
  })
})

describe('peakMonth — tek vurgu noktası', () => {
  it('boş seride nokta yok', () => {
    expect(peakMonth([])).toBeNull()
  })

  it('en çok şarkı eklenen ayı bulur', () => {
    const seri = [
      pt('2024-06-01', 82, 2394),
      pt('2024-07-01', 904, 3298), // canlı veriden: gerçek tepe
      pt('2024-08-01', 20, 3318),
    ]
    expect(peakMonth(seri)?.month).toBe('2024-07-01')
  })

  it('beraberlikte SON ay kazanır — yakın olan daha anlamlıdır', () => {
    const seri = [
      pt('2025-01-01', 100, 100),
      pt('2025-02-01', 50, 150),
      pt('2025-03-01', 100, 250),
    ]
    expect(peakMonth(seri)?.month).toBe('2025-03-01')
  })

  it('kümülatif değil EKLENEN sayıya bakar', () => {
    // Kümülatif her zaman artar; ona baksaydı hep son ay tepe olurdu.
    const seri = [
      pt('2025-01-01', 500, 500),
      pt('2025-02-01', 1, 501),
      pt('2025-03-01', 1, 502),
    ]
    expect(peakMonth(seri)?.month).toBe('2025-01-01')
  })
})

describe('monthLabel — Türkçe ay etiketi', () => {
  it('ay adını Türkçe verir', () => {
    expect(monthLabel('2024-07-01')).toBe('July 2024')
    expect(monthLabel('2020-10-01')).toBe('October 2020')
    expect(monthLabel('2026-06-01')).toBe('June 2026')
  })

  it('bozuk girdide çökmez, ham değeri döndürür', () => {
    expect(monthLabel('saçma')).toBe('saçma')
    expect(monthLabel('2024-13-01')).toBe('2024-13-01')
    expect(monthLabel('2024-00-01')).toBe('2024-00-01')
  })
})
