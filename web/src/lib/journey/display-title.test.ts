import { describe, expect, it } from 'vitest'
import { displayTrackTitle } from './display-title'

describe('displayTrackTitle — journey podyum kısa adı', () => {
  it('Roma rakamlı seri önekini keser (Sahip\'in örneği)', () => {
    expect(displayTrackTitle('Mevsim Olmayan Mekanlar V: Unutulanlar'))
      .toBe('Unutulanlar')
  })

  it('seri öneki + feat. birlikte temizlenir', () => {
    expect(displayTrackTitle('Mevsim Olmayan Mekanlar V: Unutulanlar (feat. Sagopa)'))
      .toBe('Unutulanlar')
  })

  it('sayılı seri önekini keser', () => {
    expect(displayTrackTitle('Bölüm 3: Kar')).toBe('Kar')
  })

  it('seri kalıbı olmayan iki noktayı KESMEZ', () => {
    expect(displayTrackTitle('Blade Runner: Tears in Rain'))
      .toBe('Blade Runner: Tears in Rain')
  })

  it('tireli sanatçı/şarkı adını bozmaz', () => {
    expect(displayTrackTitle('Jay-Z')).toBe('Jay-Z')
    expect(displayTrackTitle('Lo-fi Dreams')).toBe('Lo-fi Dreams')
  })

  it('kesim sonrası kalan çok kısaysa tam başlığı korur', () => {
    // 'Bölüm 2: Ay' → 'Ay' iki karakter; kırpmaktansa tam başlık.
    expect(displayTrackTitle('Bölüm 2: Ay')).toBe('Bölüm 2: Ay')
  })

  it('süsleme temizliğini devralır', () => {
    expect(displayTrackTitle('Six Days - Remix')).toBe('Six Days')
    expect(displayTrackTitle('Arcade (feat. FLETCHER)')).toBe('Arcade')
  })

  it('boş ve sıradan başlıklarda güvenli', () => {
    expect(displayTrackTitle('')).toBe('')
    expect(displayTrackTitle('Papaoutai')).toBe('Papaoutai')
  })
})
