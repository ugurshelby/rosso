/**
 * Dönem tanımı — sunucu ve istemci ortak (server-only DEĞİL).
 * Dönemler takvim değil KAYAN penceredir: week = son 7 gün, month = son 1 ay,
 * year = son 1 yıl, alltime = hepsi.
 */
export type Period = 'week' | 'month' | 'year' | 'alltime'

export interface PeriodRange {
  from: Date | null
  to: Date
}

export function getDateRange(period: Period): PeriodRange {
  const to = new Date()
  if (period === 'alltime') {
    return { from: null, to }
  }
  const from = new Date(to)
  if (period === 'week') {
    from.setUTCDate(from.getUTCDate() - 7)
  } else if (period === 'month') {
    from.setUTCMonth(from.getUTCMonth() - 1)
  } else {
    // year
    from.setUTCFullYear(from.getUTCFullYear() - 1)
  }
  return { from, to }
}

