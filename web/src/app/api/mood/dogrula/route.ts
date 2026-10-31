import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { moodByKey } from '@/lib/analytics/mood'
import { moodSpotifyDurumunuDogrula } from '@/lib/services/mood-spotify-dogrula'

export const maxDuration = 30

/**
 * Mood listelerinin "Spotify'a eklendi" durumunu kaynağıyla doğrular (PLAN 1.3,
 * mobil M10). Web bunu mood detay sayfası açılınca sunucuda yapıyor; mobil bu
 * rotayı liste ya da detay açılınca çağırır. Yalnız açık "yok" cevabı durumu
 * temizler; Spotify cevap vermezse hiçbir şey değişmez.
 *
 * Gövde: `{ moodKey?: string }` (yoksa kullanıcının dışa aktarılmış tüm mood'ları).
 * Cevap: `{ kontrol, kaldirilan }`.
 */
const LIMIT = 10
const PENCERE_MS = 60_000

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapmalısın.' }, { status: 401 })

  const hiz = checkRateLimit(`mood-dogrula:${user.id}`, LIMIT, PENCERE_MS)
  if (!hiz.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  const govde = await req.json().catch(() => null)
  const moodKey = typeof govde?.moodKey === 'string' ? govde.moodKey : undefined
  if (moodKey !== undefined && !moodByKey(moodKey)) {
    return NextResponse.json({ error: 'Invalid moment key.' }, { status: 400 })
  }

  const sonuc = await moodSpotifyDurumunuDogrula(user.id, moodKey)
  return NextResponse.json(sonuc)
}
