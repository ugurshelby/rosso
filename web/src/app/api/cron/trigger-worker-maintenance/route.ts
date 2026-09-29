import { NextResponse, type NextRequest } from 'next/server'
import { dispatchWorkerEvent } from '@/lib/worker/dispatch'
import { timingSafeEqualString } from '@/lib/security/timing-safe-equal'

export const dynamic = 'force-dynamic'

/**
 * Supabase pg_cron Tetikli Worker Bakım Endpoint'i.
 *
 * 01-yillik-kontrolsuz-calisma-plani.md devamı (2026-09-16) —
 * `account_purge`/`mood_pkg`/`playlist_refresh` TypeScript'e taşındıktan
 * sonra bu route yalnızca `catalog_maintenance` (ISRC/kapak/sanatçı görsel
 * bakımı — Deezer/Last.fm/MusicBrainz, olgun Python kodu) için kaldı. Bu
 * route pg_cron'dan (`pg_net` üzerinden, `/api/cron/sync-spotify` ile aynı
 * desen) çağrılır ve GitHub `repository_dispatch` ile
 * worker repo'sunu (`WORKER_GITHUB_REPO`) uyandırır.
 *
 * NEDEN GitHub Actions'ın kendi `schedule:` tetikleyicisi DEĞİL: GitHub, 60
 * gün boyunca repoda hiç commit/push olmazsa zamanlanmış workflow'ları
 * otomatik durdurur. `repository_dispatch` bu kurala tabi değildir — asıl
 * zamanlayıcı burada, asla durmayan pg_cron'dur.
 *
 * Security: Diğer /api/cron/* route'larıyla aynı — Bearer CRON_SECRET.
 */
const VALID_TASKS = ['catalog_maintenance'] as const
type MaintenanceTask = (typeof VALID_TASKS)[number]

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.WORKER_SHARED_SECRET

  if (!expectedSecret) {
    console.error('[cron/trigger-worker-maintenance] Server misconfiguration: CRON_SECRET missing.')
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET missing' },
      { status: 500 },
    )
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!timingSafeEqualString(token, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { task?: string } | null
  const task = body?.task
  if (!task || !VALID_TASKS.includes(task as MaintenanceTask)) {
    return NextResponse.json(
      { error: `Invalid task. Expected one of: ${VALID_TASKS.join(', ')}` },
      { status: 400 },
    )
  }

  await dispatchWorkerEvent('scheduled_maintenance', { task }, 'trigger_worker_maintenance')

  return NextResponse.json({ ok: true, task })
}
