import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * A5 — Spotify beğeni YAZMA testleri.
 *
 * Bu modül üründeki tek dış-API-yazan kullanıcı aksiyonu; CLAUDE.md §4.2'nin
 * dört kuralı burada test edilir. 2026-06-22'de Spotify 6,4 saat ceza verdi —
 * bu testler o dersin bekçisi.
 */

const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []
const inserted: Array<Record<string, unknown>> = []
let cooldownRow: { blocked_until: string | null } | null = null

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args })
      if (name === 'cooldown_get') {
        return Promise.resolve({ data: cooldownRow ? [cooldownRow] : [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push(row)
        return Promise.resolve({ error: null })
      },
    }),
  }),
}))

vi.mock('@/lib/playlists/spotify-target', () => ({
  getSpotifyToken: async () => 'tok_test',
}))

const fetchMock = vi.fn()
vi.mock('@/lib/playlists/fetch-retry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/playlists/fetch-retry')>(
    '@/lib/playlists/fetch-retry',
  )
  return { ...actual, fetchWithRetry: (...a: unknown[]) => fetchMock(...a) }
})

const { setTrackLiked, setLikedBulk } = await import('./like-track')
const { RateLimitedError } = await import('@/lib/playlists/fetch-retry')

beforeEach(() => {
  rpcCalls.length = 0
  inserted.length = 0
  cooldownRow = null
  fetchMock.mockReset()
})

