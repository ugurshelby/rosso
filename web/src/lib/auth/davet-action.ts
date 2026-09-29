'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'
import { DavetEpostaSemasi, MAX_DAVET, davetleriListele, sahipMi } from './davet'

/**
 * Sahibin arkadaş daveti: e-postayı `izinli_eposta`ya ekler / listeden çıkarır.
 *
 * ⚠ Bu, Spotify tarafını KAPSAMAZ: davetli kişinin Rosso'ya bağlanabilmesi için aynı e-postanın
 * Spotify Developer Dashboard → User Management'a da elle eklenmesi gerekir (Spotify'ın bunu
 * otomatikleştiren bir API'si yok). Arayüz bunu kullanıcıya hatırlatır.
 * Listeden çıkarmak mevcut hesabı SİLMEZ; yalnız yeni kaydı engeller.
 */

export type DavetSonuc =
  | { ok: true }
  | { ok: false; kod: 'forbidden' | 'invalid' | 'exists' | 'limit' | 'failed' }

export async function davetEkle(eposta: string): Promise<DavetSonuc> {
  const user = await requireAuth()
  if (!(await sahipMi(user.email))) return { ok: false, kod: 'forbidden' }

  const parsed = DavetEpostaSemasi.safeParse(eposta)
  if (!parsed.success) return { ok: false, kod: 'invalid' }

  const liste = await davetleriListele()
  if (liste.some((s) => s.email === parsed.data)) return { ok: false, kod: 'exists' }
  if (liste.filter((s) => !s.sahip).length >= MAX_DAVET) return { ok: false, kod: 'limit' }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('izinli_eposta')
    .insert({ email: parsed.data, sahip: false, ekleyen: user.id })
  if (error) {
    void systemLog({ operation: 'davet_ekle', userId: user.id, severity: 'warn', errorMessage: error.message })
    return { ok: false, kod: 'failed' }
  }
  revalidatePath('/settings')
  return { ok: true }
}

export async function davetKaldir(eposta: string): Promise<DavetSonuc> {
  const user = await requireAuth()
  if (!(await sahipMi(user.email))) return { ok: false, kod: 'forbidden' }

  const parsed = DavetEpostaSemasi.safeParse(eposta)
  if (!parsed.success) return { ok: false, kod: 'invalid' }

  const supabase = await createServiceClient()
  // Sahip satırı asla silinmez (sahip=false süzgeci).
  const { error } = await supabase
    .from('izinli_eposta')
    .delete()
    .eq('email', parsed.data)
    .eq('sahip', false)
  if (error) {
    void systemLog({ operation: 'davet_kaldir', userId: user.id, severity: 'warn', errorMessage: error.message })
    return { ok: false, kod: 'failed' }
  }
  revalidatePath('/settings')
  return { ok: true }
}
