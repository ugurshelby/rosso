import { describe, it, expect } from 'vitest'
import { formatDate, formatMinutes } from '@/components/catalog/listening-stats'

describe('catalog formatting helpers', () => {
  it('formats dates in Turkish/English locale accurately', () => {
    expect(formatDate(null)).toBeNull()
    const formatted = formatDate('2021-02-15T14:30:00Z')
    expect(formatted).toContain('2021')
  })

  it('formats minutes into human readable hours and minutes', () => {
    expect(formatMinutes(45)).toBe('45 dk')
    expect(formatMinutes(60)).toBe('1 saat')
    expect(formatMinutes(125)).toBe('2s 5dk')
    expect(formatMinutes(6380)).toBe('106s 20dk')
  })
})
