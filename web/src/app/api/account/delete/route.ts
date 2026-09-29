import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateJsonBody } from '@/lib/security/validate'
import { systemLog } from '@/lib/observability/logger'

/**
 * GDPR/KVKK hesap silme (Faz 8.4 → KATMAN 1 soft-delete, 2026-07-25).
 *
 * ⚠ ESKİDEN: `auth.admin.deleteUser` ile ANINDA KALICI silme — "yanlışlıkla
 * sildim" kurtarılamıyordu, KVKK'nın "silme geri alınabilir" kriterine aykırıydı.
 * Silme işareti `account_deletions` tablosunda (migration 0354): sosyal profilden
 * BAĞIMSIZ. V2'de yeni kullanıcının social_profiles satırı yok; eski akış 0 satırı
 * "güncelleyip" başarılı dönüyor, silme talebi kayboluyordu.
 *
 * Yeni akış:
 *  1. Oturum doğrula.
 *  2. Şifre ile re-auth — yanlış şifrede 403.
 *  3. `account_deletions`'a satır ekle (soft-delete) → veri 30 gün durur,
 *     login'de kurtarma guard'ı geri alabilir.
 *  4. Çıkış yap. KALICI silme + Storage temizliği purge cron'unda (30 gün sonra).
 *
 * `ip_addr` hiçbir adımda saklanmaz/log'lanmaz.
 */
const PURGE_AFTER_DAYS = 30
const BodySchema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.literal('DELETE MY ACCOUNT'),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'You need to sign in.' }, { status: 401 })
  }

  const validation = await validateJsonBody(request, BodySchema)
  if (!validation.ok) return validation.response

  // Re-auth: şifreyi doğrula.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: validation.data.password,
  })
  if (reauthError) {
    return NextResponse.json({ error: 'Wrong password.' }, { status: 403 })
  }

  const service = await createServiceClient()

  // Soft-delete: account_deletions'a satır ekle (migration 0354). Storage + auth.users
  // KALICI silme purge cron'unda (30 gün).
  const { data: existing } = await service
    .from('account_deletions')
    .select('deleted_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.deleted_at) {
    // Zaten işaretli — idempotent, yine de çıkış yap.
    await supabase.auth.signOut().catch(() => {})
    return NextResponse.json({ deleted: true, soft_deleted: true, purge_after_days: PURGE_AFTER_DAYS })
  }

  const { error: softError } = await service.from('account_deletions').insert({
    user_id: user.id,
    deleted_by: 'self',
    deleted_reason: 'user_requested',
  })

  if (softError) {
    void systemLog({
      userId: user.id,
      operation: 'account_delete',
      severity: 'critical',
      errorCode: 'SOFT_DELETE_FAILED',
      errorMessage: softError.message,
    })
    return NextResponse.json(
      { error: 'Hesap silinemedi, tekrar dene.' },
      { status: 500 },
    )
  }

  await supabase.auth.signOut().catch(() => {})

  void systemLog({
    userId: user.id,
    operation: 'account_delete',
    severity: 'info',
  })

  return NextResponse.json({ deleted: true, soft_deleted: true, purge_after_days: PURGE_AFTER_DAYS })
}
