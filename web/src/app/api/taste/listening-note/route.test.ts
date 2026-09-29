import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// GET /api/taste/listening-note — mobilin dinleme notu ucu.
//
// Asıl sözleşme GÜVENLİK: kullanıcı kimliği YALNIZ apiAuth'tan gelir. Uç
// hiçbir parametre almıyor; bu test, notun her zaman oturumdaki kullanıcı
// için istendiğini ve oturumsuz isteğin veri görmediğini sabitliyor.
// ---------------------------------------------------------------------------

const { apiAuthMock, notMock } = vi.hoisted(() => ({
  apiAuthMock: vi.fn(),
  notMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ apiAuth: apiAuthMock, getCurrentUser: vi.fn() }))
vi.mock('@/lib/analytics/music-intelligence', () => ({ getDinlemeNotu: notMock }))

import { GET } from './route'

beforeEach(() => {
  apiAuthMock.mockReset()
  notMock.mockReset()
})

describe('GET /api/taste/listening-note', () => {
  it('oturum yoksa 401 döner ve veriye hiç dokunmaz', async () => {
    apiAuthMock.mockResolvedValue({ ok: false, response: new Response('Unauthorized', { status: 401 }) })

    const res = await GET()

    expect(res.status).toBe(401)
    expect(notMock).not.toHaveBeenCalled()
  })

  it('notu YALNIZ oturumdaki kullanıcı için ister', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'oturum-kullanicisi' } })
    notMock.mockResolvedValue({ not: 'Gece sessizliğe sığınan bir dinleyici.', dokular: ['nocturnal'], uretildi: '2026-09-19' })

    const res = await GET()
    const govde = await res.json()

    expect(notMock).toHaveBeenCalledWith('oturum-kullanicisi')
    expect(govde.note.not).toContain('Gece')
  })

  it('not henüz yoksa 200 + null (hata değil — istemci bölümü gizler)', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'u' } })
    notMock.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ note: null })
  })

  it('kişisel veri paylaşılan önbelleklere girmez', async () => {
    apiAuthMock.mockResolvedValue({ ok: true, user: { id: 'u' } })
    notMock.mockResolvedValue(null)

    const res = await GET()

    expect(res.headers.get('Cache-Control')).toContain('private')
  })
})
