import { describe, it, expect, vi } from 'vitest'

// server-only importunu no-op yap (test ortamı).
vi.mock('server-only', () => ({}))

import { localHour, localWeekday, localDayKey, localYear } from './timezone'

describe('timezone (Europe/Istanbul, UTC+3)', () => {
  it('localHour: UTC saatini +3 kaydırır', () => {
    // 17:00Z → İstanbul 20:00
    expect(localHour('2024-06-15T17:00:00Z')).toBe(20)
    // 21:00Z → İstanbul 00:00 (ertesi gün başı)
    expect(localHour('2024-06-15T21:00:00Z')).toBe(0)
  })

  it('localHour: gece devri doğru (02:00Z → 05:00)', () => {
    expect(localHour('2024-06-15T02:00:00Z')).toBe(5)
  })

  it('localWeekday: gece UTC dinlemesi doğru güne düşer', () => {
    // 2024-06-15 Cumartesi 22:00Z → İstanbul Pazar 01:00 → weekday 0 (Pazar)
    expect(localWeekday('2024-06-15T22:00:00Z')).toBe(0)
    // 2024-06-15 Cumartesi 10:00Z → İstanbul Cumartesi 13:00 → weekday 6
    expect(localWeekday('2024-06-15T10:00:00Z')).toBe(6)
  })

  it('localDayKey: gece UTC dinlemesi ertesi güne geçer', () => {
    // 22:00Z 15 Haziran → İstanbul 01:00 16 Haziran
    expect(localDayKey('2024-06-15T22:00:00Z')).toBe('2024-06-16')
    // 05:00Z 15 Haziran → İstanbul 08:00 15 Haziran
    expect(localDayKey('2024-06-15T05:00:00Z')).toBe('2024-06-15')
  })

  it('localYear: yıl sınırında UTC gecesi doğru yıla düşer', () => {
    // 31 Aralık 2023 22:00Z → İstanbul 1 Ocak 2024 01:00 → 2024
    expect(localYear('2023-12-31T22:00:00Z')).toBe(2024)
    expect(localYear('2024-06-15T10:00:00Z')).toBe(2024)
  })
})
