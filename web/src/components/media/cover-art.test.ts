import { describe, it, expect } from 'vitest'
import { sizedUrl } from './cover-art'

describe('sizedUrl — Storage görsel boyutlandırma (P0 2026-07-24)', () => {
  const STORAGE = 'https://x.supabase.co/storage/v1/object/public/catalog-images/tracks/abc.jpg'

  it('kendi Storage URL’sini render/image transform yoluna çevirir', () => {
    const out = sizedUrl(STORAGE, 36)
    expect(out).toContain('/storage/v1/render/image/public/')
    expect(out).toContain('width=72') // 2× DPR
    expect(out).toContain('height=72')
    expect(out).toContain('resize=cover')
    expect(out).toContain('format=webp') // PERF-4
  })

  it('2× DPR uygular ama kaynağın 640 üst sınırını aşmaz', () => {
    expect(sizedUrl(STORAGE, 300)).toContain('width=600') // 300×2
    expect(sizedUrl(STORAGE, 400)).toContain('width=640') // 800 değil, 640 tavan
  })

  it('Spotify CDN URL’sine DOKUNMAZ (transform desteklemez)', () => {
    const spotify = 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84x'
    expect(sizedUrl(spotify, 36)).toBe(spotify)
  })

  it('signed Storage URL’sine dokunmaz (object/public değil)', () => {
    const signed = 'https://x.supabase.co/storage/v1/object/sign/profile-photos/a.jpg?token=y'
    expect(sizedUrl(signed, 36)).toBe(signed)
  })
})
