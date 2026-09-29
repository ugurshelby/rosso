/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/services/token-refresh', () => ({
  ensureValidToken: vi.fn(),
}))

vi.mock('@/lib/services/user-packages-refresh', () => ({
  refreshUserCorePackages: vi.fn(),
}))

import { createServiceClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import {
  syncRecentlyPlayed,
  triggerSmartSyncIfNeeded,
} from './spotify-sync-recently-played'

describe('triggerSmartSyncIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('skips sync if less than 30 minutes have elapsed since last sync', async () => {
    const recentSyncTime = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  platform: 'spotify',
                  is_active: true,
                  last_synced_at: recentSyncTime,
                  last_recently_played_sync_at: recentSyncTime,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }

    vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any)

    const result = await triggerSmartSyncIfNeeded('user-recent')
    expect(result?.outcome).toBe('skipped_debounced')
    expect(result?.eventsWritten).toBe(0)
    expect(ensureValidToken).not.toHaveBeenCalled()
  })

  it('returns no_token if connection is inactive or missing', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  platform: 'spotify',
                  is_active: false,
                  last_synced_at: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }

    vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any)

    const result = await triggerSmartSyncIfNeeded('user-inactive')
    expect(result?.outcome).toBe('no_token')
  })

  it('returns no_token and skips sync if user is a synthetic test account', async () => {
    const mockSupabase = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-profile-1',
                email: 'ayse@rosso-test.local',
                user_metadata: { is_test: true },
              },
            },
          }),
        },
      },
      from: vi.fn(),
    }

    vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any)

    const result = await triggerSmartSyncIfNeeded('test-profile-1')
    expect(result?.outcome).toBe('no_token')
    expect(ensureValidToken).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('triggers sync when last sync was more than 30 minutes ago', async () => {
    const staleSyncTime = new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 minutes ago
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'platform_connections') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      platform: 'spotify',
                      is_active: true,
                      last_synced_at: staleSyncTime,
                      last_recently_played_sync_at: staleSyncTime,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: mockUpdate,
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      }),
    }

    vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any)
    vi.mocked(ensureValidToken).mockResolvedValue('test-access-token')

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ items: [] }),
    } as any)

    const result = await triggerSmartSyncIfNeeded('user-stale')
    expect(result?.outcome).toBe('success')
    expect(ensureValidToken).toHaveBeenCalledWith('user-stale', 'spotify')
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('triggers sync when user has never synced before (null timestamps)', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'platform_connections') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      platform: 'spotify',
                      is_active: true,
                      last_synced_at: null,
                      last_recently_played_sync_at: null,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: mockUpdate,
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      }),
    }

    vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any)
    vi.mocked(ensureValidToken).mockResolvedValue('test-access-token')

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ items: [] }),
    } as any)

    const result = await triggerSmartSyncIfNeeded('user-never-synced')
    expect(result?.outcome).toBe('success')
    expect(ensureValidToken).toHaveBeenCalledWith('user-never-synced', 'spotify')
  })
})
