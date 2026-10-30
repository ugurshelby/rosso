import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/services/playlist-refresh', () => ({ runPlaylistRefresh: vi.fn() }))
vi.mock('@/lib/library/sync-liked', () => ({ syncLikedSongs: vi.fn() }))
vi.mock('@/lib/observability/pipeline-run', () => ({ recordSiraRun: vi.fn() }))

/* Kayan sıra: her iş kendi bellek kuyruğundan okur; hangi işin istendiği kaydedilir. */
const siralar: Record<string, string[]> = {}
const istenenIsler: string[] = []
vi.mock('@/lib/cron/kullanici-sirasi-db', async () => {
  const cekirdek = await import('@/lib/cron/kullanici-sirasi')
  return {
    siraylaIsle: (is: string, secenek: Parameters<typeof cekirdek.siraylaIsleCekirdek>[1]) => {
      istenenIsler.push(is)
      return cekirdek.siraylaIsleCekirdek(
        { al: async () => siralar[is]?.shift() ?? null, tamamla: async () => {} },
        secenek,
      )
    },
  }
})

import { POST } from './route'
import { runPlaylistRefresh } from '@/lib/services/playlist-refresh'
import { syncLikedSongs } from '@/lib/library/sync-liked'
import { recordSiraRun } from '@/lib/observability/pipeline-run'

const istek = () =>
  new NextRequest('http://localhost/api/cron/playlist-refresh', {
    method: 'POST',
    headers: { Authorization: 'Bearer gizli' },
  })

describe('/api/cron/playlist-refresh', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.CRON_SECRET = 'gizli'
    istenenIsler.length = 0
    for (const k of Object.keys(siralar)) delete siralar[k]
    vi.mocked(runPlaylistRefresh).mockResolvedValue({
      outcome: 'success',
      playlistsUpdated: 1,
      playlistsDeleted: 0,
    } as Awaited<ReturnType<typeof runPlaylistRefresh>>)
  })

  it('yanlış sırla 401', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/cron/playlist-refresh', {
        method: 'POST',
        headers: { Authorization: 'Bearer yanlis' },
      }),
    )
    expect(res.status).toBe(401)
    expect(istenenIsler).toEqual([])
  })

  it('playlist turundan sonra beğeni turunu liked_sync sırasıyla koşar', async () => {
    siralar.playlist_refresh = ['u1']
    siralar.liked_sync = ['u1', 'u2']
    vi.mocked(syncLikedSongs)
      .mockResolvedValueOnce({ ok: true, spotifyTotal: 10, added: 2, removed: 1, catalogAdded: 0 })
      .mockResolvedValueOnce({ ok: false, reason: 'no_token' })

    const res = await POST(istek())
    const json = await res.json()

    expect(istenenIsler).toEqual(['playlist_refresh', 'liked_sync'])
    expect(syncLikedSongs).toHaveBeenCalledTimes(2)
    expect(json.liked).toEqual({ usersProcessed: 1, usersFailed: 1, added: 2, removed: 1 })
    expect(recordSiraRun).toHaveBeenCalledWith(
      'playlist_refresh',
      expect.objectContaining({ islenen: 1 }),
      expect.objectContaining({ liked: json.liked }),
    )
  })
})
