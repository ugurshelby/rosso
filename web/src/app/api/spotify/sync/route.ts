import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { syncRecentlyPlayed } from '@/lib/services/spotify-sync-recently-played'
import { checkRateLimit, PAHALI_URETIM_LIMIT, rateLimitRetryAfterSeconds } from '@/lib/security/rate-limit'

/*
 * 🔴 RATE LIMIT (2026-09-17 güvenlik taraması) — bu uç `force: true` ile
 * Spotify'a çağrı atıyor, diğer Spotify-yazan uçlar gibi (playlist generate,
 * mood/create-playlist, export/queue) LİMİTSİZDİ. Rosso bunu yaşadı — Spotify
 * 6,4 saat ceza verdi (bkz. rate-limit-core.ts PAHALI_URETIM_LIMIT).
 */
function rateLimited(userId: string) {
  const limit = checkRateLimit(`spotify-sync:${userId}`, PAHALI_URETIM_LIMIT.limit, PAHALI_URETIM_LIMIT.windowMs)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'You tried too often — wait a bit.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitRetryAfterSeconds(limit.resetAt)) } },
    )
  }
  return null
}

export async function POST(_req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = rateLimited(user.id)
  if (limited) return limited

  const result = await syncRecentlyPlayed(user.id, { force: true })
  return NextResponse.json(result)
}

export async function GET(_req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = rateLimited(user.id)
  if (limited) return limited

  const result = await syncRecentlyPlayed(user.id, { force: true })
  return NextResponse.json(result)
}
