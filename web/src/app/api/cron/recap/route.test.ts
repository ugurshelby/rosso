import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/services/recap-generator', () => ({
  generateUserRecaps: vi.fn(),
}))

/* Kayan sıra (0342): kullanıcılar sıradan gelir — testte bellekte. */
let sira: string[] = []
vi.mock('@/lib/cron/kullanici-sirasi-db', async () => {
  const cekirdek = await import('@/lib/cron/kullanici-sirasi')
  return {
    siraylaIsle: (_is: string, secenek: Parameters<typeof cekirdek.siraylaIsleCekirdek>[1]) =>
      cekirdek.siraylaIsleCekirdek(
        { al: async () => sira.shift() ?? null, tamamla: async () => {} },
        secenek,
      ),
  }
})

describe('/api/cron/recap', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    delete process.env.CRON_SECRET
    delete process.env.WORKER_SHARED_SECRET
  })

  it('returns 500 when neither CRON_SECRET nor WORKER_SHARED_SECRET is set', async () => {
    const req = new NextRequest('http://localhost/api/cron/recap', {
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

    const req = new NextRequest('http://localhost/api/cron/recap', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-secret' },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/Unauthorized/)
  })

  it('sıradaki kullanıcılar için recap üretir', async () => {
    process.env.CRON_SECRET = 'valid-recap-secret'
    sira = ['user-123', 'user-456']

    const { generateUserRecaps } = await import('@/lib/services/recap-generator')
    vi.mocked(generateUserRecaps).mockResolvedValue({
      userId: 'user-123',
      recapsProcessed: 2,
      recapsWritten: 2,
      errors: [],
    })

    const req = new NextRequest('http://localhost/api/cron/recap', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-recap-secret' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.usersCount).toBe(2)
    expect(json.totalRecapsWritten).toBe(4)
    expect(generateUserRecaps).toHaveBeenCalledTimes(2)
  })

  it('hiç yazamayan ve hata veren kullanıcı hatalı sayılır, tur sürer', async () => {
    process.env.CRON_SECRET = 'valid-recap-secret'
    sira = ['bozuk', 'saglam']

    const { generateUserRecaps } = await import('@/lib/services/recap-generator')
    vi.mocked(generateUserRecaps).mockImplementation(async (uid: string) =>
      uid === 'bozuk'
        ? { userId: uid, recapsProcessed: 1, recapsWritten: 0, errors: ['rpc hatası'] }
        : { userId: uid, recapsProcessed: 1, recapsWritten: 1, errors: [] },
    )

    const req = new NextRequest('http://localhost/api/cron/recap', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-recap-secret' },
    })
    const json = await (await POST(req)).json()
    expect(json.usersFailed).toBe(1)
    expect(json.totalRecapsWritten).toBe(1)
  })
})
