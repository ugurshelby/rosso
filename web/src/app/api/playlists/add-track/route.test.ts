// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/playlists/spotify-target', () => ({
  addTracksToSpotify: vi.fn(),
}))

import { POST } from './route'
import { createClient } from '@/lib/supabase/server'
import { addTracksToSpotify } from '@/lib/playlists/spotify-target'

const PLAYLIST_ID = '11111111-1111-4111-8111-111111111111'
const TRACK_ID = '22222222-2222-4222-8222-222222222222'

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/playlists/add-track', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

interface SupabaseSetup {
  user: { id: string } | null
  playlist?: { id: string; user_id: string; platform: string; platform_id: string | null } | null
  track?: { id: string; spotify_id: string | null } | null
  existingTrack?: { track_id: string } | null
  lastPosition?: { position: number } | null
  insertError?: { message: string } | null
  countAfterInsert?: number | null
}

/**
 * Route şu supabase çağrılarını sırayla yapar:
 *  1. from('playlists').select().eq('id').maybeSingle()          → playlist sahiplik
 *  2. from('tracks').select().eq('id').maybeSingle()              → track var mı
 *  3. from('playlist_tracks').select().eq().eq().maybeSingle()    → zaten eklenmiş mi
 *  4. (yoksa) from('playlist_tracks').select().eq().order().limit().maybeSingle() → son pozisyon
 *  5. (yoksa) from('playlist_tracks').insert()                    → ekle
 *  6. (yoksa) from('playlist_tracks').select(count).eq().         → sayaç
 *  7. (yoksa) from('playlists').update().eq()                     → track_count senkron
 */
function mockSupabase(setup: SupabaseSetup): void {
  let playlistCallIndex = 0
  const playlistSelectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: setup.playlist ?? null }),
  }
  const playlistUpdateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }

  const trackChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: setup.track ?? null }),
  }

  let existingCallDone = false
  const playlistTracksSelectChain: Record<string, unknown> = {
    select: vi.fn(() => playlistTracksSelectChain),
    eq: vi.fn(() => playlistTracksSelectChain),
    order: vi.fn(() => playlistTracksSelectChain),
    limit: vi.fn(() => playlistTracksSelectChain),
    maybeSingle: vi.fn(() => {
      // İlk çağrı "zaten var mı?", ikinci çağrı "son pozisyon".
      if (!existingCallDone) {
        existingCallDone = true
        return Promise.resolve({ data: setup.existingTrack ?? null })
      }
      return Promise.resolve({ data: setup.lastPosition ?? null })
    }),
  }

  const insertChain = {
    insert: vi.fn().mockResolvedValue({ error: setup.insertError ?? null }),
  }

  const countChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ count: setup.countAfterInsert ?? 1 }),
  }

  let playlistTracksCallIndex = 0
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: setup.user } }) },
    from: vi.fn((table: string) => {
      if (table === 'playlists') {
        playlistCallIndex++
        // İlk çağrı: sahiplik kontrolü (select→maybeSingle). İkinci çağrı: track_count update.
        return playlistCallIndex === 1 ? playlistSelectChain : playlistUpdateChain
      }
      if (table === 'tracks') return trackChain
      if (table === 'playlist_tracks') {
        playlistTracksCallIndex++
        if (playlistTracksCallIndex <= 2) return playlistTracksSelectChain
        if (playlistTracksCallIndex === 3) return insertChain
        return countChain
      }
      throw new Error(`beklenmeyen tablo: ${table}`)
    }),
  }
  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  )
}

