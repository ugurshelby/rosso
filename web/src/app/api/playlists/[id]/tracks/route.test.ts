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

import { POST, DELETE } from './route'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { checkRateLimit } from '@/lib/security/rate-limit'

/**
 * Test yardımcıları (B10, FAZ 4).
 *
 * Bu dosyada 19 `any` vardı (CLAUDE.md'de yasak) ve mock kurulumu üç kez
 * kopyalanmıştı. Davranış aynı — yalnız tipler dürüstleşti ve tekrar kalktı.
 */

/** Route `NextRequest` bekler; testte düz `Request` yeterli (route yalnız .json() okur). */
function makeRequest(method: 'POST' | 'DELETE', body: unknown): NextRequest {
  return new Request('http://localhost/api/playlists/pl1/tracks', {
    method,
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

/** Supabase zincirini (from→select→eq→single/update) taklit eder. */
function mockSupabase(playlistRow: { platform_id: string; snapshot_id?: string }): void {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: playlistRow }),
    update: vi.fn().mockReturnThis(),
  }
  const client = { from: vi.fn(() => chain) }
  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  )
}

function mockSpotifyOk(snapshotId: string): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ snapshot_id: snapshotId }),
  } as Response)
}

/** Spotify'a gönderilen isteğin gövdesini okur. */
function sentBody(): Record<string, unknown> {
  const call = vi.mocked(global.fetch).mock.calls[0]
  const init = call?.[1] as RequestInit
  return JSON.parse(init.body as string) as Record<string, unknown>
}

/**
 * 🔐 S4 (2026-08-10): route artık `spotifyTrackId`'yi doğruluyor
 * (22 karakter base62). Eski fixture `'t1'` idi — gerçek Spotify
 * kimliği değil; kapı eklenince 400 döndürdü ve testler düştü.
 * Fixture GERÇEĞE uyduruldu, ayrıca kapının kendisi test edildi.
 */
const GECERLI_ID = '4cOdK2wGLETKBW3PvgPWqT'

describe('POST /api/playlists/[id]/tracks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await POST(makeRequest('POST', { spotifyTrackId: GECERLI_ID }), routeContext)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockUser()
    mockRateLimit(false)
    const res = await POST(makeRequest('POST', { spotifyTrackId: GECERLI_ID }), routeContext)
    expect(res.status).toBe(429)
  })

  it('calls Spotify add-tracks endpoint and updates snapshot_id on success', async () => {
    mockUser()
    mockRateLimit(true)
    vi.mocked(ensureValidToken).mockResolvedValue('valid-token')
    mockSupabase({ platform_id: 'spotify-pl-1' })
    mockSpotifyOk('new-snap')

    const res = await POST(makeRequest('POST', { spotifyTrackId: GECERLI_ID }), routeContext)

    expect(res.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/playlists/spotify-pl-1/items'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('DELETE /api/playlists/[id]/tracks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends snapshot_id for concurrent-change protection', async () => {
    mockUser()
    mockRateLimit(true)
    vi.mocked(ensureValidToken).mockResolvedValue('valid-token')
    mockSupabase({ platform_id: 'spotify-pl-1', snapshot_id: 'current-snap' })
    mockSpotifyOk('newer-snap')

    const res = await DELETE(makeRequest('DELETE', { spotifyTrackId: GECERLI_ID }), routeContext)

    expect(res.status).toBe(200)
    expect(sentBody().snapshot_id).toBe('current-snap')
  })

  it('sends items field (not tracks) matching Spotify current API schema', async () => {
    // Canlı doğrulandı (2026-07-02): Spotify'ın DELETE /playlists/{id}/items
    // endpoint'i "tracks: [{uri}]" değil "items: [{uri}]" bekliyor —
    // eski "tracks" formatı deprecated endpoint'e ait, 400 "No uris provided" verir.
    mockUser()
    mockRateLimit(true)
    vi.mocked(ensureValidToken).mockResolvedValue('valid-token')
    mockSupabase({ platform_id: 'spotify-pl-1', snapshot_id: 'current-snap' })
    mockSpotifyOk('newer-snap')

    await DELETE(makeRequest('DELETE', { spotifyTrackId: GECERLI_ID }), routeContext)

    const body = sentBody()
    expect(body.items).toEqual([{ uri: `spotify:track:${GECERLI_ID}` }])
    expect(body.tracks).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────
// S4 — Spotify id biçim kapısı (2026-08-10)
// ─────────────────────────────────────────────────────────────────────
describe('spotifyTrackId doğrulaması', () => {
  const routeContext = { params: Promise.resolve({ id: 'p1' }) }

  it.each([
    ['boş', ''],
    ['kısa', 'abc'],
    ['boşluklu', '4cOdK2wGLETKBW3Pvg Pq'],
    ['URI enjeksiyonu', '4cOdK2wGLETKBW3Pvg","x'],
    ['sayı', 12345 as unknown as string],
  ])('geçersiz id (%s) 400 döner — Spotify\'a hiç gitmez', async (_ad, deger) => {
    const res = await POST(
      makeRequest('POST', { spotifyTrackId: deger }),
      routeContext,
    )
    expect(res.status).toBe(400)
  })
})
