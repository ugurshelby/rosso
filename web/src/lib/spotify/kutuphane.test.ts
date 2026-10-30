import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const kapi = vi.fn()
const istek = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>()
const ceza = vi.fn()
vi.mock('@/lib/spotify/api-gate', () => ({
  SCOPE_USER: 'spotify:user',
  PRIORITY_HIGH: 2,
  checkGate: (...a: unknown[]) => kapi(...a),
  pacedFetch: (url: string, init?: RequestInit) => istek(url, init),
  record429: (...a: unknown[]) => ceza(...a),
  refund: vi.fn(),
}))

import { playlistlerKutuphanede } from './kutuphane'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

beforeEach(() => {
  kapi.mockReset().mockResolvedValue({ allowed: true })
  istek.mockReset()
  ceza.mockReset()
})

describe('playlistlerKutuphanede', () => {
  it('URI listesiyle sorar ve sırayla eşler', async () => {
    istek.mockResolvedValue(json([false, true]))
    const m = await playlistlerKutuphanede('tok', ['a', 'b'])
    expect(m).toEqual(new Map([['a', false], ['b', true]]))
    const url = istek.mock.calls[0][0]
    expect(decodeURIComponent(url)).toContain('/v1/me/library/contains?uris=spotify:playlist:a,spotify:playlist:b')
  })

  it('429 cezayı yazar ve bilinmeyen döner', async () => {
    istek.mockResolvedValue(json({}, 429, { 'retry-after': '30' }))
    const m = await playlistlerKutuphanede('tok', ['a'])
    expect(m.size).toBe(0)
    expect(ceza).toHaveBeenCalledWith('spotify:user', 30, 'me/library/contains')
  })

  it('kapı kapalıysa hiç istek atmaz', async () => {
    kapi.mockResolvedValue({ allowed: false })
    const m = await playlistlerKutuphanede('tok', ['a'])
    expect(istek).not.toHaveBeenCalled()
    expect(m.size).toBe(0)
  })

  it('beklenmeyen gövde (uzunluk farkı) bilinmeyen sayılır', async () => {
    istek.mockResolvedValue(json([true]))
    const m = await playlistlerKutuphanede('tok', ['a', 'b'])
    expect(m.size).toBe(0)
  })

  it('20\'lik partilere böler', async () => {
    istek.mockImplementation(async (url) => {
      const n = decodeURIComponent(url).split('uris=')[1].split(',').length
      return json(Array(n).fill(true))
    })
    const ids = Array.from({ length: 45 }, (_, i) => `p${i}`)
    const m = await playlistlerKutuphanede('tok', ids)
    expect(istek).toHaveBeenCalledTimes(3)
    expect(m.size).toBe(45)
  })
})
