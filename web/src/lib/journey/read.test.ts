import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn() }))

const rpc = vi.fn()
const order = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ order }) }) }),
  })),
}))

import { getJourneyYears } from './read'

beforeEach(() => {
  vi.clearAllMocks()
  order.mockResolvedValue({ data: [] })
  rpc.mockResolvedValue({ data: [], error: null })
})

describe('getJourneyYears', () => {
  const row = {
    year: 2023,
    play_count: 30537,
    track_count: 4099,
    artist_count: 1583,
    new_artist_count: 885,
    discovery_rate: 0.5591,
    loyalty: 7.45,
    dominant_genre: 'Hip-Hop',
    genre_label: 'Hip-Hop',
    genre_variety: 50,
    dominant_share: 0.2134,
    genre_breakdown: [{ label: 'Hip-Hop', share: 0.2134 }],
    is_breakpoint: false,
    top_track_title: 'Vazgeçtim Senden',
    top_track_artist: 'Mavi Gri',
    top_track_plays: 120,
  }

  it('sinyalleri okur — tür HERO sade (Eklektik ön eki YOK)', async () => {
    rpc.mockResolvedValue({ data: [row], error: null })
    const [y] = await getJourneyYears('u1')
    expect(y!.genreLabel).toBe('Hip-Hop')
    expect(y!.genreLabel).not.toContain('Eklektik')
    expect(y!.genreVariety).toBe(50)
    expect(y!.discoveryRate).toBeCloseTo(0.5591)
    expect(y!.topTrack).toEqual({ title: 'Vazgeçtim Senden', artist: 'Mavi Gri', plays: 120 })
  })

  it('kırılım listesi boş gelirse çökmez', async () => {
    rpc.mockResolvedValue({ data: [{ ...row, genre_breakdown: null }], error: null })
    expect((await getJourneyYears('u1'))[0]!.genreBreakdown).toEqual([])
  })

  it('yılın şarkısı yoksa null (uydurmaz)', async () => {
    rpc.mockResolvedValue({ data: [{ ...row, top_track_title: null }], error: null })
    expect((await getJourneyYears('u1'))[0]!.topTrack).toBeNull()
  })
})

/**
 * Journey kapakları "tak diye" gelmeli (Sahip, 2026-07-21):
 * "recap geliyor ama journey yavaş; journey'de de tak diye gelmeli, lazy olmamalı."
 *
 * Migration 0125 `get_journey_year_covers`'a `image_url` ekledi. Bu testler
 * URL'in okuma katmanından GEÇTİĞİNİ kilitler — geçmezse arayüz yine lazy
 * yola düşer ve düzeltme sessizce etkisiz kalır (SBA-3'teki tuzağın aynısı).
 */
describe('getJourneyYearCovers — kapak URL’i sunucudan gelir', () => {
  it('image_url okuma katmanından imageUrl olarak geçer', async () => {
    const { getJourneyYearCovers } = await import('./read')
    rpc.mockResolvedValue({
      data: [{
        track_id: 't1',
        title: 'Lavinia',
        artist: 'Dest',
        spotify_id: 'sp1',
        image_url: 'https://storage/catalog-images/tracks/t1.jpg',
        plays: 42,
      }],
      error: null,
    })

    const out = await getJourneyYearCovers('u1', 2025)

    expect(out).toHaveLength(1)
    expect(out[0]!.imageUrl).toBe('https://storage/catalog-images/tracks/t1.jpg')
    expect(out[0]!.trackId).toBe('t1')
  })

  it('image_url boşsa null döner — bileşen eski lazy yoluna düşer', async () => {
    const { getJourneyYearCovers } = await import('./read')
    rpc.mockResolvedValue({
      data: [{
        track_id: 't2', title: 'X', artist: 'Y',
        spotify_id: 'sp2', image_url: null, plays: 3,
      }],
      error: null,
    })

    const out = await getJourneyYearCovers('u1', 2025)
    expect(out[0]!.imageUrl).toBeNull()
  })
})
