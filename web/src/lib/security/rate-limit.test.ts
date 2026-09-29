// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkRateLimit,
  resetRateLimit,
  _clearAllRateLimits,
  backoffDelayMs,
  LOGIN_RATE_LIMIT,
} from './rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => _clearAllRateLimits())

  it('allows requests under the limit and decrements remaining', () => {
    const a = checkRateLimit('k', 3, 1000, 0)
    const b = checkRateLimit('k', 3, 1000, 10)
    expect(a.allowed).toBe(true)
    expect(a.remaining).toBe(2)
    expect(b.allowed).toBe(true)
    expect(b.remaining).toBe(1)
  })

  it('blocks once the limit is exceeded within the window', () => {
    checkRateLimit('login:a@b.com', 5, 1000, 0)
    checkRateLimit('login:a@b.com', 5, 1000, 1)
    checkRateLimit('login:a@b.com', 5, 1000, 2)
    checkRateLimit('login:a@b.com', 5, 1000, 3)
    const fifth = checkRateLimit('login:a@b.com', 5, 1000, 4)
    const sixth = checkRateLimit('login:a@b.com', 5, 1000, 5)
    expect(fifth.allowed).toBe(true)
    expect(fifth.remaining).toBe(0)
    expect(sixth.allowed).toBe(false)
  })

  it('resets after the window elapses', () => {
    checkRateLimit('k', 1, 1000, 0)
    const blocked = checkRateLimit('k', 1, 1000, 500)
    const afterWindow = checkRateLimit('k', 1, 1000, 1000)
    expect(blocked.allowed).toBe(false)
    expect(afterWindow.allowed).toBe(true)
  })

  it('isolates separate keys (email vs ip)', () => {
    checkRateLimit('login:a@b.com', 1, 1000, 0)
    const otherKey = checkRateLimit('login:ip:1.2.3.4', 1, 1000, 0)
    expect(otherKey.allowed).toBe(true)
  })

  it('resetRateLimit clears a successful login window', () => {
    checkRateLimit('login:a@b.com', 1, 1000, 0)
    resetRateLimit('login:a@b.com')
    const next = checkRateLimit('login:a@b.com', 1, 1000, 1)
    expect(next.allowed).toBe(true)
  })

  it('exposes sane login defaults', () => {
    expect(LOGIN_RATE_LIMIT.limit).toBe(5)
    expect(LOGIN_RATE_LIMIT.windowMs).toBe(15 * 60 * 1000)
  })
})

describe('backoffDelayMs', () => {
  it('honors Retry-After when present', () => {
    expect(backoffDelayMs(0, 3)).toBe(3000)
  })

  it('caps Retry-After at maxMs', () => {
    expect(backoffDelayMs(0, 9999, 1000, 60_000)).toBe(60_000)
  })

  it('falls back to exponential backoff', () => {
    expect(backoffDelayMs(0)).toBe(1000)
    expect(backoffDelayMs(1)).toBe(2000)
    expect(backoffDelayMs(3)).toBe(8000)
  })

  it('caps exponential backoff at maxMs', () => {
    expect(backoffDelayMs(20)).toBe(60_000)
  })

  it('ignores non-positive Retry-After and uses backoff', () => {
    expect(backoffDelayMs(2, 0)).toBe(4000)
    expect(backoffDelayMs(2, null)).toBe(4000)
  })
})
