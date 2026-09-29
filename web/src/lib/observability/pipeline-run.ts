import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * `pipeline_runs`'a tek satır kayıt — admin panelinin cron durumunu okuduğu
 * yer (`worker/app/services/run_log.py`'nin TS karşılığı).
 *
 * ── Neden bu dosya var (2026-09-23, ölçüldü) ──────────────────────────────
 * `mood_pkg` cron'u 2026-09-16'da Python worker'dan TS'e taşındı
 * (`api/cron/mood-pkg/route.ts`) ama `record_run` çağrısı taşıma sırasında
 * unutuldu — iş kusursuz çalışmaya devam etti (bugün 02:30'da üretilen
 * paket bunu kanıtlıyor), yalnız `pipeline_runs`'a 3 Eylül'den beri hiç
 * satır düşmedi. Yani hata YOKTU, görünürlük vardı. "Admin paneli hatasız
 * görünüyor" ile "iş gerçekten çalışıyor" farklı iddialar — bu dosya
 * ikisini yeniden aynı şeye bağlıyor.
 *
 * `record_run` RPC'si (SECURITY DEFINER) zaten DB'de duruyordu, hiç
 * değişmedi — yalnız TS tarafında onu çağıran kod eksikti.
 */

export type PipelineRunOutcome = 'success' | 'empty' | 'partial' | 'error'

/** Fire-and-forget: log yazımı başarısız olsa bile ana işi etkilemez. */
export async function recordPipelineRun(args: {
  runType: string
  outcome: PipelineRunOutcome
  stats?: Record<string, unknown>
  error?: string
}): Promise<void> {
  try {
    const service = await createServiceClient()
    /*
     * ⚠ `as never` — Supabase'in ürettiği tipler `p_job_id`/`p_error`'ı
     * zorunlu `string` gösteriyor (`packages/shared-types/src/database.ts`),
     * ama gerçek Postgres fonksiyonu (`pg_get_functiondef` ile doğrulandı)
     * ikisini de NULL kabul ediyor — codegen'in nullability'yi yakalayamadığı
     * bilinen bir durum. `null` yerine `''` göndermek `error` kolonunu
     * kirletirdi (boş string ≠ NULL, "hata yok" anlamı bozulur).
     */
    await service.rpc('record_run', {
      p_run_type: args.runType,
      p_job_id: null,
      p_outcome: args.outcome,
      p_stats: (args.stats ?? {}) as never,
      p_error: args.error ?? null,
    } as never)
  } catch (err) {
    console.error('[pipeline-run] record_run başarısız:', err)
  }
}

/**
 * Kayan sıra turlarının (`siraylaIsle`) sonucunu `pipeline_runs`'a yazar.
 *
 * Denetim 2026-09-26: recap / playlist_refresh / spotify senkron / account_purge /
 * auto_playlist / katalog zenginleştirme TS'e taşınırken `record_run` çağrısı
 * yalnız `mood_pkg`'de vardı; kalan işler admin panelinde "3 Eylül'den beri
 * sessiz" görünüyordu (iş çalışıyordu, kayıt yoktu).
 *
 * Gürültü kontrolü: hiç kullanıcı işlenmediyse ('empty') YAZILMAZ — 5 dakikada
 * bir çalışan işler günde yüzlerce anlamsız satır üretmesin. Vercel'de
 * cevap döndükten sonra fire-and-forget iş kesilebilir; bu yüzden çağıran
 * `await` etmelidir.
 */
export async function recordSiraRun(
  runType: string,
  sonuc: { islenen: number; hatali: number; butceDoldu: boolean },
  stats: Record<string, unknown> = {},
): Promise<void> {
  const { islenen, hatali, butceDoldu } = sonuc
  if (islenen === 0 && hatali === 0) return
  const outcome: PipelineRunOutcome =
    hatali === 0 ? 'success' : islenen === 0 ? 'error' : 'partial'
  await recordPipelineRun({
    runType,
    outcome,
    stats: { usersProcessed: islenen, usersFailed: hatali, budgetExhausted: butceDoldu, ...stats },
    error: hatali > 0 ? `${hatali} kullanıcı hatalı` : undefined,
  })
}
