import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/services/spotify-sync-recently-played', () => ({
  syncRecentlyPlayed: vi.fn(),
}))

vi.mock('@/lib/services/user-packages-refresh', () => ({
  refreshUserCorePackages: vi.fn(async () => ({ ok: true, refreshed: [], errors: [] })),
}))

/*
 * Kayan sıra (0342): route kullanıcı listesini artık kendisi sorgulamıyor;
 * sıradan alıyor. Testte sıra bellekte — `sira` dizisi sırayla verilir,
 * tamamlama sonuçları `tamamlananlar`'a yazılır. Çekirdek GERÇEK
 * (`siraylaIsleCekirdek`), yalnız veritabanı erişimi sahte.
 */
let sira: string[] = []
let tamamlananlar: Array<{ userId: string; hata: string | null }> = []
vi.mock('@/lib/cron/kullanici-sirasi-db', async () => {
  const cekirdek = await import('@/lib/cron/kullanici-sirasi')
  return {
    siraylaIsle: (_is: string, secenek: Parameters<typeof cekirdek.siraylaIsleCekirdek>[1]) =>
      cekirdek.siraylaIsleCekirdek(
        {
          al: async () => sira.shift() ?? null,
          tamamla: async (userId, hata) => {
            tamamlananlar.push({ userId, hata })
          },
        },
        secenek,
      ),
  }
})

import { createServiceClient } from '@/lib/supabase/server'
import { syncRecentlyPlayed } from '@/lib/services/spotify-sync-recently-played'
import { refreshUserCorePackages } from '@/lib/services/user-packages-refresh'
import { POST } from './route'

/** platform_connections.oauth_client_id + cekirdek_paket damgası okuyan sahte istemci. */
function sahteIstemci(appler: Record<string, string | null>, damgalar: Record<string, string> = {}) {
  return {
    from: vi.fn((tablo: string) => {
      let uid = ''
      const zincir = {
        select: () => zincir,
        eq: (kolon: string, deger: string) => {
          if (kolon === 'user_id') uid = deger
          return zincir
        },
        maybeSingle: async () =>
          tablo === 'platform_connections'
            ? { data: { oauth_client_id: appler[uid] ?? null }, error: null }
            : { data: damgalar[uid] ? { son_tamamlanma: damgalar[uid] } : null, error: null },
        upsert: vi.fn(async () => ({ error: null })),
      }
      return zincir
    }),
  }
}

function istek() {
  return new NextRequest('http://localhost:3847/api/cron/sync-spotify', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-secret-123' },
  })
}

describe('/api/cron/sync-spotify', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    sira = []
    tamamlananlar = []
    process.env = { ...originalEnv, CRON_SECRET: 'test-secret-123', SPOTIFY_CLIENT_ID: 'shared-id' }
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = new NextRequest('http://localhost:3847/api/cron/sync-spotify', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Unauthorized')
  })

  it('returns 401 when Bearer token is incorrect', async () => {
    const req = new NextRequest('http://localhost:3847/api/cron/sync-spotify', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 500 when neither CRON_SECRET nor WORKER_SHARED_SECRET is set', async () => {
    delete process.env.CRON_SECRET
    delete process.env.WORKER_SHARED_SECRET
    const res = await POST(istek())
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('CRON_SECRET missing')
  })

  it('sıradaki kullanıcıları senkronlar ve tamamlandı diye yazar', async () => {
    sira = ['user-1', 'user-2']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createServiceClient).mockResolvedValue(sahteIstemci({}) as any)
    vi.mocked(syncRecentlyPlayed)
      .mockResolvedValueOnce({ outcome: 'success', eventsWritten: 12, latestPlayedAt: null })
      .mockResolvedValueOnce({ outcome: 'success', eventsWritten: 5, latestPlayedAt: null })

    const json = await (await POST(istek())).json()
    expect(json.ok).toBe(true)
    expect(json.usersProcessed).toBe(2)
    expect(json.totalEventsWritten).toBe(17)
    expect(tamamlananlar.every((t) => t.hata === null)).toBe(true)
  })

  it('🔴 429 alan app’in hatası yazılır, KENDİ app’iyle bağlı kullanıcı yine işlenir', async () => {
    sira = ['a', 'c']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createServiceClient).mockResolvedValue(sahteIstemci({ a: null, c: 'byoc-c' }) as any)
    vi.mocked(syncRecentlyPlayed).mockImplementation(async (uid: string) =>
      uid === 'a'
        ? { outcome: 'rate_limited', eventsWritten: 0, latestPlayedAt: null }
        : { outcome: 'success', eventsWritten: 3, latestPlayedAt: null },
    )

    const json = await (await POST(istek())).json()

    expect(tamamlananlar.find((t) => t.userId === 'a')?.hata).toContain('429')
    expect(tamamlananlar.find((t) => t.userId === 'c')?.hata).toBeNull()
    expect(json.totalEventsWritten).toBe(3)
  })

  it('429 alan app’in SONRAKİ kullanıcısına hiç istek atılmaz', async () => {
    // a ve b aynı (paylaşılan) app'te. Önce a işlensin diye b'yi a bitince
    // sıraya koyuyoruz — işçiler eşzamanlı olsa da sıra deterministik kalır.
    sira = ['a']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createServiceClient).mockResolvedValue(sahteIstemci({ a: null, b: 'shared-id' }) as any)
    vi.mocked(syncRecentlyPlayed).mockImplementation(async (uid: string) => {
      if (uid === 'a') {
        sira.push('b')
        return { outcome: 'rate_limited', eventsWritten: 0, latestPlayedAt: null }
      }
      return { outcome: 'success', eventsWritten: 1, latestPlayedAt: null }
    })

    await POST(istek())

    expect(vi.mocked(syncRecentlyPlayed).mock.calls.map((c) => c[0])).toEqual(['a'])
    expect(tamamlananlar.find((t) => t.userId === 'b')?.hata).toContain('429')
  })

  it('çekirdek paketler 3 saatten sık kurulmaz', async () => {
    sira = ['taze', 'bayat']
    const yakin = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    vi.mocked(createServiceClient).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sahteIstemci({}, { taze: yakin }) as any,
    )
    vi.mocked(syncRecentlyPlayed).mockResolvedValue({ outcome: 'success', eventsWritten: 4, latestPlayedAt: null })

    await POST(istek())
    const kurulanlar = vi.mocked(refreshUserCorePackages).mock.calls.map((c) => c[0])
    expect(kurulanlar).toEqual(['bayat'])
  })
})
