import { NextResponse, type NextRequest } from 'next/server'
import { runAccountPurge } from '@/lib/services/account-purge'
import { timingSafeEqualString } from '@/lib/security/timing-safe-equal'
import { recordPipelineRun } from '@/lib/observability/pipeline-run'

export const dynamic = 'force-dynamic'
/*
 * 60 → 300 (2026-09-23, 1000 kullanıcı ölçeği): silme başına Storage +
 * Auth çağrıları var; 25 hesap 60 sn'ye sığmayabilirdi. Cron saatte bir
 * (0343) → günde en fazla 600 silme, kuyruk birikmez.
 */
export const maxDuration = 300

/**
 * Supabase pg_cron Tetikli Otomatik Hesap Silme Endpoint'i.
 *
 * 01-yillik-kontrolsuz-calisma-plani.md devamı (2026-09-16) — eskiden
 * GitHub Actions/Python'da yaşayan account_purge, TS'e taşındı (dış API'ye
 * hiç istek atmadığı için port riski düşüktü). Triggered by rosso-account-purge-cron.
 *
 * ⚠ GERİ ALINAMAZ (auth.users CASCADE). Migration 0298'de bu cron job
 * `active = false` eklendi — Sahibin açık onayı olmadan otomatik
 * çalışmaz.
 *
 * Security: Diğer /api/cron/* route'larıyla aynı — Bearer CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.WORKER_SHARED_SECRET

  if (!expectedSecret) {
    console.error('[cron/account-purge] Server misconfiguration: CRON_SECRET missing.')
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET missing' }, { status: 500 })
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!timingSafeEqualString(token, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 })
  }

  const startTime = Date.now()
  try {
    const result = await runAccountPurge(25)
    if (result.outcome !== 'empty') {
      await recordPipelineRun({
        runType: 'account_purge',
        outcome: result.outcome,
        stats: { ...result },
        error: result.error,
      })
    }
    return NextResponse.json({ ok: true, ...result, durationMs: Date.now() - startTime })
  } catch (err) {
    console.error('[cron/account-purge] Unexpected error:', err)
    await recordPipelineRun({
      runType: 'account_purge',
      outcome: 'error',
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
