// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

/*
 * Mock dependencies before importing module.
 *
 * ⚠ `createServiceClient` (2026-08-13, migration 0275+0276): bu dosya
 * eskiden `createClient`'i mock'luyordu. Token kolonlarının SELECT
 * yetkisi `authenticated` rolünden kaldırıldığı için `token-refresh.ts`
 * service client'a geçti; mock da onunla birlikte değişti.
 *
 * Bu test o geçişi yakaladı: mock eski adı taşıdığı sürece 4 test
 * "No createServiceClient export" ile patladı — yani kaynak ile testin
 * aynı sözleşmeye baktığının kanıtı.
 */
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/crypto/token-cipher', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace('enc:', ''),
}))

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    SPOTIFY_CLIENT_ID: 'client_id',
    SPOTIFY_CLIENT_SECRET: 'client_secret',
  },
}))

/*
 * BYOC (2026-09-23): `refreshSpotifyToken` artık client_id/secret'ı
 * doğrudan `serverEnv`'den değil `resolveSpotifyCredentialsForConnection`'dan
 * alıyor (bağlantıyı kuran app — migration 0341'in `oauth_client_id`'si).
 * Bu test dosyası "BYOC yok" senaryosunu simüle eder; byoc.ts'in kendi
 * davranışı `lib/spotify/byoc.test.ts`'te ayrı doğrulanır.
 */
vi.mock('@/lib/spotify/byoc', () => ({
  resolveSpotifyCredentialsForConnection: vi.fn(async () => ({
    clientId: 'client_id',
    clientSecret: 'client_secret',
    source: 'shared' as const,
  })),
}))

function makeMockSupabase(conn: Record<string, unknown> | null) {
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    then: vi.fn(),
  })
  const eqChain = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: conn, error: null }),
    update: updateMock,
  }

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => eqChain),
      update: vi.fn(() => eqChain),
      eq: vi.fn().mockReturnThis(),
    })),
  }
}

describe('ensureValidToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when not connected', async () => {
    const { createServiceClient } = await import('@/lib/supabase/server')
    ;(createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeMockSupabase(null))

    const { ensureValidToken } = await import('./token-refresh')
    const result = await ensureValidToken('user1', 'spotify')
    expect(result).toBeNull()
  })

  it('returns decrypted token when not expired', async () => {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    ;(createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({
        access_token: 'enc:valid-token',
        refresh_token: 'enc:refresh-token',
        token_expires: futureExpiry,
        is_active: true,
      }),
    )

    const { ensureValidToken } = await import('./token-refresh')
    const result = await ensureValidToken('user1', 'spotify')
    expect(result).toBe('valid-token')
  })

  it('triggers refresh when token expires within 5 minutes', async () => {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const soonExpiry = new Date(Date.now() + 4 * 60 * 1000).toISOString()

    // createServiceClient is called exactly twice:
    //   1. ensureValidToken at line 145 — this instance is also reused for the re-fetch at line 170
    //   2. refreshSpotifyToken at line 44 — used to update the token in DB
    //
    // The re-fetch (lines 170-176) uses the SAME supabase instance from call #1,
    // so call #1's mock must serve two sequential from() calls with different data.
    let callCount = 0
    let fromCallOnInstance1 = 0
    ;(createServiceClient as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        // Instance used by ensureValidToken for both the initial fetch AND the re-fetch
        return {
          from: vi.fn(() => {
            fromCallOnInstance1++
            if (fromCallOnInstance1 === 1) {
              // Initial fetch — soon-expiring token
              return {
                select: vi.fn(() => ({
                  eq: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      access_token: 'enc:old-token',
                      refresh_token: 'enc:refresh-token',
                      token_expires: soonExpiry,
                      is_active: true,
                    },
                    error: null,
                  }),
                })),
                update: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
              }
            }
            // Re-fetch after refresh — returns new token
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { access_token: 'enc:new-token' },
                  error: null,
                }),
              })),
              update: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
            }
          }),
        }
      }
      // callCount === 2: refreshSpotifyToken → update(...).eq(...).eq(...)
      const eqFinal = vi.fn().mockResolvedValue({ error: null })
      const eqFirst = vi.fn().mockReturnValue({ eq: eqFinal })
      return {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
          update: vi.fn(() => ({ eq: eqFirst })),
        })),
      }
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'new-access-token',
        expires_in: 3600,
      }),
    })

    const { ensureValidToken } = await import('./token-refresh')
    const result = await ensureValidToken('user1', 'spotify')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.any(Object),
    )
    expect(result).toBe('new-token')
  })

  it('returns null without throwing when spotify refresh returns 401', async () => {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const soonExpiry = new Date(Date.now() + 1 * 60 * 1000).toISOString()

    ;(createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({
        access_token: 'enc:old-token',
        refresh_token: 'enc:refresh-token',
        token_expires: soonExpiry,
        is_active: true,
      }),
    )

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })

    const { ensureValidToken } = await import('./token-refresh')
    await expect(ensureValidToken('user1', 'spotify')).resolves.toBeNull()
  })
})
