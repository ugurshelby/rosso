import { describe, it, expect, afterEach } from 'vitest'
import { destekEpostasi, gizlilikEpostasi } from './iletisim'

/**
 * Bu testlerin varlık sebebi ölçülmüş bir kırıktır (2026-08-19):
 * `/help` ve `/privacy` sayfaları `destek@rosso.app` / `privacy@rosso.app`
 * gösteriyordu, ama **`rosso.app` bize ait değil** — başka bir şirketin
 * alan adı. Kullanıcı KVKK başvurusunu yabancı bir tarafa yazıyordu.
 */

const YEDEK = {
  destek: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  gizlilik: process.env.NEXT_PUBLIC_PRIVACY_EMAIL,
}

function ayarla(destek?: string, gizlilik?: string) {
  if (destek === undefined) delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  else process.env.NEXT_PUBLIC_SUPPORT_EMAIL = destek
  if (gizlilik === undefined) delete process.env.NEXT_PUBLIC_PRIVACY_EMAIL
  else process.env.NEXT_PUBLIC_PRIVACY_EMAIL = gizlilik
}

afterEach(() => {
  ayarla(YEDEK.destek, YEDEK.gizlilik)
})

describe('destekEpostasi', () => {
  it('tanımsızsa null döner — uydurma adres göstermeyiz', () => {
    ayarla(undefined, undefined)
    expect(destekEpostasi()).toBeNull()
  })

  it('boş/whitespace değeri null sayar', () => {
    ayarla('   ', undefined)
    expect(destekEpostasi()).toBeNull()
  })

  it('@ içermeyen değeri reddeder', () => {
    ayarla('destek-yok', undefined)
    expect(destekEpostasi()).toBeNull()
  })

  it('geçerli adresi döndürür', () => {
    ayarla('yardim@ornek.com', undefined)
    expect(destekEpostasi()).toBe('yardim@ornek.com')
  })

  it('🔴 rosso.app adresini REDDEDER — o alan bize ait değil', () => {
    ayarla('destek@rosso.app', undefined)
    expect(destekEpostasi()).toBeNull()
  })

  it('🔴 rosso.app ALT ALANLARINI da reddeder', () => {
    // İlk yazımda `endsWith('@rosso.app')` idi ve bu ÖRNEK GEÇİYORDU.
    ayarla('destek@mail.rosso.app', undefined)
    expect(destekEpostasi()).toBeNull()
  })

  it('benzeyen ama farklı alanı reddetmez (rosso.app.tr bizim değil ama rosso.app da değil)', () => {
    ayarla('a@rosso.app.tr', undefined)
    expect(destekEpostasi()).toBe('a@rosso.app.tr')
  })

  it('rosso.app reddi büyük/küçük harften bağımsızdır', () => {
    ayarla('Destek@Rosso.App', undefined)
    expect(destekEpostasi()).toBeNull()
  })
})

describe('gizlilikEpostasi', () => {
  it('kendi adresi varsa onu kullanır', () => {
    ayarla('destek@ornek.com', 'kvkk@ornek.com')
    expect(gizlilikEpostasi()).toBe('kvkk@ornek.com')
  })

  it('kendi adresi yoksa desteğe düşer — bir kanal her zaman doğru olsun', () => {
    ayarla('destek@ornek.com', undefined)
    expect(gizlilikEpostasi()).toBe('destek@ornek.com')
  })

  it('ikisi de yoksa null', () => {
    ayarla(undefined, undefined)
    expect(gizlilikEpostasi()).toBeNull()
  })

  it('🔴 gizlilik adresi rosso.app ise desteğe düşer, onu göstermez', () => {
    ayarla('destek@ornek.com', 'privacy@rosso.app')
    expect(gizlilikEpostasi()).toBe('destek@ornek.com')
  })
})
