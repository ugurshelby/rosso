// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const exchange = vi.fn()
const verifyOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession: exchange, verifyOtp } })),
}))

function req(qs: string) {
  return new Request(`http://test/api/auth/callback${qs}`)
}

describe('GET /api/auth/callback', { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('başarılı kod değişiminde next yoluna gider', async () => {
    exchange.mockResolvedValue({ error: null })
    const { GET } = await import('./route')
    const res = await GET(req('?code=abc&next=/update-password') as never)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/update-password')
  })

  it('şifre sıfırlama kodu geçersizse /forgot-password?error=link_invalid (login DEĞİL)', async () => {
    exchange.mockResolvedValue({ error: { message: 'bad' } })
    const { GET } = await import('./route')
    const res = await GET(req('?code=abc&next=/update-password') as never)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.pathname).toBe('/forgot-password')
    expect(loc.searchParams.get('error')).toBe('link_invalid')
  })

  it('normal girişte kod geçersizse /login?error=auth_failed', async () => {
    exchange.mockResolvedValue({ error: { message: 'bad' } })
    const { GET } = await import('./route')
    const res = await GET(req('?code=abc') as never)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.pathname).toBe('/login')
    expect(loc.searchParams.get('error')).toBe('auth_failed')
  })

  it('token_hash + recovery her tarayıcıda çalışır ve update-password’a gider', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    const { GET } = await import('./route')
    const res = await GET(req('?token_hash=h&type=recovery') as never)
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'h', type: 'recovery' })
    expect(new URL(res.headers.get('location')!).pathname).toBe('/update-password')
  })

  it('kod yoksa hata sayfasına döner', async () => {
    const { GET } = await import('./route')
    const res = await GET(req('') as never)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })
})
