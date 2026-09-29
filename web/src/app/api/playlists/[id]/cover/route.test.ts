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
vi.mock('sharp', () => {
  const chain = {
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-jpeg')),
  }
  return { default: vi.fn(() => chain) }
})

import { PUT } from './route'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { fetchWithRetry } from '@/lib/playlists/fetch-retry'

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

function makeRequestWithFile(file: File | null): NextRequest {
  const formData = new FormData()
  if (file) formData.append('cover', file)
  return { formData: async () => formData } as unknown as NextRequest
}

function makeImageFile(size = 1024, type = 'image/jpeg'): File {
  return new File([new Uint8Array(size)], 'cover.jpg', { type })
}

describe('PUT /api/playlists/[id]/cover', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await PUT(makeRequestWithFile(makeImageFile()), routeContext)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockUser()
    mockRateLimit(false)
    const res = await PUT(makeRequestWithFile(makeImageFile()), routeContext)
    expect(res.status).toBe(429)
  })

  it('returns 400 when no file provided', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await PUT(makeRequestWithFile(null), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-image file', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await PUT(makeRequestWithFile(makeImageFile(1024, 'text/plain')), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 400 for oversized file', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await PUT(makeRequestWithFile(makeImageFile(13 * 1024 * 1024)), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 404 when playlist not found', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase(null)
    const res = await PUT(makeRequestWithFile(makeImageFile()), routeContext)
    expect(res.status).toBe(404)
  })

  it('returns 400 when Spotify not connected', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1' })
    vi.mocked(ensureValidToken).mockResolvedValue(null)
    const res = await PUT(makeRequestWithFile(makeImageFile()), routeContext)
    expect(res.status).toBe(400)
  })

  it('uploads base64 JPEG with image/jpeg content-type', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1' })
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    vi.mocked(fetchWithRetry).mockResolvedValue({ ok: true } as Response)

    const res = await PUT(makeRequestWithFile(makeImageFile()), routeContext)

    expect(res.status).toBe(200)
    expect(fetchWithRetry).toHaveBeenCalledWith(
      expect.stringContaining('/playlists/spotify-pl-1/images'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ 'Content-Type': 'image/jpeg' }),
      }),
    )
    const call = vi.mocked(fetchWithRetry).mock.calls[0]
    const init = call?.[1] as RequestInit
    // Base64 gövde — JSON değil, doğrudan string.
    expect(typeof init.body).toBe('string')
    expect(() => JSON.parse(init.body as string)).toThrow()
  })

  it('returns 502 when Spotify rejects the upload', async () => {
    mockUser()
    mockRateLimit(true)
    mockSupabase({ platform_id: 'spotify-pl-1' })
    vi.mocked(ensureValidToken).mockResolvedValue('token')
    vi.mocked(fetchWithRetry).mockResolvedValue({
      ok: false,
      status: 413,
      text: async () => 'Payload too large',
    } as Response)

    const res = await PUT(makeRequestWithFile(makeImageFile()), routeContext)
    expect(res.status).toBe(502)
  })
})
