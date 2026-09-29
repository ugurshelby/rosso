import { describe, expect, it } from 'vitest'
import { validateRegister, safeNextPath } from './validation'

describe('validateRegister', () => {
  it('geçerli girişi kabul eder', () => {
    const r = validateRegister({
      email: 'a@b.com',
      password: 'hunter22',
      displayName: 'Ada',
    })
    expect(r.ok).toBe(true)
  })

  it('kısa şifreyi reddeder', () => {
    const r = validateRegister({ email: 'a@b.com', password: 'short', displayName: 'Ada' })
    expect(r).toEqual({ ok: false, error: 'Password must be at least 8 characters.' })
  })

  it('geçersiz e-postayı reddeder', () => {
    const r = validateRegister({ email: 'nope', password: 'hunter22', displayName: 'Ada' })
    expect(r.ok).toBe(false)
  })

  it('boş görünen adı reddeder', () => {
    const r = validateRegister({ email: 'a@b.com', password: 'hunter22', displayName: '  ' })
    expect(r.ok).toBe(false)
  })
})

describe('safeNextPath (open redirect koruması)', () => {
  it('aynı-origin göreli yolu geçirir', () => {
    expect(safeNextPath('/recap')).toBe('/recap')
    expect(safeNextPath('/settings/automations')).toBe('/settings/automations')
  })

  it('null/boş için varsayılana düşer', () => {
    expect(safeNextPath(null)).toBe('/dashboard')
    expect(safeNextPath('')).toBe('/dashboard')
  })

  it('protokol-bağıl ve dış hedefleri reddeder', () => {
    expect(safeNextPath('//evil.com')).toBe('/dashboard')
    expect(safeNextPath('/\\evil.com')).toBe('/dashboard')
    expect(safeNextPath('https://evil.com')).toBe('/dashboard')
    expect(safeNextPath('http://evil.com')).toBe('/dashboard')
    expect(safeNextPath('javascript:alert(1)')).toBe('/dashboard')
  })

  it('query string içeren göreli yolu geçirir (kayıt onay akışı: /login?confirmed=1)', () => {
    // Register formu emailRedirectTo'da next=/login?confirmed=1 gönderir; callback
    // bunu safeNextPath'ten geçirir. Bu yol kabul edilmezse onaydan sonra kullanıcı
    // yanlış yere gider. Aynı-origin + '/' başlangıçlı → güvenli.
    expect(safeNextPath('/login?confirmed=1')).toBe('/login?confirmed=1')
  })
})
