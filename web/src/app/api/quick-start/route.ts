import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getQuickStartState } from '@/lib/quick-start/read'

export const dynamic = 'force-dynamic'

/**
 * Quick Start + kilit durumu (JSON).
 *
 * Sunucu bileşenleri `getQuickStartState`'i doğrudan çağırır; bu uç, sayfa
 * yeniden üretilmeden durumu tazelemesi gereken İSTEMCİ içindir — örn. /data'da
 * ZIP işleme bittiğinde "doğrulandı" animasyonunu oynatıp Quick Start'a
 * dönmeye karar veren bileşen.
 *
 * Yalnız kullanıcının KENDİ durumu (oturumdan), kimlik parametre almaz.
 * Önbelleğe alınmaz: durum adım tamamlandıkça değişir.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const durum = await getQuickStartState(user.id)
  return NextResponse.json(durum, { headers: { 'Cache-Control': 'no-store' } })
}
