import { NextResponse, type NextRequest } from 'next/server'
import { runMoodTuru } from '@/lib/services/mood-pkg'
import { timingSafeEqualString } from '@/lib/security/timing-safe-equal'
import { recordPipelineRun } from '@/lib/observability/pipeline-run'

export const dynamic = 'force-dynamic'

/**
 * 🔴 60 → 300 (2026-09-20 kalite denetimi, ÖLÇÜMLE).
 *
 * 60 sn'lik pencere kürasyon KALİTESİNİ kesiyordu, performansı değil:
 * `mood-v4-semantik` prompt'u (mood/vibe etiketleri + semantik playlist
 * tanımı + pozitif/negatif örnekler) çağrı gecikmesini 2,5 sn'den 5,0 sn'ye
 * çıkardı. Canlı koşumda 12 mood'un yalnız 6'sı AI penceresine sığdı, kalan
 * 6'sı SQL'e düştü — yani listelerin yarısı kürasyonsuz kaldı ve bu HİÇBİR
 * hata üretmedi (tasarım gereği sessiz fallback). `aiCurated: 6` olmasa
 * fark edilmezdi.
 *
 * Maliyet açısından güvenli: günde BİR kez çalışan bir serverless fonksiyon,
 * 7/24 açık konteyner değil (Sıfır Maliyet Disiplini korunuyor). Gerçek turda
 * ölçülen süre ~41 sn; 300 bir TAVAN, hedef değil.
 *
 * ⚠ `invoke_mood_pkg_cron`'un `timeout_milliseconds` değeri de bununla
 * birlikte 300000'e çıkarıldı (migration 0330) — yoksa pg_net 60 sn'de
 * bağlantıyı kesip turu "timeout" diye kaydederdi.
 */
export const maxDuration = 300

/**
 * Supabase pg_cron Tetikli Mood Paketi + Haftalık Senkron Endpoint'i.
 *
 * 01-yillik-kontrolsuz-calisma-plani.md devamı (2026-09-16) — eskiden
 * GitHub Actions/Python'da yaşayan mood_pkg + mood_weekly_sync, mevcut
 * token-refresh altyapısını (ensureValidToken) kullanarak TS'e taşındı.
 * Triggered by rosso-mood-pkg-cron.
 *
 * Security: Diğer /api/cron/* route'larıyla aynı — Bearer CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.WORKER_SHARED_SECRET

  if (!expectedSecret) {
    console.error('[cron/mood-pkg] Server misconfiguration: CRON_SECRET missing.')
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET missing' }, { status: 500 })
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!timingSafeEqualString(token, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 })
  }

  /*
   * `?force=1` — davranış frenini atlar (12 mood koşulsuz yeniden üretilir).
   * Aynı CRON_SECRET'la korunuyor; pg_cron ASLA göndermez. Yalnız denetim/
   * ölçüm için: paket tazeyken tur normalde her mood'u atlar ve bir
   * değişikliğin etkisi ölçülemez hâle gelir (2026-09-20'de birebir yaşandı).
   */
  const force = new URL(req.url).searchParams.get('force') === '1'

  const startTime = Date.now()
  try {
    /*
     * Kayan sıra (0342, 2026-09-23): tur artık TÜM kullanıcıları değil,
     * sıradan vadesi gelmiş olanları işler; pg_cron 10 dakikada bir çağırır
     * (0343). 1000 kullanıcıda da hiçbir kullanıcı kalıcı olarak AI'sız
     * kalmaz — bkz. `runMoodTuru` kapasite notu.
     */
    const { moodPkg, weeklySync, yearPkg, userIntelligence, catalogEnrichment, editorial, budgetExhausted } =
      await runMoodTuru(force)

    /*
     * 🔴 `pipeline_runs` kaydı (2026-09-23) — bkz. lib/observability/pipeline-run.ts
     * başlık notu. Bu cron 2026-09-16'da Python worker'dan TS'e taşınırken
     * `record_run` çağrısı unutulmuştu; admin paneli 3 Eylül'den beri bu
     * işin durumunu göremiyordu (iş kendisi kesintisiz çalışmaya devam etti).
     * `moodPkg.outcome` zaten hesaplanmış durumda — onu aynen kullanıyoruz.
     */
    await recordPipelineRun({
      runType: 'mood_pkg',
      outcome: moodPkg.outcome,
      stats: {
        moodPkg,
        weeklySync,
        yearPkg,
        userIntelligence,
        catalogEnrichment,
        editorial,
        budgetExhausted,
        durationMs: Date.now() - startTime,
      },
    })

    return NextResponse.json({
      ok: true,
      moodPkg,
      weeklySync,
      yearPkg,
      userIntelligence,
      catalogEnrichment,
      editorial,
      budgetExhausted,
      durationMs: Date.now() - startTime,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/mood-pkg] Unexpected error:', err)
    await recordPipelineRun({
      runType: 'mood_pkg',
      outcome: 'error',
      error: message,
      stats: { durationMs: Date.now() - startTime },
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