describe('setTrackLiked — §4.2 dış API disiplini', () => {
  it('kural 3: BLOKLU isek Spotify\'a HIC dokunmaz', async () => {
    cooldownRow = { blocked_until: new Date(Date.now() + 600_000).toISOString() }

    const res = await setTrackLiked('u1', 'track1', true)

    expect(res).toMatchObject({ ok: false, reason: 'blocked' })
    // Kritik: tek bir istek bile atılmamalı — her istek cezayı besler.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gecmis cooldown engellemez', async () => {
    cooldownRow = { blocked_until: new Date(Date.now() - 1000).toISOString() }
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    const res = await setTrackLiked('u1', 'track1', true)

    expect(res).toEqual({ ok: true, liked: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('begenme PUT, kaldirma DELETE kullanir', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    await setTrackLiked('u1', 'track1', true)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT' })

    fetchMock.mockClear()
    await setTrackLiked('u1', 'track1', false)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
  })

  it('YENI ucu kullanir: /me/library?uris= (id ile /me/tracks DEGIL)', async () => {
    // Şubat 2026 Dev Mode değişikliği: `/me/tracks` KALDIRILDI → 403.
    // Bu test olmadan uç nokta sessizce eskiyebiliyordu (2026-08-05'te
    // kalp butonu haftalarca çalışmadı, kimse fark etmedi).
    //
    // İki sözleşme birden korunuyor, ikisi de canlıda ölçüldü:
    //   · id değil URI (`spotify:track:...`)
    //   · gövde değil sorgu dizesi (gövdeyle → 400 "Missing required field")
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    await setTrackLiked('u1', 'track1', true)

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/v1/me/library')
    expect(url).not.toContain('/me/tracks')
    expect(decodeURIComponent(url)).toContain('uris=spotify:track:track1')
    // Gövde GÖNDERİLMEZ — Spotify bu uçta gövdeyi yok sayıp 400 döner.
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('body')
  })

  it('kural 2+4: 429 alinca cooldown DB\'ye YAZILIR', async () => {
    fetchMock.mockRejectedValue(new RateLimitedError(7200_000)) // 2 saat

    const res = await setTrackLiked('u1', 'track1', true)

    expect(res).toMatchObject({ ok: false, reason: 'blocked' })
    const set = rpcCalls.find((c) => c.name === 'cooldown_set')
    expect(set, 'cooldown DB\'ye yazilmali (§4.2)').toBeTruthy()
    expect(set?.args.p_reason).toBe('like_write_429')
  })

  it('kural 4: Retry-After SIFIR ise 1 saat varsayilir', async () => {
    // Sıfır kabul edilirse devre kesici ölür: cron hemen yine dener.
    fetchMock.mockRejectedValue(new RateLimitedError(0))

    const res = await setTrackLiked('u1', 'track1', true)

    expect(res).toMatchObject({ ok: false, reason: 'blocked', retryAfterSeconds: 3600 })
  })

  it('Spotify BASARISIZSA yerel olay YAZILMAZ (iki taraf ayrismasin)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    const res = await setTrackLiked('u1', 'track1', true)

    expect(res).toMatchObject({ ok: false, reason: 'failed', status: 500 })
    expect(inserted).toHaveLength(0)
  })

  it('403 -> scope_missing (izin eksik; beklemek COZMEZ)', async () => {
    // 2026-08-05 canlı ölçüm: `/me/tracks` yazmada 403 geliyordu çünkü
    // token'da `user-library-modify` yoktu (scope listesine o gün eklendi).
    // Bu durum `failed`'dan AYRI raporlanır: çözümü tekrar denemek değil,
    // kullanıcının Spotify'ı yeniden yetkilendirmesi.
    //
    // ⚠ Gövdeye BAKILMAZ — ölçüldü: Spotify yalnız `{"error":{"status":403,
    // "message":"Forbidden"}}` döner, "scope" kelimesi GEÇMEZ. Gövdede
    // 'scope' arayan bir ayrım hiç tetiklenmezdi.
    fetchMock.mockResolvedValue({ ok: false, status: 403 })

    const res = await setTrackLiked('u1', 'track1', true)

    expect(res).toMatchObject({ ok: false, reason: 'scope_missing', status: 403 })
    expect(inserted).toHaveLength(0)
  })

  it('basarida yerel olay OLAY olarak eklenir (guncelleme degil)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    await setTrackLiked('u1', 'track1', false)

    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({
      spotify_uri: 'spotify:track:track1',
      event_type: 'unliked',
    })
  })
})

describe('setLikedBulk — §4.2 kural 1 (250ms geçit)', () => {
  it('50\'lik partilere boler', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    const ids = Array.from({ length: 120 }, (_, i) => `t${i}`)

    const res = await setLikedBulk('u1', ids, true)

    expect(res.done).toBe(120)
    expect(fetchMock).toHaveBeenCalledTimes(3) // 50 + 50 + 20

    // Toplu çağrı da YENİ uca gitmeli — tekil düzeltilip bu unutulursa
    // "beğen" çalışır ama toplu işlem sessizce 403 alır.
    const url = decodeURIComponent(String(fetchMock.mock.calls[0]?.[0]))
    expect(url).toContain('/v1/me/library?uris=')
    expect(url).toContain('spotify:track:t0,spotify:track:t1')
  })

  it('partiler arasi GECIT bekler (ilk parti haric)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 })
    const ids = Array.from({ length: 100 }, (_, i) => `t${i}`)

    const start = Date.now()
    await setLikedBulk('u1', ids, true)
    const elapsed = Date.now() - start

    // 2 parti = 1 geçit = ≥250ms. Geçit kaldırılırsa bu test düşer.
    expect(elapsed).toBeGreaterThanOrEqual(240)
  })

  it('ILK 429\'da DURUR ve cooldown yazar', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockRejectedValueOnce(new RateLimitedError(3600_000))
    const ids = Array.from({ length: 150 }, (_, i) => `t${i}`)

    const res = await setLikedBulk('u1', ids, true)

    // İlk parti geçti, ikincide durdu — üçüncü HİÇ denenmedi.
    expect(res.done).toBe(50)
    expect(res.blocked).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(rpcCalls.some((c) => c.name === 'cooldown_set')).toBe(true)
  })

  it('bloklu isek hic baslamaz', async () => {
    cooldownRow = { blocked_until: new Date(Date.now() + 600_000).toISOString() }

    const res = await setLikedBulk('u1', ['a', 'b'], true)

    expect(res).toMatchObject({ done: 0, blocked: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
