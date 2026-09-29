import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import {
  checkRateLimit,
  resetRateLimit,
  LOGIN_RATE_LIMIT,
  rateLimitRetryAfterSeconds,
} from '@/lib/security/rate-limit'
import { validateJsonBody } from '@/lib/security/validate'
import { createClient } from '@/lib/supabase/server'

/**
 * Login brute-force koruması (sunucu-taraflı).
 *
 * IP limiti middleware katmanında (`applyAuthRateLimit`); burada yalnızca
 * e-posta bazlı sayaç kalır (body gerekir).
 *
 * Akış:
 *  - `action: 'check'`  → denemeyi kaydet; limit aşıldıysa 429 + Retry-After.
 *  - `action: 'success'`→ başarılı login sonrası sayacı sıfırla.
 */

const BodySchema = z.object({
  email: z.string().email().max(320),
  action: z.enum(['check', 'success']),
})

export async function POST(request: NextRequest) {
  const validation = await validateJsonBody(request, BodySchema)
  if (!validation.ok) return validation.response

  const { email, action } = validation.data
  const emailKey = `login:email:${email.toLowerCase()}`

  if (action === 'success') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.email?.toLowerCase() === email.toLowerCase()) {
      resetRateLimit(emailKey)
    }
    return NextResponse.json({ ok: true })
  }

  const { limit, windowMs } = LOGIN_RATE_LIMIT
  const byEmail = checkRateLimit(emailKey, limit, windowMs)

  if (!byEmail.allowed) {
    const retryAfter = rateLimitRetryAfterSeconds(byEmail.resetAt)
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again in a bit.', blocked: true },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  return NextResponse.json({ ok: true, remaining: byEmail.remaining })
}
