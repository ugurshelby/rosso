import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createPlaylistFromTracks } from '@/lib/playlists/generate'
import { checkRateLimit, PAHALI_URETIM_LIMIT, rateLimitRetryAfterSeconds } from '@/lib/security/rate-limit'

/**
 * Your Years — TEK SEFERLİK Spotify export.
 *
 * `/api/mood/create-playlist`'ten FARKLI: mood'lar canlı `mood_playlist`
 * RPC'sini çağırır (pakete bağlı değil, bilinçli — bkz. o route'un notu).
 * Your Years'ın verisi zaten DONMUŞ (`year_pkg.payload`, migration 0310) —
 * canlı hesaplasaydık "donma" kuralı bozulurdu. Bu yüzden burası doğrudan
 * `year_pkg`'den okur, RPC çağırmaz.
 *
 * Gizleme/haftalık senkron YOK (Sahibin kararı, 2026-09-18) — tek
 * seferlik, olduğu gibi export.
 */

const Schema = z.object({
  year: z.number().int().min(2000).max(2100),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = checkRateLimit(`year-export:${user.id}`, PAHALI_URETIM_LIMIT.limit, PAHALI_URETIM_LIMIT.windowMs)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'You tried too often — wait a bit.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitRetryAfterSeconds(limit.resetAt)) } },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 })
  }

  const { data: pkg, error: pkgErr } = await supabase
    .from('year_pkg')
    .select('payload')
    .eq('user_id', user.id)
    .eq('year', parsed.data.year)
    .maybeSingle()

  if (pkgErr || !pkg) {
    return NextResponse.json({ error: 'This year has not been archived yet' }, { status: 404 })
  }

  const payload = (pkg.payload ?? []) as Array<{ track_id?: string | null }>
  const trackUuids = payload.map((t) => t.track_id).filter((x): x is string => Boolean(x))
  if (trackUuids.length === 0) {
    return NextResponse.json({ error: 'No tracks found for this year' }, { status: 404 })
  }

  try {
    const result = await createPlaylistFromTracks(
      user.id,
      trackUuids,
      String(parsed.data.year),
      ['spotify'],
      `Your top tracks from ${parsed.data.year}, archived by Rosso.`,
    )
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Playlist couldn’t be created'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
