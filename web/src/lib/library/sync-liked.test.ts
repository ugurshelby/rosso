import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Beğeni CANLI TAZELEME testleri.
 *
 * Bu iş tek turda 54+ Spotify isteği atar — üründeki en pahalı okuma.
 * §4.2 disiplini (blok kontrolü, geçit, cooldown, sayfa tavanı) ve olay
 * tablosunun "yalnız FARKI yaz" sözleşmesi burada korunuyor.
 */

const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []
const inserted: Array<Record<string, unknown>[]> = []
/** `resolveOrCreateTrackByIdentity`'nin `tracks`'e açtığı yeni satırlar. */
const tracksInserted: Array<Record<string, unknown>> = []
let cooldownRow: { blocked_until: string | null } | null = null
/** Rosso'nun bildiği beğeniler — farkı ÜRETMEK için (DB'nin işi taklit edilir). */
let bilinen: Array<{ spotify_id: string; liked_at: string }> = []
/** `tracks` tablosunda zaten olanlar. */
let katalogda: string[] = []
/** Spotify'dan gelen id'ler — `liked_sync_diff` mock'u bunu görür. */
let sonSpotifyIds: string[] = []

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  // ⚠ `createServiceClient` — `liked_songs_events` RLS'i INSERT'e yalnız
  // `service_role` izni verir (ölçüldü 2026-08-05: kullanıcı istemcisiyle
  // yazma `42501` ile sessizce reddediliyordu). Mock'u `createClient`'e geri
  // çevirmek testi geçirir ama canlıda yazma yine kırılır.
  createServiceClient: async () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args })
      if (name === 'cooldown_get') {
        return Promise.resolve({ data: cooldownRow ? [cooldownRow] : [], error: null })
      }
      if (name === 'liked_sync_diff') {
        // DB'nin yaptığı işi taklit et: iki yönlü fark + katalog durumu.
        //
        // ⚠ 0218 SÖZLEŞMESİ: TEK SATIR + dizi. Bu mock önceden satır kümesi
        // döndürüyordu; testler geçerken canlı KIRILDI çünkü PostgREST satır
        // kümesini 1.000'de kırpıyor. Mock gerçeği taklit etmeliydi, ettiği
        // varsayımı değil. Şekli değiştirmeden önce migration 0218'i oku.
        sonSpotifyIds = (args.p_spotify_ids ?? []) as string[]
        const bizde = new Set(bilinen.map((b) => b.spotify_id))
        const spotifyde = new Set(sonSpotifyIds)
        const katalogSet = new Set(katalogda)
        const toAdd = sonSpotifyIds.filter((id) => !bizde.has(id))
        const toRemove = [...bizde].filter((id) => !spotifyde.has(id))
        return Promise.resolve({
          data: [
            {
              to_add: toAdd,
              to_remove: toRemove,
              // ⚠ 0219: `toAdd` degil TUM Spotify listesi taranir. Eski
              // begenilerin katalog boslugu ancak boyle kapanir.
              catalog_missing: sonSpotifyIds.filter((id) => !katalogSet.has(id)),
            },
          ],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    },
    from: (table: string) => {
      // `tracks` — `resolveOrCreateTrackByIdentity` bunu spotify_id/isrc
      // lookup + insert için kullanır. Diğer tablolar (events) eski deseni
      // korur.
      // 0335: birleştirilmiş eski ID notları — bu testlerde alias yok.
      if (table === 'track_spotify_alias') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          }),
          upsert: () => Promise.resolve({ error: null }),
        }
      }
      if (table === 'tracks') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: () => {
                if (col === 'spotify_id') {
                  const found = katalogda.includes(val)
                  return Promise.resolve({
                    data: found ? { id: `id_${val}`, image_url: null } : null,
                    error: null,
                  })
                }
                // isrc lookup — bu testlerde isrc çakışması senaryosu yok.
                return Promise.resolve({ data: null, error: null })
              },
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              maybeSingle: () => {
                tracksInserted.push(row)
                katalogda.push(row.spotify_id as string)
                return Promise.resolve({ data: { id: `id_${row.spotify_id}` }, error: null })
              },
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }
      }
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: katalogda.map((id) => ({ spotify_id: id })),
              error: null,
            }),
        }),
        insert: (rows: Record<string, unknown>[]) => {
          inserted.push(rows)
          return Promise.resolve({ error: null })
        },
        _table: table,
      }
    },
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

