import { api, ApiHatasi, type ApiBaglami } from './api'

jest.mock('./supabase', () => ({ supabase: () => null }))

function baglam(yanitlar: Response[], token = 'eski'): ApiBaglami & { istekler: RequestInit[]; yenilendi: number } {
  const b = {
    webUrl: 'https://rosso.example',
    istekler: [] as RequestInit[],
    yenilendi: 0,
    token: async () => token,
    yenile: async () => {
      b.yenilendi++
      return 'yeni'
    },
    fetch: (async (_url: string, init: RequestInit) => {
      b.istekler.push(init)
      const y = yanitlar.shift()
      if (!y) throw new Error('beklenmeyen istek')
      return y
    }) as unknown as typeof fetch,
  }
  return b
}

const json = (govde: unknown, durum = 200, basliklar: Record<string, string> = {}) =>
  new Response(JSON.stringify(govde), { status: durum, headers: basliklar })

describe('api', () => {
  it('Bearer token ve JSON gövde gönderir', async () => {
    const b = baglam([json({ ok: true })])
    const sonuc = await api<{ ok: boolean }>('/api/mood/remove-track', { yontem: 'POST', govde: { moodKey: 'x' } }, b)
    expect(sonuc).toEqual({ ok: true })
    const h = b.istekler[0]?.headers as Record<string, string>
    expect(h.Authorization).toBe('Bearer eski')
    expect(h['Content-Type']).toBe('application/json')
    expect(b.istekler[0]?.body).toBe('{"moodKey":"x"}')
  })

  it('401 → oturumu bir kez yeniler ve yeni token ile tekrar dener', async () => {
    const b = baglam([json({ error: 'Giriş yapmalısın.' }, 401), json({ spotify: null })])
    await api('/api/auth/token-status', {}, b)
    expect(b.yenilendi).toBe(1)
    expect((b.istekler[1]?.headers as Record<string, string>).Authorization).toBe('Bearer yeni')
  })

  it('hata gövdesini ve Retry-After değerini taşır', async () => {
    const b = baglam([json({ error: 'Çok sık' }, 429, { 'retry-after': '30' })])
    await expect(api('/api/spotify/sync', { yontem: 'POST' }, b)).rejects.toEqual(new ApiHatasi(429, 'Çok sık', 30))
  })

  it('JSON olmayan hata gövdesinde durum kodunu yazar', async () => {
    const b = baglam([new Response('<html>', { status: 502 })])
    await expect(api('/api/x', {}, b)).rejects.toMatchObject({ durum: 502, message: 'HTTP 502' })
  })
})
