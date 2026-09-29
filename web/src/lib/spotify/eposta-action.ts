'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

/**
 * B17 — Allowlist bekleyen kullanıcıdan Spotify e-postasını AL.
 *
 * ── Neden gerekli (canlı ölçüldü) ─────────────────────────────────────────
 * Dev Mode'da allowlist dışındaki kullanıcıda `/v1/me`'nin **kendisi 403**
 * veriyor ("The user is not registered for this application"). Yani e-postayı
 * öğrenmenin tek otomatik yolu kapalı. Kısır döngü:
 *
 *   e-posta için erişim · erişim için allowlist · allowlist için e-posta
 *
 * Ölçüm (2026-08-06): `spotify_allowlist_requests`'te 3 kayıttan **2'sinde
 * `spotify_email` NULL**. Biri `pending` — yani Sahibin Spotify
 * Dashboard'a elle ekleyeceği e-posta hiçbir yerde yok, kullanıcı sırada
 * kalıyor ve kimse sebebini göremiyor.
 *
 * Çözüm: 403 yolunda kullanıcıya SOR. `/v1/me` çalışıyorsa sorma — e-posta
 * zaten otomatik geliyor, gereksiz sürtünme yaratmayız (planın kendi kuralı).
 *
 * ⚠ Bu action yalnız `spotify_email` alanını yazar; `status`'a DOKUNMAZ.
 * Onay Sahibin kararı — kullanıcı kendi kendini onaylayamaz.
 */

const EpostaSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email('Enter a valid email address.')

export type EpostaSonuc =
  | { ok: true }
  | { ok: false; hata: string }

export async function spotifyEpostasiniKaydet(eposta: string): Promise<EpostaSonuc> {
  const user = await requireAuth()

  const parsed = EpostaSchema.safeParse(eposta)
  if (!parsed.success) {
    return { ok: false, hata: parsed.error.issues[0]?.message ?? 'Invalid email.' }
  }

  try {
    const supabase = await createServiceClient()

    // Kayıt yoksa açılır (kullanıcı 403 yemiş ama satır oluşmamış olabilir).
    // `status` yazılmaz — mevcut durum korunur; yeni satırda varsayılan
    // 'pending' devreye girer.
    const { data: mevcut } = await supabase
      .from('spotify_allowlist_requests')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()

    const { error } = await supabase.from('spotify_allowlist_requests').upsert(
      {
        user_id: user.id,
        spotify_email: parsed.data.toLowerCase(),
        ...(mevcut?.status ? { status: mevcut.status } : {}),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw error

    revalidatePath('/settings/platforms')
    return { ok: true }
  } catch (err) {
    // Sessiz yutma YOK (B19): admin panelde eksik e-posta görülürse sebebi
    // `system_logs`'ta bulunacak.
    void systemLog({
      operation: 'spotify_allowlist',
      userId: user.id,
      platform: 'spotify',
      severity: 'error',
      errorCode: 'allowlist_email_write_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, hata: 'Couldn’t save. Try again in a moment.' }
  }
}
