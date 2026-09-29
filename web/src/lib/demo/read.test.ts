// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, cache: <T,>(fn: T) => fn }
})

const rpcMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ rpc: rpcMock }) }))

let yetenekler: Record<string, boolean> = {}
vi.mock('@/lib/phase/read', () => ({
  getPhaseState: async () => ({ capabilities: yetenekler }),
}))

const { gosterimKaynagi, getDemoKullaniciId, demoKullaniciysaReddet } = await import('./read')

beforeEach(() => {
  rpcMock.mockReset()
  yetenekler = {}
})

describe('gosterimKaynagi', () => {
  it('kilit AÇIKSA gerçek kullanıcı, demo değil', async () => {
    yetenekler = { canSeeRecap: true }
    const r = await gosterimKaynagi('user-1', 'recap')
    expect(r).toEqual({ veriKullanicisi: 'user-1', demoMu: false, kilitAcik: true })
    expect(rpcMock).not.toHaveBeenCalled() // demo kimliği hiç sorgulanmaz
  })

  it('kilit KAPALIYSA demo persona okunur', async () => {
    yetenekler = { canSeeRecap: false }
    rpcMock.mockResolvedValue({ data: 'demo-id', error: null })
    const r = await gosterimKaynagi('user-1', 'recap')
    expect(r).toEqual({ veriKullanicisi: 'demo-id', demoMu: true, kilitAcik: false })
  })

  it('demo tohumlanmamışsa kullanıcıya düşer (patlamaz), demoMu=false', async () => {
    yetenekler = { canSeeTaste: false }
    rpcMock.mockResolvedValue({ data: null, error: null })
    const r = await gosterimKaynagi('user-1', 'taste')
    expect(r).toEqual({ veriKullanicisi: 'user-1', demoMu: false, kilitAcik: false })
  })

  it('RPC hatasında da güvenli düşüş', async () => {
    yetenekler = { canSeeMood: false }
    rpcMock.mockResolvedValue({ data: null, error: { message: 'x' } })
    expect((await gosterimKaynagi('user-1', 'mood')).demoMu).toBe(false)
  })

  it('özelliğe göre doğru yetenek okunur (playlists ≠ recap)', async () => {
    yetenekler = { canSeePlaylists: true, canSeeRecap: false }
    rpcMock.mockResolvedValue({ data: 'demo-id', error: null })
    expect((await gosterimKaynagi('u', 'playlists')).demoMu).toBe(false)
    expect((await gosterimKaynagi('u', 'recap')).demoMu).toBe(true)
  })
})

describe('yardımcılar', () => {
  it('getDemoKullaniciId persona kodunu RPC\'ye iletir', async () => {
    rpcMock.mockResolvedValue({ data: 'demo-id', error: null })
    expect(await getDemoKullaniciId('varsayilan')).toBe('demo-id')
    expect(rpcMock).toHaveBeenCalledWith('demo_kullanici_id', { p_kod: 'varsayilan' })
  })

  it('demoKullaniciysaReddet yalnız demo_mi TRUE ise true döner', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null })
    expect(await demoKullaniciysaReddet('x')).toBe(true)
    rpcMock.mockResolvedValueOnce({ data: false, error: null })
    expect(await demoKullaniciysaReddet('y')).toBe(false)
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'e' } })
    expect(await demoKullaniciysaReddet('z')).toBe(false)
  })
})
