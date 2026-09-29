import { NextResponse, type NextRequest } from 'next/server'
import {
  AUTH_API_IP_LIMIT,
  AUTH_CALLBACK_IP_LIMIT,
  LOGIN_RATE_LIMIT,
  checkRateLimit,
  rateLimitRetryAfterSeconds,
} from '@/lib/security/rate-limit-core'
import { clientIp } from './client-ip'

function json429(resetAt: number): NextResponse {
  const retryAfter = rateLimitRetryAfterSeconds(resetAt)
  return NextResponse.json(
    { error: 'Çok fazla istek. Biraz sonra tekrar dene.', blocked: true },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

/**
 * Pipeline adım 1 — auth / hassas API uçlarında IP rate limit.
 * E-posta bazlı login limiti route handler'da kalır (body gerekir).
 */
export function applyAuthRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  const ip = clientIp(request)

  if (request.method === 'POST' && pathname === '/api/auth/login-guard') {
    const { limit, windowMs } = LOGIN_RATE_LIMIT
    const byIp = checkRateLimit(`mw:login:ip:${ip}`, limit * 3, windowMs)
    if (!byIp.allowed) return json429(byIp.resetAt)
    return null
  }

  if (request.method === 'GET' && pathname === '/api/auth/callback') {
    const { limit, windowMs } = AUTH_CALLBACK_IP_LIMIT
    const byIp = checkRateLimit(`auth-callback:ip:${ip}`, limit, windowMs)
    if (!byIp.allowed) return json429(byIp.resetAt)
    return null
  }

  /*
   * OAuth başlatma (FAZ KİMLİK-V2, 2026-08-13) — GET olduğu için
   * aşağıdaki POST kuralına TAKILMIYOR; ayrıca sınırlanmalı.
   *
   * Bu uç her çağrıda Supabase Auth'a bir istek atıyor
   * (`signInWithOAuth` yetkilendirme URL'i üretir). Sınırsız bırakılırsa
   * tek bir IP kaynak tüketebilir ve Supabase tarafında kota yakabilir.
   * Callback ile aynı bütçeyi paylaşıyor — ikisi de aynı giriş akışının
   * parçası, ayrı sayaç tutmak yanıltıcı olurdu.
   */
  if (request.method === 'GET' && pathname.startsWith('/api/auth/oauth/')) {
    const { limit, windowMs } = AUTH_CALLBACK_IP_LIMIT
    const byIp = checkRateLimit(`auth-oauth:ip:${ip}`, limit, windowMs)
    if (!byIp.allowed) return json429(byIp.resetAt)
    return null
  }

  if (request.method === 'POST' && pathname.startsWith('/api/auth/')) {
    const { limit, windowMs } = AUTH_API_IP_LIMIT
    const byIp = checkRateLimit(`auth-api:ip:${ip}`, limit, windowMs)
    if (!byIp.allowed) return json429(byIp.resetAt)
  }

  return null
}