describe('POST /api/playlists/add-track', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 422 for invalid body (non-uuid ids)', async () => {
    mockSupabase({ user: { id: 'u1' } })
    const res = await POST(makeRequest({ playlistId: 'not-a-uuid', trackId: TRACK_ID }))
    expect(res.status).toBe(422)
  })

  it('returns 404 when playlist does not belong to user (IDOR guard)', async () => {
    mockSupabase({
      user: { id: 'u1' },
      playlist: { id: PLAYLIST_ID, user_id: 'someone-else', platform: 'spotify', platform_id: 'sp-pl-1' },
    })
    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    expect(res.status).toBe(404)
  })

  it('returns 404 when playlist not found at all', async () => {
    mockSupabase({ user: { id: 'u1' }, playlist: null })
    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    expect(res.status).toBe(404)
  })

  it('returns 404 when track not found', async () => {
    mockSupabase({
      user: { id: 'u1' },
      playlist: { id: PLAYLIST_ID, user_id: 'u1', platform: 'spotify', platform_id: 'sp-pl-1' },
      track: null,
    })
    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    expect(res.status).toBe(404)
  })

  it('adds to Rosso + Spotify when track has spotify_id and playlist is spotify-backed', async () => {
    mockSupabase({
      user: { id: 'u1' },
      playlist: { id: PLAYLIST_ID, user_id: 'u1', platform: 'spotify', platform_id: 'sp-pl-1' },
      track: { id: TRACK_ID, spotify_id: 'sp-track-1' },
      existingTrack: null,
      lastPosition: { position: 3 },
      countAfterInsert: 5,
    })
    vi.mocked(addTracksToSpotify).mockResolvedValue({ addedCount: 1, events: [] })

    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.rossoAdded).toBe(true)
    expect(json.spotifyAdded).toBe(true)
    expect(addTracksToSpotify).toHaveBeenCalledWith('u1', 'sp-pl-1', ['sp-track-1'])
  })

  it('adds to Rosso only when track has no spotify_id match (reports note)', async () => {
    mockSupabase({
      user: { id: 'u1' },
      playlist: { id: PLAYLIST_ID, user_id: 'u1', platform: 'spotify', platform_id: 'sp-pl-1' },
      track: { id: TRACK_ID, spotify_id: null },
      existingTrack: null,
      lastPosition: null,
      countAfterInsert: 1,
    })

    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rossoAdded).toBe(true)
    expect(json.spotifyAdded).toBe(false)
    expect(json.note).toMatch(/no Spotify match/)
    expect(addTracksToSpotify).not.toHaveBeenCalled()
  })

  it('is idempotent: already-present track is not re-inserted, still attempts Spotify add', async () => {
    mockSupabase({
      user: { id: 'u1' },
      playlist: { id: PLAYLIST_ID, user_id: 'u1', platform: 'spotify', platform_id: 'sp-pl-1' },
      track: { id: TRACK_ID, spotify_id: 'sp-track-1' },
      existingTrack: { track_id: TRACK_ID },
    })
    vi.mocked(addTracksToSpotify).mockResolvedValue({ addedCount: 1, events: [] })

    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rossoAdded).toBe(false)
    expect(json.alreadyPresent).toBe(true)
  })

  it('reports spotifyAdded false with note when Spotify add fails (Rosso side already succeeded)', async () => {
    mockSupabase({
      user: { id: 'u1' },
      playlist: { id: PLAYLIST_ID, user_id: 'u1', platform: 'spotify', platform_id: 'sp-pl-1' },
      track: { id: TRACK_ID, spotify_id: 'sp-track-1' },
      existingTrack: null,
      lastPosition: null,
      countAfterInsert: 1,
    })
    vi.mocked(addTracksToSpotify).mockResolvedValue({ addedCount: 0, events: [{ step: 'batch_failed' }] })

    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rossoAdded).toBe(true)
    expect(json.spotifyAdded).toBe(false)
    expect(json.note).toMatch(/try again/)
  })

  it('does not touch Spotify for non-spotify playlists', async () => {
    mockSupabase({
      user: { id: 'u1' },
      playlist: { id: PLAYLIST_ID, user_id: 'u1', platform: 'local', platform_id: null },
      track: { id: TRACK_ID, spotify_id: 'sp-track-1' },
      existingTrack: null,
      lastPosition: null,
      countAfterInsert: 1,
    })

    const res = await POST(makeRequest({ playlistId: PLAYLIST_ID, trackId: TRACK_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.spotifyAdded).toBe(false)
    expect(addTracksToSpotify).not.toHaveBeenCalled()
  })
})
