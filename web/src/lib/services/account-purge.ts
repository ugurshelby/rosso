import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

/**
 * Otomatik kalıcı silme (purge) — soft-delete süresi (30 gün) dolan hesapları siler.
 * `worker/app/pipeline/account_purge_runner.py`'nin TS portu
 * (01-yillik-kontrolsuz-calisma-plani.md devamı, 2026-09-16).
 *
 * Bağlam: Hesap silme İKİ aşamalı. (1) Kullanıcı/admin soft-delete eder →
 * `account_deletions` satırı eklenir (0354), veri 30 gün DURUR (geri alınabilir).
 * (2) 30 gün dolunca KALICI silme — bu fonksiyon bunu otomatikleştirir.
 *
 * Neden güvenli (admin/src/app/api/admin/users/[id]/purge/route.ts ile AYNI
 * kapılar, e-posta onayı hariç):
 *   - Kapı 1: yalnız deleted_at DOLU (soft-delete edilmiş) hesaplar aday.
 *   - Kapı 2: deleted_at + 30 gün < now — süresi GERÇEKTEN dolmuş olmalı.
 *   - Admin route'un 3. kapısı (e-posta birebir) bir İNSAN yanlış kullanıcıyı
 *     silmesin diyeydi; burada seçim DB filtresiyle otomatik ve dar. Her
 *     turda AZ hesap (batchLimit) silinir — bir bug tüm silinmişleri tek
 *     turda süpürmesin.
 *
 * Ne siler (admin route ile aynı sıra):
 *   1. profile-photos/{user_id}/ ve spotify-exports/{user_id}/ altındaki
 *      dosyalar (Storage) — bkz. `BUCKETS` notu.
 *   2. auth.users kaydı → CASCADE ile play_events/playlists/taste/mesajlar/…
 *      hepsi gider. GERİ DÖNÜŞSÜZ; ama 30 gün grace + soft-delete guard'ı
 *      zaten kullanıcıya kurtarma penceresi verdi.
 *
 * ⚠ Dış API'ye (Spotify vb.) istek ATMAZ — yalnız Supabase (kendi DB +
 * Storage + auth admin). Rate-limit konusu yok. Yıkıcı olduğu için batch
 * küçük ve her silme tek tek, hata izole.
 */

const PURGE_AFTER_DAYS = 30

/**
 * Temizlenecek Storage kovaları — ikisi de `{user_id}/…` önekiyle yazar.
 *
 * ⚠ `spotify-exports` 2026-09-22 KVKK denetiminde eklendi. Önceden yalnız
 * `profile-photos` süpürülüyordu; oysa yüklenen Spotify ZIP'i çok daha
 * kişisel bir veri (tüm dinleme geçmişi). Normalde worker işledikten sonra
 * dosyayı siler — ama iş YARIDA kalırsa ya da yükleme başarısız olursa dosya
 * kovada kalır. `export_jobs` satırı CASCADE ile gider, Storage nesnesi
 * GİTMEZ: kayıt silinince dosya artık sahipsiz ve kimsenin göremediği ama
 * duran bir kişisel veri olurdu. "Unutulma hakkı" dosyayı da kapsar.
 */
const BUCKETS = ['profile-photos', 'spotify-exports'] as const

export interface AccountPurgeResult {
  outcome: 'empty' | 'success' | 'partial' | 'error'
  eligible: number
  purged: number
  failed: number
  storageFiles: number
  error?: string
}

async function deleteStorageFolder(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
  bucket: string,
): Promise<number> {
  try {
    const { data: files } = await supabase.storage.from(bucket).list(userId)
    if (!files || files.length === 0) return 0
    const paths = files.filter((f) => f.name).map((f) => `${userId}/${f.name}`)
    if (paths.length === 0) return 0
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) {
      void systemLog({
        operation: 'account_purge',
        userId,
        severity: 'warn',
        errorMessage: `Storage remove başarısız (${bucket}): ${error.message}`,
      })
      return 0
    }
    return paths.length
  } catch (err) {
    void systemLog({
      operation: 'account_purge',
      userId,
      severity: 'warn',
      errorMessage: `Storage list başarısız (${bucket}): ${err instanceof Error ? err.message : String(err)}`,
    })
    return 0
  }
}

/** Kullanıcının TÜM kovalardaki dosyalarını siler; silinen dosya sayısını döner. */
async function deleteAllUserFiles(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
): Promise<number> {
  let toplam = 0
  for (const bucket of BUCKETS) {
    toplam += await deleteStorageFolder(supabase, userId, bucket)
  }
  return toplam
}

export async function runAccountPurge(batchLimit = 25): Promise<AccountPurgeResult> {
  const supabase = await createServiceClient()
  const cutoff = new Date(Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows, error: queryError } = await supabase
    .from('account_deletions')
    .select('user_id, deleted_at')
    .lt('deleted_at', cutoff)
    .order('deleted_at')
    .limit(batchLimit)

  if (queryError) {
    return {
      outcome: 'error',
      eligible: 0,
      purged: 0,
      failed: 0,
      storageFiles: 0,
      error: queryError.message,
    }
  }

  if (!rows || rows.length === 0) {
    return { outcome: 'empty', eligible: 0, purged: 0, failed: 0, storageFiles: 0 }
  }

  let purged = 0
  let failed = 0
  let storageFiles = 0

  for (const row of rows) {
    const userId = row.user_id as string
    try {
      storageFiles += await deleteAllUserFiles(supabase, userId)

      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError

      purged += 1
      void systemLog({
        operation: 'account_purge',
        userId,
        severity: 'info',
        errorMessage: `Kalıcı silindi (deleted_at: ${row.deleted_at})`,
      })
    } catch (err) {
      failed += 1
      void systemLog({
        operation: 'account_purge',
        userId,
        severity: 'error',
        errorMessage: `Kullanıcı silinemedi: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  const outcome: AccountPurgeResult['outcome'] =
    failed && purged ? 'partial' : failed ? 'error' : 'success'

  return { outcome, eligible: rows.length, purged, failed, storageFiles }
}