const { syncLikedSongs } = await import('./sync-liked')
const { RateLimitedError } = await import('@/lib/playlists/fetch-retry')

/** Tek sayfalık Spotify cevabı üretir. */
function sayfa(
  ids: string[],
  opts: { next?: string | null; total?: number; addedAt?: string } = {},
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      total: opts.total ?? ids.length,
      next: opts.next ?? null,
      items: ids.map((id) => ({
        added_at: opts.addedAt ?? '2026-08-01T10:00:00Z',
        track: {
          id,
          name: `Sarki ${id}`,
          artists: [{ name: 'Sanatci' }],
          duration_ms: 200000,
          album: { name: 'Albüm' },
          external_ids: { isrc: `ISRC${id}` },
        },
      })),
    }),
  }
}

beforeEach(() => {
  rpcCalls.length = 0
  inserted.length = 0
  tracksInserted.length = 0
  cooldownRow = null
  bilinen = []
  katalogda = []
  fetchMock.mockReset()
})

describe('syncLikedSongs — §4.2 dış API disiplini', () => {
  it('kural 3: BLOKLU isek Spotify\'a HIC dokunmaz', async () => {
    cooldownRow = { blocked_until: new Date(Date.now() + 600_000).toISOString() }

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: false, reason: 'blocked' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('kural 2: 429 alinca cooldown DB\'ye YAZILIR', async () => {
    fetchMock.mockRejectedValue(new RateLimitedError(7200_000))

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: false, reason: 'blocked' })
    expect(rpcCalls.some((c) => c.name === 'cooldown_set')).toBe(true)
  })

  it('YENI ucu kullanir: GET /me/tracks (kaldirilmadi)', async () => {
    fetchMock.mockResolvedValue(sayfa([]))

    await syncLikedSongs('u1')

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1/me/tracks')
  })

  it('sayfalama: `next` bitene kadar surer', async () => {
    fetchMock
      .mockResolvedValueOnce(sayfa(['a'], { next: 'https://api.spotify.com/v1/me/tracks?offset=50', total: 2 }))
      .mockResolvedValueOnce(sayfa(['b'], { next: null, total: 2 }))

    const res = await syncLikedSongs('u1')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res).toMatchObject({ ok: true, added: 2 })
  })

  it('SAYFA TAVANI: `next` hep dolu gelse bile DURUR', async () => {
    // Bozuk/kotu niyetli cevap: next sonsuza kadar dolu. Tavan olmasaydi
    // dongu Spotify'i dakikalarca doverdi — 6,4 saatlik cezanin senaryosu.
    //
    // ⚠ Geçit testte 0ms'ye indirildi: gercek 250ms × tavan = dakikalar sürer.
    // Tavanin KENDISI test ediliyor, gecidin suresi degil (o ayri testte).
    fetchMock.mockResolvedValue(
      sayfa(['x'], { next: 'https://api.spotify.com/v1/me/tracks?offset=50' }),
    )

    await syncLikedSongs('u1', { maxPages: 20, gateMs: 0 })

    // Tavana DAYANMALI ve orada durmali — hem sinirsiz degil, hem erken degil.
    expect(fetchMock.mock.calls.length).toBe(20)
  })

  it('kural 1: sayfalar arasi GECIT var (istekler ust uste binmez)', async () => {
    // Uretim varsayilani 250ms. Bu test gecidin VARLIGINI olcer: iki sayfa
    // arasinda gecen sure sifir olamaz.
    fetchMock
      .mockResolvedValueOnce(
        sayfa(['a'], { next: 'https://api.spotify.com/v1/me/tracks?offset=50' }),
      )
      .mockResolvedValueOnce(sayfa(['b']))

    const basla = Date.now()
    await syncLikedSongs('u1')
    const gecen = Date.now() - basla

    // Tek gecit = 250ms; olcum gurultusune pay birakiyoruz.
    expect(gecen).toBeGreaterThanOrEqual(200)
  })
})

