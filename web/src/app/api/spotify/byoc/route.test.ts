// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/spotify/byoc', () => ({
  getByocStatus: vi.fn(),
  verifyAndSaveByocCredentials: vi.fn(),
  deleteByocCredentials: vi.fn(async () => {}),
}))

import { GET, POST, DELETE } from './route'
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getByocStatus, verifyAndSaveByocCredentials, deleteByocCredentials } from '@/lib/spotify/byoc'
import { _clearAllRateLimits } from '@/lib/security/rate-limit'

function postReq(body: unknown) {
  return new NextRequest('http://localhost/api/spotify/byoc', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  _clearAllRateLimits()
})

describe('GET /api/spotify/byoc', () => {
  it('401 döner — oturum yok', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('durumu döner — sır İÇERMEZ', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getByocStatus).mockResolvedValue({
      configured: true,
      verified: true,
      active: true,
      clientId: 'abc',
      verifiedAt: '2026-09-23T00:00:00Z',
    })
    const res = await GET()
    const body = await res.json()
    expect(body.configured).toBe(true)
    expect(JSON.stringify(body)).not.toMatch(/secret/i)
  })
})

describe('POST /api/spotify/byoc', () => {
  it('401 döner — oturum yok', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await POST(postReq({ clientId: 'a'.repeat(32), clientSecret: 'b'.repeat(32) }))
    expect(res.status).toBe(401)
  })

  it('422 döner — geçersiz gövde (zod)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const res = await POST(postReq({ clientId: '' }))
    expect(res.status).toBe(422)
    expect(verifyAndSaveByocCredentials).not.toHaveBeenCalled()
  })

  it('başarılıysa 200 ok:true döner', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(verifyAndSaveByocCredentials).mockResolvedValue({ ok: true })
    const res = await POST(postReq({ clientId: 'a'.repeat(32), clientSecret: 'b'.repeat(32) }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('spotify_reddetti → 401 döner', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(verifyAndSaveByocCredentials).mockResolvedValue({ ok: false, kod: 'spotify_reddetti' })
    const res = await POST(postReq({ clientId: 'a'.repeat(32), clientSecret: 'b'.repeat(32) }))
    expect(res.status).toBe(401)
  })

  it('6. denemede rate limit devreye girer (429)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(verifyAndSaveByocCredentials).mockResolvedValue({ ok: false, kod: 'spotify_reddetti' })
    let last: Response | undefined
    for (let i = 0; i < 6; i++) {
      last = await POST(postReq({ clientId: 'a'.repeat(32), clientSecret: 'b'.repeat(32) }))
    }
    expect(last?.status).toBe(429)
    expect(last?.headers.get('Retry-After')).toBeTruthy()
  })
})

describe('DELETE /api/spotify/byoc', () => {
  it('401 döner — oturum yok', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await DELETE()
    expect(res.status).toBe(401)
    expect(deleteByocCredentials).not.toHaveBeenCalled()
  })

  it('kimlik bilgisini siler', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(deleteByocCredentials).toHaveBeenCalledWith('user-1')
  })
})
