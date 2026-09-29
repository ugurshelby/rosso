import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mock apiAuth — use vi.hoisted so the variable is available when vi.mock
// factory is hoisted to the top of the file by Vitest.
// ---------------------------------------------------------------------------

const { apiAuthMock } = vi.hoisted(() => ({
  apiAuthMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  apiAuth: apiAuthMock,
  getCurrentUser: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock analytics engine
// ---------------------------------------------------------------------------

const mockSummary = {
  total_ms: 500_000,
  total_tracks: 10,
  total_artists: 5,
  total_playlists: 0,
}

const mockTopTracks = [
  {
    track_id: 'track-1',
    raw_track_name: 'Song A',
    raw_artist_name: 'Artist X',
    play_count: 20,
    total_ms: 200_000,
    skip_count: 2,
  },
]

const mockTopArtists = [
  { artist_name: 'Artist X', play_count: 20, total_ms: 200_000 },
]

const mockHourly = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  play_count: 0,
  total_ms: 0,
}))

const mockPlatform = [{ source: 'spotify', play_count: 20, percentage: 100 }]

vi.mock('@/lib/analytics/engine', () => ({
  getTotalListeningTime: vi.fn(async () => mockSummary),
  getTopTracks: vi.fn(async () => mockTopTracks),
  getTopArtists: vi.fn(async () => mockTopArtists),
  getHourlyPattern: vi.fn(async () => mockHourly),
  getPlatformBreakdown: vi.fn(async () => mockPlatform),
}))

// ---------------------------------------------------------------------------
// Import handler after mocks
// ---------------------------------------------------------------------------

import { GET } from './route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/analytics/recap')
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val)
  }
  return new NextRequest(url)
}

beforeEach(() => {
  apiAuthMock.mockReset()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/analytics/recap', () => {
  it('oturum yoksa JSON 401 döner — YÖNLENDİRMEZ (2026-08-22)', async () => {
    /*
     * Eski hâl `requireAuth()` kullanıyordu ve o `redirect()` çağırıyor:
     * yanıt HTTP 307 + HTML login sayfası oluyordu. Testin eski adı bile
     * bunu itiraf ediyordu — "401-EQUIVALENT redirect".
     *
     * `fetch()` ile çağıran istemci JSON beklerken HTML alıyor, `.json()`
     * ayrıştırma hatası veriyor ve gerçek sebep ("oturum yok") kayboluyordu.
     * Artık gerçekten 401.
     */
    apiAuthMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'You need to sign in.' }, { status: 401 }),
    })

    const res = await GET(makeRequest({ period: 'month' }))

    expect(res.status).toBe(401)
    expect(res.headers.get('location'), '401 yanıtı yönlendirme içermemeli').toBeNull()
    const govde = (await res.json()) as { error?: string }
    expect(govde.error).toBeTruthy()
  })

  it('returns 400 for invalid period', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'user-1', email: 'a@b.com' } })

    const response = await GET(makeRequest({ period: 'invalid-period' }))
    expect(response.status).toBe(400)

    const body = await response.json() as { error: string }
    expect(body).toHaveProperty('error')
  })

  it('returns 400 for missing period (defaults to month — actually valid)', async () => {
    // Default is 'month' which is valid, so this should return 200
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'user-1', email: 'a@b.com' } })

    const response = await GET(makeRequest({})) // no period param
    expect(response.status).toBe(200)
  })

  it('returns 200 with correct shape for valid period', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'user-1', email: 'a@b.com' } })

    const response = await GET(makeRequest({ period: 'month' }))
    expect(response.status).toBe(200)

    const body = await response.json() as {
      totalTime: unknown
      topTracks: unknown
      topArtists: unknown
      hourlyPattern: unknown
      platformBreakdown: unknown
    }

    expect(body).toHaveProperty('totalTime')
    expect(body).toHaveProperty('topTracks')
    expect(body).toHaveProperty('topArtists')
    expect(body).toHaveProperty('hourlyPattern')
    expect(body).toHaveProperty('platformBreakdown')
  })

  it('totalTime shape is correct', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'user-1', email: 'a@b.com' } })

    const response = await GET(makeRequest({ period: 'week' }))
    const body = await response.json() as { totalTime: typeof mockSummary }

    expect(body.totalTime).toMatchObject({
      total_ms: expect.any(Number),
      total_tracks: expect.any(Number),
      total_artists: expect.any(Number),
      total_playlists: expect.any(Number),
    })
  })

  it('topTracks is an array with track shape', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'user-1', email: 'a@b.com' } })

    const response = await GET(makeRequest({ period: 'year' }))
    const body = await response.json() as {
      topTracks: Array<{
        track_id: string | null
        raw_track_name: string | null
        raw_artist_name: string | null
        play_count: number
        total_ms: number
        skip_count: number
      }>
    }

    expect(Array.isArray(body.topTracks)).toBe(true)
    if (body.topTracks.length > 0) {
      expect(body.topTracks[0]).toMatchObject({
        play_count: expect.any(Number),
        total_ms: expect.any(Number),
        skip_count: expect.any(Number),
      })
    }
  })

  it('hourlyPattern always has 24 entries', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'user-1', email: 'a@b.com' } })

    const response = await GET(makeRequest({ period: 'alltime' }))
    const body = await response.json() as { hourlyPattern: unknown[] }

    expect(body.hourlyPattern).toHaveLength(24)
  })

  it('accepts all valid period values', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'user-1', email: 'a@b.com' } })

    const periods = ['week', 'month', 'year', 'alltime'] as const
    for (const period of periods) {
      const response = await GET(makeRequest({ period }))
      expect(response.status).toBe(200)
    }
  })
})
