import { describe, it, expect } from 'vitest'
import { anahtariAyristir, gecerliAnimasyonAnahtari, kilitAnahtari, qsAnahtari } from './anahtarlar'

describe('animasyon anahtarları', () => {
  it('Quick Start adımı ve kilit özelliği anahtarları geçerli', () => {
    expect(gecerliAnimasyonAnahtari(qsAnahtari('spotify'))).toBe(true)
    expect(gecerliAnimasyonAnahtari(qsAnahtari('zip'))).toBe(true)
    expect(gecerliAnimasyonAnahtari(kilitAnahtari('recap'))).toBe(true)
    expect(gecerliAnimasyonAnahtari(kilitAnahtari('recap', 'ust-kart'))).toBe(true)
  })

  it('katalog dışı özellik, adım ve bölüm reddedilir', () => {
    expect(gecerliAnimasyonAnahtari('qs:bilinmeyen')).toBe(false)
    expect(gecerliAnimasyonAnahtari('kilit:olmayan-ozellik')).toBe(false)
    expect(gecerliAnimasyonAnahtari('kilit:recap:X')).toBe(false)
    expect(gecerliAnimasyonAnahtari('baska:recap')).toBe(false)
  })

  it('çöp / enjeksiyon / aşırı uzun girdi reddedilir', () => {
    const cop = [
      '',
      'qs:',
      'QS:PROFIL',
      "kilit:recap'; drop table x;--",
      'a'.repeat(200),
      'kilit:recap:a:b',
      'qs:spotify:x',
    ]
    for (const k of cop) expect(gecerliAnimasyonAnahtari(k)).toBe(false)
  })

  it('ayrıştırma aileyi ve alanları döner', () => {
    expect(anahtariAyristir('qs:spotify')).toEqual({ aile: 'qs', adim: 'spotify' })
    expect(anahtariAyristir('kilit:taste:kart')).toEqual({ aile: 'kilit', ozellik: 'taste', bolum: 'kart' })
    expect(anahtariAyristir('kilit:taste')).toEqual({ aile: 'kilit', ozellik: 'taste', bolum: null })
  })
})
