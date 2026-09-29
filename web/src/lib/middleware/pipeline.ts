import type { NextRequest } from 'next/server'
import { applyAuthRateLimit } from './auth-rate-limit'
import { applyCspNonce, withCspHeader } from './csp'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Middleware pipeline — teknik-mimari-referansi.md §10 sırası:
 * 0. CSP nonce üretimi (2026-08-13) — istek başına, request+response
 * 1. Rate limit (auth uçları)
 * 2. Oturum doğrulama (Supabase SSR)
 *
 * ⚠ CSP neden EN BAŞTA: nonce'un request başlığına yazılması, sonraki
 * adımların ürettiği isteğe de taşınmalı. Ayrıca rate-limit erken çıkış
 * yapabilir (429) — o yanıtın da politikası olmalı, yoksa korumasız kalır.
 *
 * ⚠ CSP başlığı HER yanıt yoluna ayrı ayrı yazılır. `NextResponse`
 * nesneleri bu üç dalda farklıdır (429 · yönlendirme · normal); tek bir
 * yerde yazıp "hepsi alır" varsaymak sessiz bir boşluk bırakırdı.
 */
export async function runMiddlewarePipeline(request: NextRequest) {
  const { csp, requestHeaders } = applyCspNonce(request)

  const rateLimited = applyAuthRateLimit(request)
  if (rateLimited) return withCspHeader(rateLimited, csp)

  const response = await updateSession(request, requestHeaders)
  return withCspHeader(response, csp)
}
