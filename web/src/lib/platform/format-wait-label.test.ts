import { describe, expect, it } from 'vitest'
import { formatWaitLabel } from './format-wait-label'

describe('formatWaitLabel', () => {
  it('saniye döndürür', () => {
    expect(formatWaitLabel(45)).toBe('45 seconds')
  })

  it('dakika döndürür', () => {
    expect(formatWaitLabel(300)).toBe('5 minutes')
  })

  it('saat döndürür', () => {
    expect(formatWaitLabel(7200)).toBe('2 hours')
  })
})
