import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/services/auto-playlist-generator', () => ({
  runAutoPlaylists: vi.fn(),
}))

describe('/api/cron/auto-playlists', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    delete process.env.CRON_SECRET
    delete process.env.WORKER_SHARED_SECRET
  })

  it('returns 500 when neither CRON_SECRET nor WORKER_SHARED_SECRET is set', async () => {
    const req = new NextRequest('http://localhost/api/cron/auto-playlists', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-key' },
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/CRON_SECRET missing/)
  })

  it('returns 401 on missing or incorrect Authorization header', async () => {
    process.env.CRON_SECRET = 'correct-secret'

    const req = new NextRequest('http://localhost/api/cron/auto-playlists', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-secret' },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/Unauthorized/)
  })

  it('successfully executes runAutoPlaylists with valid secret', async () => {
    process.env.CRON_SECRET = 'valid-auto-secret'

    const { runAutoPlaylists } = await import('@/lib/services/auto-playlist-generator')

    vi.mocked(runAutoPlaylists).mockResolvedValue({
      rulesProcessed: 1,
      successful: 1,
      deadlineReached: false,
      results: [
        {
          ruleId: 'rule-1',
          userId: 'user-1',
          ruleType: 'top_month',
          status: 'completed',
          playlistId: 'sp-pl-123',
          trackCount: 50,
        },
      ],
    })

    const req = new NextRequest('http://localhost/api/cron/auto-playlists', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-auto-secret' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.successful).toBe(1)
    expect(runAutoPlaylists).toHaveBeenCalledTimes(1)
    // Süre sınırı verilmeli — yoksa ölçekte çağrı 300 sn'ye dayanır.
    expect(vi.mocked(runAutoPlaylists).mock.calls[0][0]).toBeGreaterThan(Date.now())
  })
})
