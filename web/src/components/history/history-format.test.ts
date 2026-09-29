import { describe, it, expect } from 'vitest'
import { formatMinutes, formatPlays, initialOf } from './history-format'

describe('formatMinutes', () => {
  it('ms → rounds to minutes', () => {
    expect(formatMinutes(160 * 60000)).toBe('160 min')
  })
  it('binlik ayraç (en-US)', () => {
    expect(formatMinutes(2847 * 60000)).toBe('2,847 min')
  })
  it('yarım dakikayı yuvarlar', () => {
    expect(formatMinutes(90 * 1000)).toBe('2 min') // 1.5 dk → 2
  })
  it('sıfır süre', () => {
    expect(formatMinutes(0)).toBe('0 min')
  })
})

describe('formatPlays', () => {
  it('play count label', () => {
    expect(formatPlays(29)).toBe('29 plays')
    expect(formatPlays(1)).toBe('1 play')
  })
  it('binlik ayraç (en-US)', () => {
    expect(formatPlays(1234)).toBe('1,234 plays')
  })
})

describe('initialOf', () => {
  it('ilk harfi büyütür (TR)', () => {
    expect(initialOf('istanbul')).toBe('İ') // TR: i → İ
  })
  it('normal isim', () => {
    expect(initialOf('Motive')).toBe('M')
  })
  it('boş isimde nokta', () => {
    expect(initialOf('')).toBe('•')
    expect(initialOf('   ')).toBe('•')
  })
})
