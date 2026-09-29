import 'server-only'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Davet listeli kayıt kapısı (migration 0359) — sunucu yardımcıları.
 *
 * `izinli_eposta` yalnız service_role'e açıktır; istemci hiçbir zaman doğrudan okumaz/yazmaz.
 * `sahip=true` satırı sistem sahibidir: yalnız o davet ekler/kaldırır. Kayıt kapısının kendisi
 * (auth.users tetikleyicisi) DB'dedir; bu dosya yalnız sahibin listeyi yönetmesi içindir.
 */

/** Spotify Development Mode'da bir uygulamaya eklenebilecek kullanıcı sayısı sınırlıdır
 *  (yaklaşık 25 — güncel değeri Spotify Dashboard'dan doğrula). Davet listesi bunu aşmasın. */
export const MAX_DAVET = 24

export const DavetEpostaSemasi = z.string().trim().toLowerCase().min(3).max(254).email()

export interface DavetSatiri {
  email: string
  sahip: boolean
  created_at: string
}

export async function sahipMi(eposta: string | null | undefined): Promise<boolean> {
  const e = (eposta ?? '').trim().toLowerCase()
  if (!e) return false
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('izinli_eposta')
    .select('email')
    .eq('email', e)
    .eq('sahip', true)
    .maybeSingle()
  return Boolean(data)
}

export async function davetleriListele(): Promise<DavetSatiri[]> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('izinli_eposta')
    .select('email, sahip, created_at')
    .order('sahip', { ascending: false })
    .order('created_at', { ascending: true })
  return (data ?? []) as DavetSatiri[]
}
