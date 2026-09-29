import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import { getDinlemeNotu } from '@/lib/analytics/music-intelligence'

export const dynamic = 'force-dynamic'

/**
 * GET /api/taste/listening-note — oturumdaki kullanıcının dinleme notu.
 *
 * Mobil istemci içindir (`api-client.ts` Bearer token taşır); web Taste
 * sayfası aynı veriyi sunucu bileşeninde doğrudan okur.
 *
 * 🔴 Kullanıcı kimliği YALNIZ `apiAuth()`'tan gelir — istek hiçbir
 * `user_id` parametresi kabul etmez, yani başkasının notu istenemez (IDOR yok).
 *
 * Not yoksa 200 + `{ note: null }` — "henüz üretilmedi" bir hata değildir;
 * istemci bölümü gizler.
 */
export async function GET() {
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response

  const not = await getDinlemeNotu(oturum.user.id)

  return NextResponse.json(
    { note: not },
    {
      status: 200,
      // Kişisel veri: paylaşılan önbelleklere girmesin. Not ayda bir değişir;
      // tarayıcıda kısa süre tutmak yeterli.
      headers: { 'Cache-Control': 'private, max-age=300' },
    },
  )
}
