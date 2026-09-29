// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const zamanlanan: Array<() => unknown> = []
vi.mock('next/server', async (orijinal) => {
  const gercek = await orijinal<typeof import('next/server')>()
  return { ...gercek, after: (fn: () => unknown) => void zamanlanan.push(fn) }
})

vi.mock('@/lib/auth', () => ({
  apiAuth: vi.fn(async () => ({ ok: true, user: { id: 'u1' } })),
}))

let trackSatiri: Record<string, unknown> | null = null
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: trackSatiri, error: null }) }) }),
    }),
  }),
}))

const ensureValidToken = vi.fn()
vi.mock('@/lib/services/token-refresh', () => ({ ensureValidToken: (...a: unknown[]) => ensureValidToken(...a) }))

const cacheSpotify = vi.fn()
const cacheDeezer = vi.fn()
const denendi = vi.fn()
vi.mock('@/lib/images/catalog-cache', () => ({
  cacheImageInBackground: (...a: unknown[]) => cacheSpotify(...a),
  cacheDeezerImageInBackground: (...a: unknown[]) => cacheDeezer(...a),
  deezerDenendiIsaretle: (...a: unknown[]) => denendi(...a),
}))

const deezerSarkiKapagi = vi.fn()
vi.mock('@/lib/cover/deezer', async (orijinal) => {
  const gercek = await orijinal<typeof import('@/lib/cover/deezer')>()
  return { ...gercek, deezerSarkiKapagi: (...a: unknown[]) => deezerSarkiKapagi(...a) }
})

import { GET } from './route'
import { DeezerGeciciHata } from '@/lib/cover/deezer'

const params = { params: Promise.resolve({ id: 'track-1' }) }
const istek = () => new Request('http://localhost/api/images/track/track-1')

beforeEach(() => {
  vi.clearAllMocks()
  zamanlanan.length = 0
  global.fetch = vi.fn() as unknown as typeof fetch
  trackSatiri = { spotify_id: 'sp1', image_url: null, isrc: 'GBUM71505078', title: 'Let It Happen', artists: ['Tame Impala'] }
})

describe('/api/images/track/[id] — Spotify > Deezer sırası', () => {
  it('DB\'de kapak varsa HİÇBİR dış servise gidilmez', async () => {
    trackSatiri = { ...trackSatiri, image_url: 'https://kayitli/kapak.jpg' }
    const res = await GET(istek(), params)
    expect((await res.json()).images[0].url).toBe('https://kayitli/kapak.jpg')
    expect(ensureValidToken).not.toHaveBeenCalled()
    expect(deezerSarkiKapagi).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('🔴 Spotify bağlantısı YOKSA Deezer\'dan gelir, yanıt hemen döner, kalıcılaştırma arka planda', async () => {
    ensureValidToken.mockResolvedValue(null)
    deezerSarkiKapagi.mockResolvedValue({ url: 'https://cdn-images.dzcdn.net/images/cover/x/500.jpg', kaynak: 'isrc' })
    const res = await GET(istek(), params)
    const govde = await res.json()
    expect(res.status).toBe(200)
    expect(govde.images[0].url).toContain('dzcdn.net')
    // Yanıt döndükten sonra çalışacak iş zamanlandı, henüz çalışmadı:
    expect(cacheDeezer).not.toHaveBeenCalled()
    for (const is of zamanlanan) await is()
    expect(cacheDeezer).toHaveBeenCalledWith({ table: 'tracks', rowId: 'track-1', sourceUrl: expect.stringContaining('dzcdn.net') })
  })

  it('Spotify bağlantısı VARSA önce Spotify; Spotify kapağı dönerse Deezer\'a hiç gidilmez', async () => {
    ensureValidToken.mockResolvedValue('tok')
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ album: { images: [{ url: 'https://i.scdn.co/x', width: 640, height: 640 }] } }),
    } as Response)
    const res = await GET(istek(), params)
    expect((await res.json()).images[0].url).toBe('https://i.scdn.co/x')
    expect(cacheSpotify).toHaveBeenCalled()
    expect(deezerSarkiKapagi).not.toHaveBeenCalled()
  })

  it('Spotify başarısızsa (429/kapaksız) Deezer\'a düşülür', async () => {
    ensureValidToken.mockResolvedValue('tok')
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 429 } as Response)
    deezerSarkiKapagi.mockResolvedValue({ url: 'https://cdn-images.dzcdn.net/images/cover/x/500.jpg', kaynak: 'arama' })
    const res = await GET(istek(), params)
    expect(res.status).toBe(200)
    expect(deezerSarkiKapagi).toHaveBeenCalledTimes(1)
  })

  it('Deezer\'da KESİN yoksa 404 ve "denendi" damgası (tekrar aranmasın)', async () => {
    ensureValidToken.mockResolvedValue(null)
    deezerSarkiKapagi.mockResolvedValue(null)
    const res = await GET(istek(), params)
    expect(res.status).toBe(404)
    for (const is of zamanlanan) await is()
    expect(denendi).toHaveBeenCalledWith('tracks', 'track-1')
  })

  it('Deezer GEÇİCİ hatasında (ağ/kota) damga VURULMAZ, 502 döner', async () => {
    ensureValidToken.mockResolvedValue(null)
    deezerSarkiKapagi.mockRejectedValue(new DeezerGeciciHata('kota'))
    const res = await GET(istek(), params)
    expect(res.status).toBe(502)
    for (const is of zamanlanan) await is()
    expect(denendi).not.toHaveBeenCalled()
  })

  it('track bulunamazsa 404', async () => {
    trackSatiri = null
    expect((await GET(istek(), params)).status).toBe(404)
  })
})
