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

import { PATCH } from './route'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { fetchWithRetry } from '@/lib/playlists/fetch-retry'

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/playlists/pl1/details', {
    method: 'PATCH',
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

function mockSupabase(playlistRow: { platform_id: string } | null): void {
  const updateEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: playlistRow }),
    update: vi.fn(() => ({ eq: updateEq })),
  }
  const client = { from: vi.fn(() => chain) }
  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  )
}

function mockSpotifyOk(): void {
  vi.mocked(fetchWithRetry).mockResolvedValue({ ok: true } as Response)
}

function sentBody(): Record<string, unknown> {
  const call = vi.mocked(fetchWithRetry).mock.calls[0]
  const init = call?.[1] as RequestInit
  return JSON.parse(init.body as string) as Record<string, unknown>
}

describe('PATCH /api/playlists/[id]/details', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await PATCH(makeRequest({ name: 'Yeni ad' }), routeContext)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockUser()
    mockRateLimit(false)
    const res = await PATCH(makeRequest({ name: 'Yeni ad' }), routeContext)
    expect(res.status).toBe(429)
  })

  it('returns 400 when neither name nor description provided', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await PATCH(makeRequest({}), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty name', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await PATCH(makeRequest({ name: '   ' }), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 400 for name over 100 chars', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await PATCH(makeRequest({ name: 'a'.repeat(101) }), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 404 when playlist not found', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase(null)
    const res = await PATCH(makeRequest({ name: 'Yeni ad' }), routeContext)
    expect(res.status).toBe(404)
  })

  it('returns 400 when Spotify not connected', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1' })
    vi.mocked(ensureValidToken).mockResolvedValue(null)
    const res = await PATCH(makeRequest({ name: 'Yeni ad' }), routeContext)
    expect(res.status).toBe(400)
  })

  it('writes only provided fields to Spotify', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1' })
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    mockSpotifyOk()

    const res = await PATCH(makeRequest({ name: 'Yeni ad' }), routeContext)

    expect(res.status).toBe(200)
    expect(fetchWithRetry).toHaveBeenCalledWith(
      expect.stringContaining('/playlists/spotify-pl-1'),
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(sentBody()).toEqual({ name: 'Yeni ad' })
  })

  it('writes both name and description when both provided', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1' })
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    mockSpotifyOk()

    await PATCH(makeRequest({ name: 'Yeni ad', description: 'Yeni açıklama' }), routeContext)

    expect(sentBody()).toEqual({ name: 'Yeni ad', description: 'Yeni açıklama' })
  })

  it('returns 502 when Spotify rejects the update', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1' })
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    vi.mocked(fetchWithRetry).mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as Response)

    const res = await PATCH(makeRequest({ name: 'Yeni ad' }), routeContext)
    expect(res.status).toBe(502)
  })
})
