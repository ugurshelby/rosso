import { afterEach, describe, expect, it, vi } from 'vitest'
import { emailsMatch, isOwner, ownerEmail, ownerLockActive } from './owner'

const KEYS = ['OWNER_EMAIL', 'OWNER_LOCK_IN_TEST'] as const
const original: Record<string, string | undefined> = {}

afterEach(() => {
  for (const k of KEYS) {
    const v = original[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

function remember() {
  for (const k of KEYS) {
    if (!(k in original)) original[k] = process.env[k]
  }
}

describe('ownerEmail', () => {
  it('boş ve boşlukları yutar, küçük harfe çevirir', () => {
    expect(ownerEmail('  owner@example.com  ')).toBe(
      'owner@example.com',
    )
    expect(ownerEmail('')).toBe('')
    expect(ownerEmail('   ')).toBe('')
  })

  it('env yokken boş döner', () => {
    expect(ownerEmail('')).toBe('')
  })
})

describe('emailsMatch', () => {
  it('büyük/küçük harf duyarsız eşleşir', () => {
    expect(emailsMatch('A@B.com', 'a@b.com')).toBe(true)
    expect(emailsMatch('x@y.com', 'a@b.com')).toBe(false)
    expect(emailsMatch(null, 'a@b.com')).toBe(false)
  })
})

describe('isOwner', () => {
  it('yalnız sahip/admin e-postasını kabul eder', () => {
    expect(isOwner({ email: 'admin@rosso.app' }, 'admin@rosso.app')).toBe(true)
    expect(isOwner({ email: 'ADMIN@ROSSO.APP' }, 'admin@rosso.app')).toBe(true)
    expect(isOwner({ email: 'friend@example.com' }, 'admin@rosso.app')).toBe(false)
    expect(isOwner({ email: null }, 'admin@rosso.app')).toBe(false)
    expect(isOwner({ email: 'admin@rosso.app' }, '')).toBe(false)
  })
})

describe('ownerLockActive', () => {
  it('çok kullanıcılı yapıda her zaman kapalıdır', () => {
    expect(ownerLockActive()).toBe(false)
  })
})
