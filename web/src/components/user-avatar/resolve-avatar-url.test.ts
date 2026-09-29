import { describe, expect, it } from 'vitest'
import { resolveAvatarUrl } from './resolve-avatar-url'

describe('resolveAvatarUrl', () => {
  it('avatar_url önceliklidir', () => {
    expect(
      resolveAvatarUrl({
        avatar_url: 'https://cdn.example/a.jpg',
        picture: 'https://cdn.example/b.jpg',
      }),
    ).toBe('https://cdn.example/a.jpg')
  })

  it('picture fallback kullanır', () => {
    expect(
      resolveAvatarUrl({ picture: 'https://lh3.googleusercontent.com/a/abc' }),
    ).toBe('https://lh3.googleusercontent.com/a/abc')
  })

  it('boş veya eksik metadata için null döner', () => {
    expect(resolveAvatarUrl(null)).toBeNull()
    expect(resolveAvatarUrl({})).toBeNull()
    expect(resolveAvatarUrl({ avatar_url: '  ' })).toBeNull()
  })

  it('boşlukları kırpar', () => {
    expect(resolveAvatarUrl({ avatar_url: '  https://x.test/p.jpg  ' })).toBe(
      'https://x.test/p.jpg',
    )
  })
})
