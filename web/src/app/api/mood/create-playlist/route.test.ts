// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/analytics/mood', () => ({
  moodByKey: vi.fn(),
  // 2026-09-20: export artık ÖNCE paketi okuyor (kullanıcının ekranda gördüğü
  // liste), yalnız paket yoksa canlı RPC'ye düşüyor.
  getMoodPackage: vi.fn(),
  getMoodPlaylist: vi.fn(),
  getMoodWorkspace: vi.fn(),
  MOOD_TRACK_LIMIT: 50,
}))
vi.mock('@/lib/playlists/generate', () => ({
  createPlaylistFromTracks: vi.fn(),
}))
vi.mock('@/lib/playlists/mood-cover-upload', () => ({
  uploadMoodCoverToSpotify: vi.fn(),
}))
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 4, resetAt: Date.now() + 60_000 })),
  PAHALI_URETIM_LIMIT: { limit: 5, windowMs: 60_000 },
  rateLimitRetryAfterSeconds: vi.fn(() => 30),
}))

import { POST } from './route'
import { createClient } from '@/lib/supabase/server'
import { moodByKey, getMoodPackage, getMoodPlaylist, getMoodWorkspace } from '@/lib/analytics/mood'
import { createPlaylistFromTracks } from '@/lib/playlists/generate'
import { uploadMoodCoverToSpotify } from '@/lib/playlists/mood-cover-upload'
import { checkRateLimit } from '@/lib/security/rate-limit'

const MOOD_KEY = 'gece_217'

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/mood/create-playlist', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function mockAuth(user: { id: string } | null): void {
  const eq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn(() => ({ eq }))
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn(() => ({ update })),
  }
  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  )
}

function mockRateLimit(allowed: boolean): void {
  vi.mocked(checkRateLimit).mockReturnValue({
    allowed,
    remaining: allowed ? 4 : 0,
    resetAt: Date.now() + 60_000,
  })
}

const MOOD_DEF = {
  key: MOOD_KEY,
  emoji: '🌙',
  title: 'Gecenin Üçü',
  tagline: 'sakin gece',
  tint: '#5b7ea6',
} as ReturnType<typeof moodByKey>