describe('syncLikedSongs — olay sozlesmesi', () => {
  it('yalniz FARKI yazar (tum listeyi degil)', async () => {
    // Spotify'da a,b,c — Rosso'da a var. Yalniz b ve c yazilmali.
    fetchMock.mockResolvedValue(sayfa(['a', 'b', 'c']))
    bilinen = [{ spotify_id: 'a', liked_at: '2026-07-01T00:00:00Z' }]
    katalogda = ['a', 'b', 'c']

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: true, added: 2, removed: 0 })
    const olaylar = inserted[0] ?? []
    expect(olaylar).toHaveLength(2)
    expect(olaylar.map((o) => o.spotify_uri).sort()).toEqual([
      'spotify:track:b',
      'spotify:track:c',
    ])
  })

  it('Spotify\'da olmayan begeni `unliked` olarak yazilir', async () => {
    fetchMock.mockResolvedValue(sayfa(['a']))
    bilinen = [
      { spotify_id: 'a', liked_at: '2026-07-01T00:00:00Z' },
      { spotify_id: 'eski', liked_at: '2026-06-01T00:00:00Z' },
    ]
    katalogda = ['a']

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: true, added: 0, removed: 1 })
    const olay = (inserted[0] ?? [])[0]
    expect(olay).toMatchObject({
      spotify_uri: 'spotify:track:eski',
      event_type: 'unliked',
    })
  })

  it('occurred_at = Spotify\'in added_at\'i (now() DEGIL)', async () => {
    // Kritik: "ne zaman begendim" bugune cakilirsa Tozlu Raflar ve Gozden
    // Kacanlar kovalari bozulur — ikisi de tarihe bakiyor.
    fetchMock.mockResolvedValue(sayfa(['yeni'], { addedAt: '2024-03-15T08:30:00Z' }))
    katalogda = ['yeni']

    await syncLikedSongs('u1')

    expect((inserted[0] ?? [])[0]).toMatchObject({
      occurred_at: '2024-03-15T08:30:00Z',
    })
  })

  it('§4.3: farki DB HESAPLAR — istemci `user_liked_track_ids` CEKMEZ', async () => {
    // ÖLÇÜLDÜ (2026-08-05): `user_liked_track_ids` canlida 2.661 satir donuyor
    // ama Supabase REST 1.000'de SESSIZCE kirpiyor. Istemcide karsilastirma
    // yapilsaydi 1.661 sarki "yeni begeni" sanilip mukerrer olay yazilacakti.
    // Bu test o donusu engeller: fark RPC'den gelmeli.
    fetchMock.mockResolvedValue(sayfa(['a', 'b']))
    bilinen = [{ spotify_id: 'a', liked_at: '2026-07-01T00:00:00Z' }]
    katalogda = ['a', 'b']

    await syncLikedSongs('u1')

    expect(rpcCalls.some((c) => c.name === 'liked_sync_diff')).toBe(true)
    expect(rpcCalls.some((c) => c.name === 'user_liked_track_ids')).toBe(false)
    // Spotify id'leri RPC'ye parametre olarak GIDIYOR (fark orada cikiyor).
    expect(sonSpotifyIds.sort()).toEqual(['a', 'b'])
  })

  it('degisiklik yoksa HIC olay yazmaz', async () => {
    fetchMock.mockResolvedValue(sayfa(['a']))
    bilinen = [{ spotify_id: 'a', liked_at: '2026-07-01T00:00:00Z' }]

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: true, added: 0, removed: 0 })
    expect(inserted).toHaveLength(0)
  })

  it('0219: ZATEN begenili ama katalogsuz sarki da `tracks`e acilir', async () => {
    // ÖLÇÜLDÜ (2026-08-05): ZIP'ten gelen 11 sarkinin `tracks` karsiligi yoktu.
    // `liked_songs_page` JOIN yaptigi icin sayiya girip LISTEDE gorunmuyorlardi
    // (user_liked_track_ids 2.697 vs liked_songs_page 2.686).
    //
    // Bu sarkilar hem Spotify'da hem Rosso'da begenili -> farka HIC girmiyor.
    // Eski `to_add` temelli katalog filtresi onlari asla goremezdi; boşluk her
    // senkronda hayatta kaliyordu. Sessiz ve kalici bir kor nokta.
    fetchMock.mockResolvedValue(sayfa(['eski1', 'eski2']))
    // Ikisi de ZATEN begenili -> to_add bos kalir
    bilinen = [
      { spotify_id: 'eski1', liked_at: '2026-07-19T00:00:00Z' },
      { spotify_id: 'eski2', liked_at: '2026-07-19T00:00:00Z' },
    ]
    katalogda = [] // ikisi de katalogsuz

    const res = await syncLikedSongs('u1')

    // Yeni olay YOK ama katalog bosluğu KAPANMALI.
    expect(res).toMatchObject({ ok: true, added: 0, removed: 0, catalogAdded: 2 })
    expect(inserted).toHaveLength(0)
  })

  it('§4.3 CIKTI tarafi: 1.000 satiri asan fark KIRPILMADAN islenir', async () => {
    // ÖLÇÜLDÜ (2026-08-05, migration 0218): RPC satir kumesi donerken PostgREST
    // sonucu 1.000'de kesiyordu — tek id gonderilip 999 `remove` alindi, oysa
    // gercek ~2.660'ti. Kirpilmis farkla senkron surseydi kullanicinin HALA
    // begendigi ~1.660 sarkiya `unliked` yazilacakti. Hata VERMEZ.
    //
    // Bu test esigi asan bir kume kurar: kirpma geri gelirse sayilar tutmaz.
    const spotifydeki = Array.from({ length: 1500 }, (_, i) => `s${i}`)
    const bizdeki = Array.from({ length: 1200 }, (_, i) => `b${i}`)

    fetchMock.mockResolvedValue(sayfa(spotifydeki))
    bilinen = bizdeki.map((id) => ({ spotify_id: id, liked_at: '2026-07-01T00:00:00Z' }))
    katalogda = spotifydeki

    const res = await syncLikedSongs('u1')

    // Hicbiri ortak degil: 1.500 eklenir, 1.200 cikarilir. Ikisi de 1.000 USTU.
    expect(res).toMatchObject({ ok: true, added: 1500, removed: 1200 })
    // `inserted` toplu cagri dizisi tutar; olaylar TEK insert'te gider.
    expect(inserted[0] ?? []).toHaveLength(2700)
  })
})

