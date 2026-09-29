import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

/**
 * KATMAN 1 (2026-07-25): Hesap kurtarma guard'ı.
 *
 * Kullanıcı kendi hesabını sildiğinde artık HARD-delete değil SOFT-delete oluyor
 * (account_deletions + 30 gün grace, /api/account/delete). Bu kullanıcı
 * yine de auth.users'ta durduğu için tekrar GİRİŞ yapabilir. 30 gün içinde geri
 * dönmesi = "yanlışlıkla sildim / vazgeçtim" sinyalidir → hesabı otomatik geri al.
 *
 * Bu guard dashboard layout'ta çağrılır (her korumalı sayfaya girişte). Geri alma
 * idempotent: zaten aktifse hiçbir şey yapmaz. `deleted_by = 'self'` olan kayıtlar
 * kurtarılır; admin'in sildiği (deleted_by != 'self') kullanıcı GİRİŞ ile
 * kurtarılamaz — o ban/moderasyon kararıdır, kullanıcı geçemez.
 */
export async function recoverIfSelfDeleted(userId: string): Promise<void> {
  const service = await createServiceClient()

  const { data: mark } = await service
    .from('account_deletions')
    .select('deleted_at, deleted_by')
    .eq('user_id', userId)
    .maybeSingle()

  if (!mark?.deleted_at) return // aktif, iş yok

  // Admin kararı (deleted_by != 'self') login ile geçilemez — güvenlik.
  if (mark.deleted_by !== 'self') return

  const { error } = await service.from('account_deletions').delete().eq('user_id', userId)

  if (error) {
    void systemLog({
      userId,
      operation: 'account_recovery',
      severity: 'warn',
      errorCode: 'RECOVERY_FAILED',
      errorMessage: error.message,
    })
    return
  }

  void systemLog({ userId, operation: 'account_recovery', severity: 'info' })
}
