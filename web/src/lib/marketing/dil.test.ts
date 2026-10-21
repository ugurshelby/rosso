import { describe, expect, it } from 'vitest'
import { dilAlternatifleri, yerelYol, yolCoz } from './dil'

describe('yerelYol', () => {
  it('Türkçe öneksiz kalır', () => {
    expect(yerelYol('tr', '/')).toBe('/')
    expect(yerelYol('tr', '/help')).toBe('/help')
  })

  it('İngilizce /en öneki alır, kökte eğik çizgi bırakmaz', () => {
    expect(yerelYol('en', '/')).toBe('/en')
    expect(yerelYol('en', '/blog/recap-vs-taste')).toBe('/en/blog/recap-vs-taste')
    expect(yerelYol('en', 'help')).toBe('/en/help')
  })
})

describe('yolCoz', () => {
  it('İngilizce yolu tabana çevirir', () => {
    expect(yolCoz('/en')).toEqual({ dil: 'en', tabanYol: '/' })
    expect(yolCoz('/en/help')).toEqual({ dil: 'en', tabanYol: '/help' })
  })

  it('Türkçe yolu olduğu gibi bırakır', () => {
    expect(yolCoz('/')).toEqual({ dil: 'tr', tabanYol: '/' })
    expect(yolCoz('/blog')).toEqual({ dil: 'tr', tabanYol: '/blog' })
  })

  it('"/en" ile başlayan başka bir kelimeyi İngilizce sanmaz', () => {
    expect(yolCoz('/enerji')).toEqual({ dil: 'tr', tabanYol: '/enerji' })
  })
})

describe('dilAlternatifleri', () => {
  it('her dil KENDİ adresini canonical gösterir', () => {
    expect(dilAlternatifleri('tr', '/help').canonical).toBe('/help')
    expect(dilAlternatifleri('en', '/help').canonical).toBe('/en/help')
  })

  it('iki dilin hreflang eşleşmesi + x-default Türkçe', () => {
    expect(dilAlternatifleri('en', '/').languages).toEqual({
      'tr-TR': '/',
      'en-US': '/en',
      'x-default': '/',
    })
  })
})