describe('syncLikedSongs — katalog bosluğu', () => {
  it('katalogda OLMAYAN sarki `tracks`\'e acilir', async () => {
    // Olculmus gercek durum: 11 sarki begenilmis ama hic dinlenmemis, bu
    // yuzden katalogda yok. `liked_songs_page` join yaptigi icin sayida
    // gorunup LISTEDE gorunmuyorlardi.
    fetchMock.mockResolvedValue(sayfa(['bilinmeyen']))
    katalogda = [] // katalog bos

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: true, catalogAdded: 1 })
    expect(tracksInserted[0]).toMatchObject({
      spotify_id: 'bilinmeyen',
      title: 'Sarki bilinmeyen',
      artists: ['Sanatci'],
    })
  })

  it('katalogda VARSA tekrar yazmaz', async () => {
    fetchMock.mockResolvedValue(sayfa(['var']))
    katalogda = ['var']

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: true, catalogAdded: 0 })
    expect(tracksInserted).toHaveLength(0)
  })
})

describe('syncLikedSongs — hata yollari', () => {
  it('403 -> scope_missing (beklemek COZMEZ)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 })

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: false, reason: 'scope_missing', status: 403 })
    expect(inserted).toHaveLength(0)
  })

  it('diger HTTP hatalarinda olay YAZILMAZ', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    const res = await syncLikedSongs('u1')

    expect(res).toMatchObject({ ok: false, reason: 'failed' })
    expect(inserted).toHaveLength(0)
  })
})
