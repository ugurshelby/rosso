import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import {
  siraylaIsleCekirdek,
  type SiraSecenekleri,
  type SiraSonucu,
} from '@/lib/cron/kullanici-sirasi'

/**
 * `siraylaIsleCekirdek`'in Supabase'e bağlı sürümü (migration 0342 RPC'leri).
 *
 * İş adları ve aralıkları TEK yerde — `cron_uygun_kullanicilar` SQL'indeki
 * adlarla birebir aynı olmalı (yanlış ad = boş küme, sessizce hiçbir şey
 * yapılmaz; bu yüzden sabit tip).
 */
export const CRON_ISLERI = {
  /** Saatlik canlı dinleme senkronu. */
  spotify_sync: { aralik: '50 minutes', kilit: '10 minutes' },
  /** Günde iki kez playlist tazeleme. */
  playlist_refresh: { aralik: '11 hours', kilit: '10 minutes' },
  /** Günlük mood paketi (+ o kullanıcının haftalık senkronu, yıllık, editoryal). */
  mood_pkg: { aralik: '20 hours', kilit: '15 minutes' },
  /** Günlük recap üretimi. */
  recap: { aralik: '20 hours', kilit: '10 minutes' },
} as const

export type CronIsi = keyof typeof CRON_ISLERI

export async function siraylaIsle(
  is: CronIsi,
  secenek: SiraSecenekleri & {
    /**
     * Aralığı yok say (denetim/ölçüm: `?force=1`). Bu turda tamamlanan
     * kullanıcı yine de ikinci kez alınmaz (`p_tur_baslangici`).
     */
    zorla?: boolean
  },
): Promise<SiraSonucu> {
  const supabase = await createServiceClient()
  const { aralik, kilit } = CRON_ISLERI[is]
  const turBaslangici = new Date(secenek.baslangic).toISOString()

  return siraylaIsleCekirdek(
    {
      al: async () => {
        const { data, error } = await supabase.rpc('cron_sira_al', {
          p_is: is,
          p_aralik: secenek.zorla ? '0 seconds' : aralik,
          p_limit: 1,
          p_kilit: kilit,
          p_tur_baslangici: turBaslangici,
        })
        if (error) throw new Error(`cron_sira_al: ${error.message}`)
        const satirlar = (data as unknown as Array<string | { cron_sira_al?: string }> | null) ?? []
        const ilk = satirlar[0]
        if (!ilk) return null
        return typeof ilk === 'string' ? ilk : (ilk.cron_sira_al ?? null)
      },
      tamamla: async (userId, hata) => {
        await supabase.rpc('cron_sira_tamamla', {
          p_is: is,
          p_user_id: userId,
          p_hata: hata,
        })
      },
    },
    secenek,
  )
}
