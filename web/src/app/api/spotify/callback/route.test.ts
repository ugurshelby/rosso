// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'user-123' })),
}))

const upsertMock = vi.fn(async (_row: Record<string, unknown>) => ({ error: null }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: () => ({ upsert: upsertMock }),
  })),
}))

vi.mock('@/lib/platform-auth', () => ({
  getAppOrigin: () => 'http://127.0.0.1:3847',
  oauthCookieOptions: () => ({ httpOnly: true, path: '/' }),
}))

// BYOC (2026-09-23): route testi byoc.ts'in İÇİNİ değil route mantığını test
// eder — byoc.ts kendi testlerinde ayrı doğrulanır (lib/spotify/byoc.test.ts).
// Varsayılan: BYOC yok → paylaşılan env kimlik bilgilerine düşer (mevcut
// testlerin beklediği davranış budur).
vi.mock('@/lib/spotify/byoc', () => ({
  resolveSpotifyClientCredentials: vi.fn(async () => ({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    source: 'shared' as const,
  })),
}))

import { GET } from './route'
import { NextRequest } from 'next/server'
import { decrypt } from '@/lib/crypto/token-cipher'

const originalFetch = global.fetch

describe('GET /api/spotify/callback', () => {
  beforeEach(() => {
    upsertMock.mockClear()
    process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
    process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret'
    process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(32)
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        access_token: 'raw-access-token',
        refresh_token: 'raw-refresh-token',
        expires_in: 3600,
      }),
    })) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('encrypts access_token and refresh_token before saving to DB', async () => {
    const req = new NextRequest(
      'http://127.0.0.1:3847/api/spotify/callback?code=abc&state=xyz',
      { headers: { cookie: 'spotify_oauth_state=xyz' } },
    )
    await GET(req)

    expect(upsertMock).toHaveBeenCalledTimes(1)
    const savedRow = upsertMock.mock.calls[0]?.[0]
    if (!savedRow) throw new Error('upsert not called with a row')

    // Düz metin DEĞİL — şifreli olmalı
    expect(savedRow.access_token).not.toBe('raw-access-token')
    expect(savedRow.refresh_token).not.toBe('raw-refresh-token')

    // Ve decrypt edilince orijinal değere dönmeli
    expect(decrypt(savedRow.access_token as string)).toBe('raw-access-token')
    expect(decrypt(savedRow.refresh_token as string)).toBe('raw-refresh-token')
  })
})
