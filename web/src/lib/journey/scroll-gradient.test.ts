import { describe, expect, it } from 'vitest'
import { blendJourneyYearColors, getJourneyYearColors } from './palette'
import { journeyColorIndexFromSections } from './scroll-gradient'

describe('blendJourneyYearColors', () => {
  const palettes = [0, 1, 2, 3].map((i) => getJourneyYearColors(i, 4))

  it('tam indekslerde diskret paleti döner', () => {
    expect(blendJourneyYearColors(0, palettes).from).toBe(palettes[0]!.from)
    expect(blendJourneyYearColors(2, palettes).accent).toBe(palettes[2]!.accent)
  })

  it('kesirli indekste komşu renkleri karıştırır', () => {
    const mid = blendJourneyYearColors(0.5, palettes)
    expect(mid.from).not.toBe(palettes[0]!.from)
    expect(mid.from).not.toBe(palettes[1]!.from)
  })
})

describe('journeyColorIndexFromSections', () => {
  it('boş listede 0 döner', () => {
    expect(journeyColorIndexFromSections([])).toBe(0)
  })
})
