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

import { POST } from './route'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { checkRateLimit } from '@/lib/security/rate-limit'

/** Geçerli mood key (moodByKey ile eşleşmeli). */
const MOOD_KEY = 'gece_217'
/** 22 karakter base62 — gerçek Spotify track id şekli. */
const GECERLI_ID = '4cOdK2wGLETKBW3PvgPWqT'

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/mood/remove-track', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

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

/** `supabase.rpc('get_mood_workspace', ...)` çağrısını taklit eder. */
function mockWorkspace(row: { exported_playlist_id: string | null } | null): void {
  const client = {
    rpc: vi.fn().mockResolvedValue({ data: row ? [row] : [] }),
  }
  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  )
}

function mockSpotifyDelete(ok: boolean, status = 200): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => (ok ? '' : 'Spotify error body'),
  } as Response)
}

describe('POST /api/mood/remove-track', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await POST(makeRequest({ moodKey: MOOD_KEY, spotifyTrackId: GECERLI_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockUser()
    mockRateLimit(false)
    const res = await POST(makeRequest({ moodKey: MOOD_KEY, spotifyTrackId: GECERLI_ID }))
    expect(res.status).toBe(429)
  })

  it('returns 400 for unknown mood key', async () => {
    mockUser()
    mockRateLimit(true)
    const res = await POST(makeRequest({ moodKey: 'bilinmeyen-mood', spotifyTrackId: GECERLI_ID }))
    expect(res.status).toBe(400)
  })

  // 🔐 Aynı S4 kapısı playlists/[id]/tracks route'unda da var — URI enjeksiyonu.
  it.each([
    ['boş', ''],
    ['kısa', 'abc'],
    ['boşluklu', '4cOdK2wGLETKBW3Pvg Pq'],
    ['URI enjeksiyonu', '4cOdK2wGLETKBW3Pvg","x'],
  ])('geçersiz spotifyTrackId (%s) 400 döner — Spotify\'a hiç gitmez', async (_ad, deger) => {
    mockUser()
    mockRateLimit(true)
    global.fetch = vi.fn()
    const res = await POST(makeRequest({ moodKey: MOOD_KEY, spotifyTrackId: deger }))
    expect(res.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('mood never exported to Spotify → success without Spotify call', async () => {
    mockUser()
    mockRateLimit(true)
    mockWorkspace({ exported_playlist_id: null })
    global.fetch = vi.fn()

    const res = await POST(makeRequest({ moodKey: MOOD_KEY, spotifyTrackId: GECERLI_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, spotifySynced: false })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('no Spotify token → success but warns, does not call Spotify', async () => {
    mockUser()
    mockRateLimit(true)
    mockWorkspace({ exported_playlist_id: 'pl-123' })
    vi.mocked(ensureValidToken).mockResolvedValue(null)
    global.fetch = vi.fn()

    const res = await POST(makeRequest({ moodKey: MOOD_KEY, spotifyTrackId: GECERLI_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, spotifySynced: false, warning: 'no_spotify_token' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('exported playlist + valid token → calls Spotify DELETE with items format', async () => {
    mockUser()
    mockRateLimit(true)
    mockWorkspace({ exported_playlist_id: 'pl-123' })
    vi.mocked(ensureValidToken).mockResolvedValue('valid-token')
    mockSpotifyDelete(true)

    const res = await POST(makeRequest({ moodKey: MOOD_KEY, spotifyTrackId: GECERLI_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, spotifySynced: true })

    const call = vi.mocked(global.fetch).mock.calls[0]
    expect(call[0]).toBe('https://api.spotify.com/v1/playlists/pl-123/tracks')
    const init = call[1] as RequestInit
    expect(init.method).toBe('DELETE')
    // Spotify'ın DELETE /playlists/{id}/tracks ucu "items" bekler, "tracks" DEĞİL
    // (playlists/[id]/tracks route'undaki 2026-07-02 doğrulamasıyla aynı desen).
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ items: [{ uri: `spotify:track:${GECERLI_ID}` }] })
    expect(body.tracks).toBeUndefined()
  })

  it('Spotify DELETE fails → Rosso side still reports success (data already correct locally)', async () => {
    mockUser()
    mockRateLimit(true)
    mockWorkspace({ exported_playlist_id: 'pl-123' })
    vi.mocked(ensureValidToken).mockResolvedValue('valid-token')
    mockSpotifyDelete(false, 404)

    const res = await POST(makeRequest({ moodKey: MOOD_KEY, spotifyTrackId: GECERLI_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, spotifySynced: false, warning: 'spotify_remove_failed' })
  })
})
