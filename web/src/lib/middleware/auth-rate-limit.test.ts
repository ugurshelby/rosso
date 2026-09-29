// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { applyAuthRateLimit } from './auth-rate-limit'
import { _clearAllRateLimits, LOGIN_RATE_LIMIT } from '@/lib/security/rate-limit-core'

function makeRequest(path: string, method = 'GET', ip = '1.2.3.4'): NextRequest {
  const url = new URL(`https://rosso.test${path}`)
  return new NextRequest(url, {
    method,
    headers: { 'x-forwarded-for': ip },
  })
}

beforeEach(() => _clearAllRateLimits())

describe('applyAuthRateLimit', () => {
  it('login-guard POST IP limitini middleware katmanında uygular', () => {
    const { limit } = LOGIN_RATE_LIMIT
    const max = limit * 3

    for (let i = 0; i < max; i++) {
      expect(applyAuthRateLimit(makeRequest('/api/auth/login-guard', 'POST'))).toBeNull()
    }

    const blocked = applyAuthRateLimit(makeRequest('/api/auth/login-guard', 'POST'))
    expect(blocked?.status).toBe(429)
    expect(blocked?.headers.get('Retry-After')).toBeTruthy()
  })

  it('callback GET için IP limiti döner', () => {
    for (let i = 0; i < 20; i++) {
      expect(applyAuthRateLimit(makeRequest('/api/auth/callback', 'GET'))).toBeNull()
    }
    expect(applyAuthRateLimit(makeRequest('/api/auth/callback', 'GET'))?.status).toBe(429)
  })

  it('auth olmayan yollarda müdahale etmez', () => {
    expect(applyAuthRateLimit(makeRequest('/dashboard'))).toBeNull()
    expect(applyAuthRateLimit(makeRequest('/api/playlists/x', 'POST'))).toBeNull()
  })

  it('IP anahtarlarını izole eder', () => {
    const { limit } = LOGIN_RATE_LIMIT
    const max = limit * 3
    for (let i = 0; i < max; i++) {
      applyAuthRateLimit(makeRequest('/api/auth/login-guard', 'POST', '10.0.0.1'))
    }
    expect(applyAuthRateLimit(makeRequest('/api/auth/login-guard', 'POST', '10.0.0.2'))).toBeNull()
  })
})
