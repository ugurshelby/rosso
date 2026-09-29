import { describe, expect, it } from 'vitest'
import {
  isClosedPersonalPath,
  isLoginOnlyPath,
  isProtectedPath,
} from './route-access'

describe('isProtectedPath', () => {
  it('dashboard alt-ağacını korur', () => {
    expect(isProtectedPath('/dashboard')).toBe(true)
    expect(isProtectedPath('/recap')).toBe(true)
    expect(isProtectedPath('/journey')).toBe(true)
    expect(isProtectedPath('/taste')).toBe(true)
    expect(isProtectedPath('/playlists')).toBe(true)
    expect(isProtectedPath('/playlists/abc123')).toBe(true)
    expect(isProtectedPath('/migrate')).toBe(true)
    expect(isProtectedPath('/settings')).toBe(true)
    expect(isProtectedPath('/settings/automations')).toBe(true)
    // V2: sosyal yüzeyler kaldırıldı; artık korumalı liste dışı (404)
    expect(isProtectedPath('/social')).toBe(false)
    expect(isProtectedPath('/u/ugur')).toBe(false)
  })

  it('yasal metin ve login/register public kalır', () => {
    expect(isProtectedPath('/help')).toBe(false)
    expect(isProtectedPath('/privacy')).toBe(false)
    expect(isProtectedPath('/login')).toBe(false)
    expect(isProtectedPath('/register')).toBe(false)
  })

  it('prefix tuzağına düşmez (/settings-x korumalı değil)', () => {
    expect(isProtectedPath('/settings-public')).toBe(false)
    expect(isProtectedPath('/tastemaker')).toBe(false)
  })
})

describe('isLoginOnlyPath', () => {
  it('kök, fiyat, blog artık login’e düşmez (public)', () => {
    expect(isLoginOnlyPath('/')).toBe(false)
    expect(isLoginOnlyPath('/register')).toBe(false)
    expect(isLoginOnlyPath('/pricing')).toBe(false)
    expect(isLoginOnlyPath('/blog')).toBe(false)
    expect(isLoginOnlyPath('/blog/isrc-ile-eslestirme')).toBe(false)
    expect(isLoginOnlyPath('/help')).toBe(false)
    expect(isLoginOnlyPath('/privacy')).toBe(false)
  })
})

describe('isClosedPersonalPath', () => {
  it('hiçbir yolu kapatmaz', () => {
    expect(isClosedPersonalPath('/taste')).toBe(false)
    expect(isClosedPersonalPath('/dashboard')).toBe(false)
  })
})
