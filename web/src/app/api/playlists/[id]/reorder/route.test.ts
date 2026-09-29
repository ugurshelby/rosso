// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/services/token-refresh', () => ({
  ensureValidToken: vi.fn(),
}))
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 19, resetAt: Date.now() + 60_000 })),
}))
vi.mock('@/lib/playlists/fetch-retry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/playlists/fetch-retry')>(
    '@/lib/playlists/fetch-retry',
  )
  return { ...actual, fetchWithRetry: vi.fn() }
})

import { POST } from './route'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { fetchWithRetry } from '@/lib/playlists/fetch-retry'

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/playlists/pl1/reorder', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

const routeContext = { params: Promise.resolve({ id: 'pl1' }) }

function mockUser(id = 'u1'): void {
  vi.mocked(getCurrentUser).mockResolvedValue({ id } as User)
}

function mockRateLimit(allowed: boolean): void {
  vi.mocked(checkRateLimit).mockReturnValue({
    allowed,
    remaining: allowed ? 19 : 0,
    resetAt: Date.now() + 60_000,
  })
}

/** playlist_tracks güncellemelerinin sırasını kaydeder (takas mantığının
 * doğru çalıştığını doğrulamak için — hangi position'a ne yazıldı). */
function mockSupabase(
  playlistRow: { platform_id: string; track_count: number },
  tracksRows: Array<{ track_id: string; position: number }>,
): { updates: Array<{ position: number }> } {
  const updates: Array<{ position: number }> = []

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'playlists') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: playlistRow }),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
        }
      }
      // playlist_tracks
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        // Gerçek route: .update(patch).eq('playlist_id', x).eq('position', y)
        // — iki `.eq()` zinciri. İlki obje döndürür (zincirlenebilir), ikinci
        // çağrı Promise'e (Supabase gerçek davranışı) düşer.
        update: vi.fn((patch: { position: number }) => {
          updates.push({ position: patch.position })
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }),
        in: vi.fn(() => Promise.resolve({ data: tracksRows })),
      }
    }),
  }

  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  )
  return { updates }
}

function mockSpotifyOk(snapshotId = 'snap-1'): void {
  vi.mocked(fetchWithRetry).mockResolvedValue({
    ok: true,
    json: async () => ({ snapshot_id: snapshotId }),
  } as Response)
}

describe('POST /api/playlists/[id]/reorder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await POST(makeRequest({ position: 2, direction: 'up' }), routeContext)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockUser()
    mockRateLimit(false)
    const res = await POST(makeRequest({ position: 2, direction: 'up' }), routeContext)
    expect(res.status).toBe(429)
  })

  it('returns 400 for invalid position', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await POST(makeRequest({ position: -1, direction: 'up' }), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid direction', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await POST(makeRequest({ position: 2, direction: 'sideways' }), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 400 when moving up from position 0', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await POST(makeRequest({ position: 0, direction: 'up' }), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 404 when playlist not found', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase(null as unknown as { platform_id: string; track_count: number }, [])
    const res = await POST(makeRequest({ position: 1, direction: 'up' }), routeContext)
    expect(res.status).toBe(404)
  })

  it('returns 400 when moving down from last position', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1', track_count: 3 }, [])
    const res = await POST(makeRequest({ position: 2, direction: 'down' }), routeContext)
    expect(res.status).toBe(400)
  })

  it('sends correct range_start/insert_before for moving up', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1', track_count: 5 }, [
      { track_id: 't2', position: 2 },
      { track_id: 't1', position: 1 },
    ])
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    mockSpotifyOk()

    const res = await POST(makeRequest({ position: 2, direction: 'up' }), routeContext)

    expect(res.status).toBe(200)
    const call = vi.mocked(fetchWithRetry).mock.calls[0]
    const init = call?.[1] as RequestInit
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ range_start: 2, insert_before: 1, range_length: 1 })
  })

  it('sends correct range_start/insert_before for moving down', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1', track_count: 5 }, [
      { track_id: 't2', position: 2 },
      { track_id: 't3', position: 3 },
    ])
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    mockSpotifyOk()

    const res = await POST(makeRequest({ position: 2, direction: 'down' }), routeContext)

    expect(res.status).toBe(200)
    const call = vi.mocked(fetchWithRetry).mock.calls[0]
    const init = call?.[1] as RequestInit
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ range_start: 2, insert_before: 4, range_length: 1 })
  })

  it('swaps DB positions via temp value (avoids unique constraint clash)', async () => {
    mockUser()
    mockRateLimit(true)
    const { updates } = mockSupabase({ platform_id: 'spotify-pl-1', track_count: 5 }, [
      { track_id: 't2', position: 2 },
      { track_id: 't1', position: 1 },
    ])
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    mockSpotifyOk()

    await POST(makeRequest({ position: 2, direction: 'up' }), routeContext)

    // Üç adım: geçici değere, hedefe, geri hedefe — sırayla.
    expect(updates).toEqual([{ position: -1 }, { position: 2 }, { position: 1 }])
  })

  it('returns 400 when Spotify not connected', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1', track_count: 5 }, [])
    vi.mocked(ensureValidToken).mockResolvedValue(null)
    const res = await POST(makeRequest({ position: 2, direction: 'up' }), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 502 when Spotify rejects the reorder', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1', track_count: 5 }, [])
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    vi.mocked(fetchWithRetry).mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as Response)

    const res = await POST(makeRequest({ position: 2, direction: 'up' }), routeContext)
    expect(res.status).toBe(502)
  })
})
