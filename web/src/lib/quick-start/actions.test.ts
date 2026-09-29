// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hesaplaQuickStart, type QuickStartHam, type YetenekHaritasi } from './durum'
import { KILIT_KATALOGU } from './kilit-katalogu'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn(async () => ({ id: 'u1' })) }))

const upsertMock = vi.fn(async (_satirlar: unknown, _secenek: unknown) => ({ error: null as unknown }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: () => ({ upsert: upsertMock }) }),
}))

let durum = hesaplaQuickStart(
  {
    spotify: false, streaming: false, account: false, technical: false,
    yukleniyor: false, sonZipAt: null,
  },
  Object.fromEntries(KILIT_KATALOGU.map((k) => [k.yetenek, false])) as unknown as YetenekHaritasi,
  new Set(),
)
vi.mock('./read', () => ({ getQuickStartState: vi.fn(async () => durum) }))

const { animasyonGorulduIsaretle } = await import('./actions')
const { _clearAllRateLimits } = await import('@/lib/security/rate-limit')

const faz1 = Object.fromEntries(KILIT_KATALOGU.map((k) => [k.yetenek, false])) as unknown as YetenekHaritasi

function durumKur(ham: Partial<QuickStartHam>, acikYetenekler: string[] = [], gorulen: string[] = []) {
  durum = hesaplaQuickStart(
    {
      spotify: false, streaming: false, account: false, technical: false,
      yukleniyor: false, sonZipAt: null, ...ham,
    },
    { ...faz1, ...Object.fromEntries(acikYetenekler.map((y) => [y, true])) } as YetenekHaritasi,
    new Set(gorulen),
  )
}

beforeEach(() => {
  upsertMock.mockClear()
  _clearAllRateLimits()
  durumKur({})
})

describe('animasyonGorulduIsaretle', () => {
  it('hak edilmiş anahtarı kaydeder; ON CONFLICT DO NOTHING ile', async () => {
    durumKur({ spotify: true })
    const r = await animasyonGorulduIsaretle(['qs:spotify'])
    expect(r).toEqual({ ok: true, data: { kaydedilen: ['qs:spotify'], atlanan: [] } })
    expect(upsertMock).toHaveBeenCalledWith(
      [{ user_id: 'u1', anahtar: 'qs:spotify' }],
      { onConflict: 'user_id,anahtar', ignoreDuplicates: true },
    )
  })

  it('🔴 hak edilmemiş anahtar (adım eksik / kilit kapalı) KAYDEDİLMEZ', async () => {
    // Faz 1: hiçbir şey tamam değil. Kutlamayı önceden tüketmek mümkün olmamalı.
    const r = await animasyonGorulduIsaretle(['qs:spotify', 'kilit:recap'])
    expect(r).toEqual({ ok: true, data: { kaydedilen: [], atlanan: ['qs:spotify', 'kilit:recap'] } })
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('kilit açıksa kaydeder (bölüm anahtarı dahil)', async () => {
    durumKur({ spotify: true }, ['canSeePlaylists'])
    const r = await animasyonGorulduIsaretle(['kilit:playlists', 'kilit:playlists:ust-kart'])
    expect(r.ok && r.data.kaydedilen).toEqual(['kilit:playlists', 'kilit:playlists:ust-kart'])
  })

  it('katalog dışı / çöp anahtar atlanır, geçerliler işlenir', async () => {
    durumKur({ spotify: true })
    const r = await animasyonGorulduIsaretle(['qs:spotify', 'qs:hack', "x'; drop table y;--", 42 as unknown as string])
    expect(r.ok && r.data.kaydedilen).toEqual(['qs:spotify'])
    expect(r.ok && r.data.atlanan).toContain('qs:hack')
  })

  it('tekrarlanan anahtar tek kez yazılır', async () => {
    durumKur({ spotify: true })
    await animasyonGorulduIsaretle(['qs:spotify', 'qs:spotify'])
    expect((upsertMock.mock.calls[0]![0] as unknown[]).length).toBe(1)
  })

  it('durum OKUNAMIYORSA (kaynak=hata) hiçbir şey kaydedilmez', async () => {
    const { guvenliQuickStart } = await import('./durum')
    durum = guvenliQuickStart(faz1)
    const r = await animasyonGorulduIsaretle(['qs:spotify'])
    expect(r.ok && r.data.kaydedilen).toEqual([])
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('boş liste ve fazla anahtar reddedilir', async () => {
    expect((await animasyonGorulduIsaretle([])).ok).toBe(false)
    const cok = Array.from({ length: 21 }, (_, i) => `kilit:recap:b${i}x`)
    expect((await animasyonGorulduIsaretle(cok)).ok).toBe(false)
  })

  it('rate limit: 31. çağrı reddedilir', async () => {
    durumKur({ spotify: true })
    for (let i = 0; i < 30; i++) await animasyonGorulduIsaretle(['qs:spotify'])
    const r = await animasyonGorulduIsaretle(['qs:spotify'])
    expect(r.ok).toBe(false)
  })

  it('DB hatasında ok:false döner', async () => {
    durumKur({ spotify: true })
    upsertMock.mockResolvedValueOnce({ error: { message: 'x' } })
    expect((await animasyonGorulduIsaretle(['qs:spotify'])).ok).toBe(false)
  })
})
