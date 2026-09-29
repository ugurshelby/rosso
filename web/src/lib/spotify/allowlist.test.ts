import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn() }))

const upsert = vi.fn()
const maybeSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    }),
  })),
}))

import { fetchSpotifyIdentity, recordSpotifyAccess } from './allowlist'

beforeEach(() => {
  vi.clearAllMocks()
  upsert.mockResolvedValue({ error: null })
  maybeSingle.mockResolvedValue({ data: null })
})

describe('fetchSpotifyIdentity', () => {
  it('403 → forbidden (kimlik öğrenilemez ama sorun bilinir)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })))
    const id = await fetchSpotifyIdentity('tok')
    expect(id).toEqual({ spotifyUserId: null, spotifyEmail: null, forbidden: true })
  })

  it('başarılı → e-posta + user id döner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ id: 'sp_1', email: 'a@spotify.test' })),
    )
    const id = await fetchSpotifyIdentity('tok')
    expect(id).toEqual({
      spotifyUserId: 'sp_1',
      spotifyEmail: 'a@spotify.test',
      forbidden: false,
    })
  })

  it('ağ hatası forbidden SAYILMAZ (yoksa herkesi kuyruğa atarız)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom') }))
    const id = await fetchSpotifyIdentity('tok')
    expect(id.forbidden).toBe(false)
  })
})

describe('recordSpotifyAccess', () => {
  it('403 → pending (admin elle eklemeli)', async () => {
    await recordSpotifyAccess('u1', {
      spotifyUserId: null, spotifyEmail: null, forbidden: true,
    })
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({ user_id: 'u1', status: 'pending' })
  })

  it('erişim varsa → active (allowlist’te olduğu kanıtlandı)', async () => {
    await recordSpotifyAccess('u1', {
      spotifyUserId: 'sp_1', spotifyEmail: 'a@spotify.test', forbidden: false,
    })
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({
      status: 'active',
      spotify_email: 'a@spotify.test',
    })
  })

  it('admin “approved” dediyse yeniden bağlanma bunu pending’e ÇEKMEZ', async () => {
    maybeSingle.mockResolvedValue({ data: { status: 'approved' } })
    await recordSpotifyAccess('u1', {
      spotifyUserId: null, spotifyEmail: null, forbidden: true,
    })
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({ status: 'approved' })
  })

  it('rejected kaydı yeniden bağlanmayla dirilmez', async () => {
    maybeSingle.mockResolvedValue({ data: { status: 'rejected' } })
    await recordSpotifyAccess('u1', {
      spotifyUserId: 'sp_1', spotifyEmail: 'a@x.test', forbidden: false,
    })
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({ status: 'rejected' })
  })
})

describe('recordSpotifyAccess — BYOC', () => {
  it('kendi app’iyle bağlanan, paylaşılan listedeki rejected kararına takılmaz', async () => {
    maybeSingle.mockResolvedValue({ data: { status: 'rejected' } })
    await recordSpotifyAccess(
      'u1',
      { spotifyUserId: 'sp_1', spotifyEmail: 'a@x.test', forbidden: false },
      'byoc',
    )
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({ status: 'active' })
  })
})

describe('spotifyEpostasiBiliniyorMu (B17)', () => {
  it('e-posta doluysa TRUE — kullaniciya sorulmaz', async () => {
    maybeSingle.mockResolvedValue({ data: { spotify_email: 'a@spotify.test' } })
    const { spotifyEpostasiBiliniyorMu } = await import('./allowlist')
    expect(await spotifyEpostasiBiliniyorMu('u1')).toBe(true)
  })

  it('e-posta NULL ise FALSE — form gosterilir', async () => {
    // ÖLÇÜLDÜ (2026-08-06): canlida 3 kayittan 2'sinde spotify_email NULL,
    // biri `pending`. Yani Sahibin Dashboard'a ekleyecegi adres HIC yok.
    maybeSingle.mockResolvedValue({ data: { spotify_email: null } })
    const { spotifyEpostasiBiliniyorMu } = await import('./allowlist')
    expect(await spotifyEpostasiBiliniyorMu('u1')).toBe(false)
  })

  it('kayit yoksa FALSE', async () => {
    maybeSingle.mockResolvedValue({ data: null })
    const { spotifyEpostasiBiliniyorMu } = await import('./allowlist')
    expect(await spotifyEpostasiBiliniyorMu('u1')).toBe(false)
  })

  it('okuma HATA verirse FALSE doner — formu gostermek, kullaniciyi sirada unutmaktan iyidir', async () => {
    maybeSingle.mockRejectedValue(new Error('db down'))
    const { spotifyEpostasiBiliniyorMu } = await import('./allowlist')
    expect(await spotifyEpostasiBiliniyorMu('u1')).toBe(false)
  })
})
