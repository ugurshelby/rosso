import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))
const kullanici = vi.fn()
vi.mock('@/lib/auth', () => ({ getCurrentUser: () => kullanici() }))
const hiz = vi.fn()
vi.mock('@/lib/security/rate-limit', () => ({ checkRateLimit: (...a: unknown[]) => hiz(...a) }))
const dogrula = vi.fn()
vi.mock('@/lib/services/mood-spotify-dogrula', () => ({
  moodSpotifyDurumunuDogrula: (...a: unknown[]) => dogrula(...a),
}))

import { POST } from './route'

const istek = (govde?: unknown) =>
  new NextRequest('http://localhost/api/mood/dogrula', {
    method: 'POST',
    body: govde === undefined ? undefined : JSON.stringify(govde),
  })

beforeEach(() => {
  kullanici.mockReset().mockResolvedValue({ id: 'u1' })
  hiz.mockReset().mockReturnValue({ allowed: true })
  dogrula.mockReset().mockResolvedValue({ kontrol: 2, kaldirilan: ['closer'] })
})

describe('/api/mood/dogrula', () => {
  it('oturum yoksa 401, doğrulama çağrılmaz', async () => {
    kullanici.mockResolvedValue(null)
    const res = await POST(istek({}))
    expect(res.status).toBe(401)
    expect(dogrula).not.toHaveBeenCalled()
  })

  it('gövdesiz: kullanıcının tüm dışa aktarılmış mood’ları', async () => {
    const res = await POST(istek())
    expect(await res.json()).toEqual({ kontrol: 2, kaldirilan: ['closer'] })
    expect(dogrula).toHaveBeenCalledWith('u1', undefined)
  })

  it('tek mood ve geçersiz anahtar', async () => {
    await POST(istek({ moodKey: 'closer' }))
    expect(dogrula).toHaveBeenCalledWith('u1', 'closer')
    const kotu = await POST(istek({ moodKey: 'yok_boyle' }))
    expect(kotu.status).toBe(400)
  })

  it('hız sınırında 429', async () => {
    hiz.mockReturnValue({ allowed: false })
    expect((await POST(istek({}))).status).toBe(429)
  })
})
