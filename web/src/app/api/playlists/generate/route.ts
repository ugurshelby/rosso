import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateManualPlaylist } from '@/lib/playlists/generate'
import { checkRateLimit, PAHALI_URETIM_LIMIT, rateLimitRetryAfterSeconds } from '@/lib/security/rate-limit'

// Manuel playlist üretimi (FAZ PLAYLIST): kullanıcı bir tarih aralığındaki en çok
// dinlediği N şarkıdan yeni playlist oluşturur. Senkron çalışır (kullanıcı bekler).

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD bekleniyor')

const GenerateSchema = z.object({
  from: DateStr,
  to: DateStr,
  count: z.number().int().min(1).max(500),
  platforms: z.array(z.enum(['spotify'])).min(1),
  name: z.string().trim().min(1).max(120).optional(),
  /* P4.2 — parametreli üretim (migration 0279). Hepsi opsiyonel: verilmezse
     davranış eskisiyle birebir aynı kalır. */
  description: z.string().trim().max(300).optional(),
  genres: z.array(z.string().trim().min(1)).max(50).optional(),
  artists: z.array(z.string().trim().min(1)).max(100).optional(),
  sortBy: z.enum(['plays', 'duration']).optional(),
  /* Kapak: yalnız JPEG/PNG data URI. Üst sınır ~350k karakter — base64
     sonrası 256 KB'lik Spotify sınırının biraz üstü (istemci zaten 256 KB'de
     kesiyor; buradaki sınır sunucuyu kötü niyetli büyük gövdeden korur). */
  coverImage: z
    .string()
    .regex(/^data:image\/(jpeg|png);base64,/, 'Cover must be JPEG or PNG')
    .max(350_000)
    .optional(),
}).refine((d) => d.from <= d.to, { message: 'from cannot be after to', path: ['from'] })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  /*
   * 🔴 RATE LIMIT (2026-08-22 güvenlik taraması) — bu uç PAHALI:
   * Spotify'a playlist yazıyor ve dinleme geçmişini tarıyor.
   *
   * Kimlik vardı ama sayı sınırı YOKTU. Kötü niyet gerekmiyor: döngüye
   * giren bir istemci ya da sabırsız çift tıklama dış API kotasını yakar.
   * Rosso bunu yaşadı — Spotify 6,4 saat ceza verdi.
   */
  const limit = checkRateLimit(`playlist-generate:${user.id}`, PAHALI_URETIM_LIMIT.limit, PAHALI_URETIM_LIMIT.windowMs)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'You tried too often — wait a bit.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitRetryAfterSeconds(limit.resetAt)) } },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = GenerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const result = await generateManualPlaylist(user.id, parsed.data)
    if (!result.ok && result.totalTracks === 0) {
      return NextResponse.json({ error: 'No listens found in this range' }, { status: 404 })
    }
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Playlist couldn’t be created'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
