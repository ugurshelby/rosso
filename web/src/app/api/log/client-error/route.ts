import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { systemLog } from '@/lib/observability/logger'
import { validateJsonBody } from '@/lib/security/validate'
import { checkRateLimit, AUTH_API_IP_LIMIT } from '@/lib/security/rate-limit'
import { clientIp } from '@/lib/middleware/client-ip'

/**
 * Client-side hata sınırlarından (error.tsx) gelen hataları structured
 * logger'a iletir. `server-only` logger client'tan çağrılamadığı için bu ince
 * köprü route kullanılır. PII redaction logger'da uygulanır.
 */
const BodySchema = z.object({
  message: z.string().max(2000),
  digest: z.string().max(200).optional(),
  path: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  /*
   * 🔴 IP BAZLI RATE LIMIT (2026-08-22 güvenlik taraması).
   *
   * Bu uç KİMLİK İSTEMEZ ve bu bilinçli: hata sınırı, kullanıcı oturum
   * açmamışken de tetiklenebilir. Ama kimliksiz + limitsiz bir yazma ucu,
   * `system_logs` tablosunu şişirmek için açık davetiye — kimse
   * "saldırı" yapmasa bile döngüye giren bir istemci aynı sonucu verir.
   *
   * Zod şeması boyutu zaten sınırlıyordu (2000 karakter), ama SAYIYI
   * sınırlayan bir şey yoktu.
   *
   * ⚠ IP yalnız limit anahtarı — yetkilendirme kararı buna dayanmıyor
   * (`x-forwarded-for` taklit edilebilir; Vercel arkasında güvenilir).
   * Yardımcı `middleware/client-ip.ts`ten geliyor — kendi kopyamı
   * yazmıştım, mevcut olanı kaçırmışım (2026-08-22).
   */
  const limit = checkRateLimit(
    `client-error:${clientIp(request)}`,
    AUTH_API_IP_LIMIT.limit,
    AUTH_API_IP_LIMIT.windowMs,
  )
  if (!limit.allowed) {
    // Gövde yok: hata kaydı "en iyi çaba" bir işlem, istemci sonucu
    // zaten kullanmıyor.
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  const validation = await validateJsonBody(request, BodySchema)
  if (!validation.ok) return validation.response

  const { message, digest, path } = validation.data

  void systemLog({
    operation: 'client_error_boundary',
    severity: 'error',
    errorCode: digest ? `DIGEST_${digest}` : 'CLIENT_ERROR',
    errorMessage: message,
    metadata: { path },
  })

  return NextResponse.json({ ok: true })
}
