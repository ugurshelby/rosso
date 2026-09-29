import { describe, it, expect } from 'vitest'
import { sizedUrl } from './sized-url'

const STORAGE = 'https://x.supabase.co/storage/v1/object/public/catalog-images/tracks/abc.jpg'
const ALBUM_640 = 'https://i.scdn.co/image/ab67616d0000b273e866d125ae4069fdf7e7606a'
const ARTIST_640 = 'https://i.scdn.co/image/ab6761610000e5eb0123456789abcdef01234567'
const DEEZER = 'https://cdn-images.dzcdn.net/images/cover/0123456789abcdef0123456789abcdef/500x500-000000-80-0-0.jpg'

describe('sizedUrl — Storage (2× DPR, webp, 640 tavan)', () => {
  it('render/image transform yoluna çevirir', () => {
    const out = sizedUrl(STORAGE, 36)
    expect(out).toContain('/storage/v1/render/image/public/')
    expect(out).toContain('width=72')
    expect(out).toContain('format=webp')
  })

  it('idempotent: boyutlanmış URL tekrar dönüştürülmez', () => {
    const once = sizedUrl(STORAGE, 36)
    expect(sizedUrl(once, 200)).toBe(once)
  })
})

describe('sizedUrl — Spotify sabit varyantları (2026-09-24 HAR bulgusu)', () => {
  it('küçük satır kapağı için 64 px varyantı seçer', () => {
    expect(sizedUrl(ALBUM_640, 36)).toBe('https://i.scdn.co/image/ab67616d00004851e866d125ae4069fdf7e7606a')
  })

  it('orta kart için 300 px varyantı seçer (1.5× eşik)', () => {
    expect(sizedUrl(ALBUM_640, 200)).toContain('/image/ab67616d00001e02')
    expect(sizedUrl(ALBUM_640, 48)).toContain('/image/ab67616d00001e02')
  })

  it('hero için 640 px varyantını korur', () => {
    expect(sizedUrl(ALBUM_640, 640)).toBe(ALBUM_640)
  })

  it('küçük varyanttan büyüğe de çıkabilir (idempotent seçim)', () => {
    const small = sizedUrl(ALBUM_640, 36)
    expect(sizedUrl(small, 640)).toBe(ALBUM_640)
  })

  it('sanatçı görsellerinde sanatçı kod tablosunu kullanır', () => {
    expect(sizedUrl(ARTIST_640, 40)).toContain('/image/ab6761610000f178')
    expect(sizedUrl(ARTIST_640, 200)).toContain('/image/ab67616100005174')
  })

  it('playlist/mosaic kapaklarına DOKUNMAZ (kod tablosu güvenilir değil)', () => {
    const playlist = 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84x'
    const mosaic = 'https://mosaic.scdn.co/640/ab67616d00001e02aaa'
    expect(sizedUrl(playlist, 36)).toBe(playlist)
    expect(sizedUrl(mosaic, 36)).toBe(mosaic)
  })
})

describe('sizedUrl — Deezer ve bilinmeyenler', () => {
  it('Deezer boyut segmentini 2× DPR ile yeniden yazar', () => {
    expect(sizedUrl(DEEZER, 60)).toContain('/120x120-000000-80-0-0.jpg')
  })

  it('tanınmayan URL’ye ve boş değere dokunmaz', () => {
    const other = 'https://example.com/a.jpg'
    expect(sizedUrl(other, 36)).toBe(other)
    expect(sizedUrl('', 36)).toBe('')
  })
})
