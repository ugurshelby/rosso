import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }))

import { DavetEpostaSemasi, MAX_DAVET } from './davet'

describe('DavetEpostaSemasi', () => {
  it('e-postayı kırpar ve küçük harfe çevirir', () => {
    expect(DavetEpostaSemasi.parse('  Arkadas@Ornek.COM ')).toBe('arkadas@ornek.com')
  })
  it('geçersiz e-postayı reddeder', () => {
    expect(DavetEpostaSemasi.safeParse('arkadas').success).toBe(false)
    expect(DavetEpostaSemasi.safeParse('').success).toBe(false)
  })
  it('davet sınırı Spotify Development Mode sınırının altında tutulur', () => {
    expect(MAX_DAVET).toBeLessThanOrEqual(24)
  })
})
