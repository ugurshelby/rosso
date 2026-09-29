import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * A6 — journey arc'ının araba alanı (migration 0183).
 *
 * Test edilen asıl şey grafik değil **susma**: seans yoksa satır hiç
 * basılmamalı. Üç ayrı "veri yok" hâli var ve üçü de aynı sonuca çıkmalı:
 *   1. Eski (v1) payload — `car` anahtarı hiç YOK
 *   2. Yeni payload ama seans yok — `car: null` (canlıda ölçüldü 2026-08-02)
 *   3. Bozuk/sıfır kayıt — `car: {sessions: 0}`
 *
 * Üçünü ayrı ayrı sınamak gereksiz görünebilir; değil. `p.car as ...` tek
 * başına ilk ikisini geçirir ama üçüncüsünde "0 seans" satırı basardı.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn() }))

const rpc = vi.fn()
const maybeSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  })),
}))

import { getJourneyArc } from './read'

/** build_journey_arc payload'ının en küçük geçerli hâli. */
function payload(extra: Record<string, unknown> = {}) {
  return {
    first_track: { title: 'İlk', artist: 'A', played_at: '2020-01-01T00:00:00Z' },
    last_track: { title: 'Son', artist: 'B', played_at: '2026-06-01T00:00:00Z' },
    eras: [],
    era_count: 0,
    biggest_shift: null,
    ...extra,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Canlı "son/ilk çalınan" sorguları bu testin konusu değil — boş dönsün.
  rpc.mockResolvedValue({ data: [], error: null })
})

describe('getJourneyArc — A6 araba alanı', () => {
  it('seans varsa saat ve seans sayısı okunur', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        payload: payload({
          car: { sessions: 114, hours: 18.4, first_at: null, last_at: null },
          schema_version: 2,
        }),
      },
    })

    const arc = await getJourneyArc('u1')
    // Canlı ölçümdeki gerçek değerler (2026-08-02).
    expect(arc?.car).toEqual({ sessions: 114, hours: 18.4 })
  })

  it('eski v1 payload: `car` anahtarı yoksa null', async () => {
    maybeSingle.mockResolvedValue({
      data: { payload: payload({ schema_version: 1 }) },
    })

    const arc = await getJourneyArc('u1')
    expect(arc?.car).toBeNull()
  })

  it('seans yoksa JSON null gelir → null', async () => {
    // Canlıda ölçüldü: anahtar VAR ama değeri JSON null.
    maybeSingle.mockResolvedValue({
      data: { payload: payload({ car: null, schema_version: 2 }) },
    })

    const arc = await getJourneyArc('u1')
    expect(arc?.car).toBeNull()
  })

  it('sıfır seans bir "yolculuk" değildir → null', async () => {
    maybeSingle.mockResolvedValue({
      data: { payload: payload({ car: { sessions: 0, hours: 0 }, schema_version: 2 }) },
    })

    const arc = await getJourneyArc('u1')
    expect(arc?.car).toBeNull()
  })

  it('saat ondalıklı gelse de sayıya çevrilir (jsonb numeric → string riski)', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        payload: payload({ car: { sessions: 5, hours: '3.5' }, schema_version: 2 }),
      },
    })

    const arc = await getJourneyArc('u1')
    expect(arc?.car).toEqual({ sessions: 5, hours: 3.5 })
    expect(typeof arc?.car?.hours).toBe('number')
  })
})