describe('POST /api/mood/create-playlist', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth(null)
    const res = await POST(makeRequest({ moodKey: MOOD_KEY }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited (expensive-write guard)', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(false)
    const res = await POST(makeRequest({ moodKey: MOOD_KEY }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
  })

  it('returns 422 for invalid moodKey', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    const res = await POST(makeRequest({ moodKey: 'bilinmeyen' }))
    expect(res.status).toBe(422)
  })

  it('returns 404 when mood is unknown to moodByKey (defensive check)', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    vi.mocked(moodByKey).mockReturnValue(undefined)
    // Şemadan geçen ama moodByKey'in tanımadığı bir değer olamaz normalde
    // (enum aynı listeden), ama savunma kontrolü test edilir.
    const res = await POST(makeRequest({ moodKey: MOOD_KEY }))
    expect(res.status).toBe(404)
  })

  /*
   * 🔴 2026-09-20 kalite denetimi: SAYFA ile EXPORT aynı listeyi kullanmalı.
   *
   * Sayfa `mood_pkg`'yi (AI kürasyonu) gösteriyor; bu uç eskiden HER ZAMAN
   * canlı `mood_playlist` RPC'sini çağırıyordu. Kullanıcı ekranda gözden
   * geçirdiği listeyi gönderdiğini sanıyor, Spotify'a hiç görmediği parçalar
   * gidiyordu. Bu iki test o eşleşmeyi kilitler.
   */
  it('paket varsa EXPORT paketi kullanır (kullanıcının gördüğü liste)', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    vi.mocked(moodByKey).mockReturnValue(MOOD_DEF)
    vi.mocked(getMoodPackage).mockResolvedValue([{ trackId: 'paket-1' }] as never)
    vi.mocked(getMoodPlaylist).mockResolvedValue([{ trackId: 'rpc-1' }] as never)
    vi.mocked(getMoodWorkspace).mockResolvedValue({ hiddenTrackIds: [] } as never)
    vi.mocked(createPlaylistFromTracks).mockResolvedValue({
      ok: true, name: 'X', totalTracks: 1,
      outcomes: [{ platform: 'spotify', status: 'completed', playlistId: 'pl-1', playlistDbId: 'db-1', trackCount: 1 }],
    })
    vi.mocked(uploadMoodCoverToSpotify).mockResolvedValue({ ok: true })

    await POST(makeRequest({ moodKey: MOOD_KEY }))

    expect(getMoodPlaylist).not.toHaveBeenCalled()
    expect(vi.mocked(createPlaylistFromTracks).mock.calls[0][1]).toEqual(['paket-1'])
  })

  it('paket YOKSA canlı RPC yoluna düşer (ilk tur / henüz üretilmemiş)', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    vi.mocked(moodByKey).mockReturnValue(MOOD_DEF)
    vi.mocked(getMoodPackage).mockResolvedValue(null)
    vi.mocked(getMoodPlaylist).mockResolvedValue([{ trackId: 'rpc-1' }] as never)
    vi.mocked(getMoodWorkspace).mockResolvedValue({ hiddenTrackIds: [] } as never)
    vi.mocked(createPlaylistFromTracks).mockResolvedValue({
      ok: true, name: 'X', totalTracks: 1,
      outcomes: [{ platform: 'spotify', status: 'completed', playlistId: 'pl-1', playlistDbId: 'db-1', trackCount: 1 }],
    })
    vi.mocked(uploadMoodCoverToSpotify).mockResolvedValue({ ok: true })

    await POST(makeRequest({ moodKey: MOOD_KEY }))

    expect(getMoodPlaylist).toHaveBeenCalled()
    expect(vi.mocked(createPlaylistFromTracks).mock.calls[0][1]).toEqual(['rpc-1'])
  })

  it('returns 404 when no tracks available after hiding excluded ones', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    vi.mocked(moodByKey).mockReturnValue(MOOD_DEF)
    vi.mocked(getMoodPlaylist).mockResolvedValue([{ trackId: 't1' }] as never)
    vi.mocked(getMoodWorkspace).mockResolvedValue({ hiddenTrackIds: ['t1'] } as never)

    const res = await POST(makeRequest({ moodKey: MOOD_KEY }))
    expect(res.status).toBe(404)
    expect(createPlaylistFromTracks).not.toHaveBeenCalled()
  })

  it('excludes user-hidden tracks from the Spotify payload (server reads workspace itself)', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    vi.mocked(moodByKey).mockReturnValue(MOOD_DEF)
    vi.mocked(getMoodPlaylist).mockResolvedValue([
      { trackId: 't1' }, { trackId: 't2' }, { trackId: 't3' },
    ] as never)
    vi.mocked(getMoodWorkspace).mockResolvedValue({ hiddenTrackIds: ['t2'] } as never)
    vi.mocked(createPlaylistFromTracks).mockResolvedValue({
      ok: true, name: 'Gecenin Üçü', totalTracks: 2,
      outcomes: [{ platform: 'spotify', status: 'completed', playlistId: 'pl-1', playlistDbId: 'db-1', trackCount: 2 }],
    })
    vi.mocked(uploadMoodCoverToSpotify).mockResolvedValue({ ok: true })

    const res = await POST(makeRequest({ moodKey: MOOD_KEY }))
    expect(res.status).toBe(200)

    const calledWith = vi.mocked(createPlaylistFromTracks).mock.calls[0]
    expect(calledWith[1]).toEqual(['t1', 't3']) // t2 hariç
    // skipAutoCover=true — mood kendi kapağını kullanır, genel kolaj boşa gitmesin.
    expect(calledWith[5]).toBe(true)
  })

  it('uploads mood cover after successful Spotify creation and mirrors it to our own playlist row', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    vi.mocked(moodByKey).mockReturnValue(MOOD_DEF)
    vi.mocked(getMoodPlaylist).mockResolvedValue([{ trackId: 't1' }] as never)
    vi.mocked(getMoodWorkspace).mockResolvedValue({ hiddenTrackIds: [] } as never)
    vi.mocked(createPlaylistFromTracks).mockResolvedValue({
      ok: true, name: 'Gecenin Üçü', totalTracks: 1,
      outcomes: [{ platform: 'spotify', status: 'completed', playlistId: 'pl-1', playlistDbId: 'db-1', trackCount: 1 }],
    })
    vi.mocked(uploadMoodCoverToSpotify).mockResolvedValue({ ok: true })

    const res = await POST(makeRequest({ moodKey: MOOD_KEY }))
    expect(res.status).toBe(200)
    expect(uploadMoodCoverToSpotify).toHaveBeenCalledWith('u1', 'pl-1', MOOD_KEY)
  })

  it('does not attempt cover upload when Spotify outcome failed', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    vi.mocked(moodByKey).mockReturnValue(MOOD_DEF)
    vi.mocked(getMoodPlaylist).mockResolvedValue([{ trackId: 't1' }] as never)
    vi.mocked(getMoodWorkspace).mockResolvedValue({ hiddenTrackIds: [] } as never)
    vi.mocked(createPlaylistFromTracks).mockResolvedValue({
      ok: false, name: 'Gecenin Üçü', totalTracks: 1,
      outcomes: [{ platform: 'spotify', status: 'failed', playlistId: null, playlistDbId: null, trackCount: 0, error: 'no_matched_tracks' }],
    })

    const res = await POST(makeRequest({ moodKey: MOOD_KEY }))
    expect(res.status).toBe(200)
    expect(uploadMoodCoverToSpotify).not.toHaveBeenCalled()
  })

  it('returns 500 with message when createPlaylistFromTracks throws', async () => {
    mockAuth({ id: 'u1' })
    mockRateLimit(true)
    vi.mocked(moodByKey).mockReturnValue(MOOD_DEF)
    vi.mocked(getMoodPlaylist).mockResolvedValue([{ trackId: 't1' }] as never)
    vi.mocked(getMoodWorkspace).mockResolvedValue({ hiddenTrackIds: [] } as never)
    vi.mocked(createPlaylistFromTracks).mockRejectedValue(new Error('Spotify create playlist error: 403'))

    const res = await POST(makeRequest({ moodKey: MOOD_KEY }))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toContain('403')
  })
})
