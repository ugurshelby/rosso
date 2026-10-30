import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const satirlar: Array<{ mood_key: string; exported_playlist_id: string | null }> = []
const guncellemeler: Array<{ degisiklik: Record<string, unknown>; filtre: Record<string, unknown> }> = []

function okumaZinciri() {
  const filtre: Record<string, unknown> = {}
  const zincir = {
    select: () => zincir,
    eq: (k: string, v: unknown) => { filtre[k] = v; return zincir },
    not: () => zincir,
    then: (cozul: (r: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({
        data: satirlar.filter((s) => !filtre.mood_key || s.mood_key === filtre.mood_key),
        error: null,
      }).then(cozul),
  }
  return zincir
}

function yazmaZinciri(degisiklik: Record<string, unknown>) {
  const filtre: Record<string, unknown> = {}
  const zincir = {
    eq: (k: string, v: unknown) => { filtre[k] = v; return zincir },
    then: (cozul: (r: { error: null }) => unknown) => {
      guncellemeler.push({ degisiklik, filtre })
      return Promise.resolve({ error: null }).then(cozul)
    },
  }
  return zincir
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({
    from: () => ({
      select: (...a: unknown[]) => okumaZinciri().select(...(a as [])),
      update: (d: Record<string, unknown>) => yazmaZinciri(d),
    }),
  }),
}))

const tokenMock = vi.fn<() => Promise<string | null>>()
vi.mock('@/lib/services/token-refresh', () => ({ ensureValidToken: () => tokenMock() }))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn() }))

const kutuphaneMock = vi.fn<(t: string, ids: string[]) => Promise<Map<string, boolean>>>()
vi.mock('@/lib/spotify/kutuphane', () => ({
  playlistlerKutuphanede: (t: string, ids: string[]) => kutuphaneMock(t, ids),
}))

import { moodSpotifyDurumunuDogrula } from './mood-spotify-dogrula'

beforeEach(() => {
  satirlar.length = 0
  guncellemeler.length = 0
  tokenMock.mockReset().mockResolvedValue('tok')
  kutuphaneMock.mockReset()
})

describe('moodSpotifyDurumunuDogrula', () => {
  it('Spotify\'da silinen liste "eklenmemiş" durumuna döner, duran liste kalır', async () => {
    satirlar.push({ mood_key: 'gece_217', exported_playlist_id: 'SILINDI' }, { mood_key: 'closer', exported_playlist_id: 'DURUYOR' })
    kutuphaneMock.mockResolvedValue(new Map([['SILINDI', false], ['DURUYOR', true]]))

    const s = await moodSpotifyDurumunuDogrula('u1')

    expect(s.kaldirilan).toEqual(['gece_217'])
    expect(guncellemeler).toHaveLength(1)
    expect(guncellemeler[0].degisiklik).toEqual({ exported_at: null, exported_playlist_id: null, weekly_sync_enabled: false })
    expect(guncellemeler[0].filtre).toMatchObject({ user_id: 'u1', mood_key: 'gece_217', exported_playlist_id: 'SILINDI' })
  })

  it('bilinmeyen durum (Spotify cevap vermedi) hiçbir şeyi değiştirmez', async () => {
    satirlar.push({ mood_key: 'gece_217', exported_playlist_id: 'X' })
    kutuphaneMock.mockResolvedValue(new Map())
    const s = await moodSpotifyDurumunuDogrula('u1')
    expect(s.kaldirilan).toEqual([])
    expect(guncellemeler).toHaveLength(0)
  })

  it('token yoksa Spotify\'a sormaz, değiştirmez', async () => {
    satirlar.push({ mood_key: 'gece_217', exported_playlist_id: 'X' })
    tokenMock.mockResolvedValue(null)
    const s = await moodSpotifyDurumunuDogrula('u1')
    expect(kutuphaneMock).not.toHaveBeenCalled()
    expect(s).toEqual({ kontrol: 0, kaldirilan: [] })
  })

  it('dışa aktarılmış liste yoksa Spotify\'a hiç gitmez', async () => {
    const s = await moodSpotifyDurumunuDogrula('u1')
    expect(tokenMock).not.toHaveBeenCalled()
    expect(kutuphaneMock).not.toHaveBeenCalled()
    expect(s).toEqual({ kontrol: 0, kaldirilan: [] })
  })

  it('tek mood istenince yalnız o sorulur', async () => {
    satirlar.push({ mood_key: 'gece_217', exported_playlist_id: 'A' }, { mood_key: 'closer', exported_playlist_id: 'B' })
    kutuphaneMock.mockResolvedValue(new Map([['B', true]]))
    await moodSpotifyDurumunuDogrula('u1', 'closer')
    expect(kutuphaneMock).toHaveBeenCalledWith('tok', ['B'])
  })
})
