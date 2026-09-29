import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { validateJsonBody } from '@/lib/security/validate'
import { checkRateLimit, rateLimitRetryAfterSeconds } from '@/lib/security/rate-limit'
import {
  getByocStatus,
  verifyAndSaveByocCredentials,
  deleteByocCredentials,
} from '@/lib/spotify/byoc'

/**
 * Spotify BYOC ("kendi dev app'ini getir") kimlik bilgisi yönetimi.
 *
 * GET    → mevcut durum (bağlı mı, doğrulanmış mı, client_id) — SIR DÖNMEZ.
 * POST   → Client ID/Secret'ı doğrula ve kaydet.
 * DELETE → BYOC kimlik bilgisini sil (kullanıcı yeniden yapıştırmak zorunda
 *          kalır — bkz. lib/spotify/byoc.ts başlık notu, "sır kalıcı
 *          tutulmaz" kararı).
 *
 * Arka plan ve tasarım gerekçesi: docs/plans/spotify-byoc-canli-baglanti.md
 */

const VERIFY_LIMIT = { limit: 5, windowMs: 5 * 60 * 1000 } as const

const BodySchema = z.object({
  clientId: z.string().min(1).max(128),
  clientSecret: z.string().min(1).max(128),
})

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = await getByocStatus(user.id)
  return NextResponse.json(status)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  /*
   * Rate limit: bu uç Spotify'ın token endpoint'ine gerçek bir istek
   * proxy'liyor. Saldırgan zaten gerçek bir Client ID/Secret çiftine sahip
   * olmadan bir şey kazanamaz (kör tahminle 32 hex karakter bulunmaz), ama
   * yine de kullanıcı başına küçük bir çit — döngüye giren bir istemci
   * Spotify'ın kendi API'sini gereksiz yormasın.
   */
  const limit = checkRateLimit(`spotify-byoc-verify:${user.id}`, VERIFY_LIMIT.limit, VERIFY_LIMIT.windowMs)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok sık denedin, biraz bekle.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitRetryAfterSeconds(limit.resetAt)) } },
    )
  }

  const validation = await validateJsonBody(req, BodySchema)
  if (!validation.ok) return validation.response

  const sonuc = await verifyAndSaveByocCredentials(
    user.id,
    validation.data.clientId,
    validation.data.clientSecret,
  )

  if (!sonuc.ok) {
    const status = sonuc.kod === 'gecersiz_bicim' ? 422 : sonuc.kod === 'spotify_reddetti' ? 401 : 502
    return NextResponse.json({ error: sonuc.kod }, { status })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await deleteByocCredentials(user.id)
  return NextResponse.json({ ok: true })
}
