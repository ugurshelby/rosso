import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getPhaseState } from '@/lib/phase/read'
import {
  guvenliQuickStart,
  hesaplaQuickStart,
  type QuickStartDurumu,
  type QuickStartHam,
} from './durum'

/**
 * Quick Start + kilit durumunu okur (sunucu, tek doğruluk kaynağı).
 *
 * `cache()`'li: layout, dashboard ve /data aynı istekte çağırsa DB'ye tek tur
 * gider (`getPhaseState` ile aynı desen). Faz yetenekleri `getPhaseState`'ten
 * gelir — kilit "açık mı" kararı TEK yerde (`buildCapabilities`), burada
 * yeniden türetilmez.
 *
 * Okuma hatasında `guvenliQuickStart`: Quick Start çizilmez, animasyon
 * oynatılmaz. Yanlış "adım tamam/eksik" demektense sessiz kalırız.
 */
export const getQuickStartState = cache(async (userId: string): Promise<QuickStartDurumu> => {
  const supabase = await createClient()
  const phaseState = await getPhaseState(userId)

  const [qs, gorulenSatirlar] = await Promise.all([
    supabase.rpc('quick_start_durumu', { p_user: userId }),
    supabase.from('kullanici_animasyonlari').select('anahtar').eq('user_id', userId),
  ])

  const satir = qs.data?.[0]
  if (qs.error || !satir || gorulenSatirlar.error) {
    return guvenliQuickStart(phaseState.capabilities)
  }

  const ham: QuickStartHam = {
    spotify: satir.spotify,
    streaming: satir.streaming,
    account: satir.account,
    technical: satir.technical,
    yukleniyor: satir.yukleniyor,
    sonZipAt: satir.son_zip_at,
  }

  return hesaplaQuickStart(
    ham,
    phaseState.capabilities,
    new Set((gorulenSatirlar.data ?? []).map((r) => r.anahtar)),
  )
})
