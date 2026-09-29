import { NextResponse, type NextRequest } from 'next/server'
import { runAutoPlaylists } from '@/lib/services/auto-playlist-generator'
import { timingSafeEqualString } from '@/lib/security/timing-safe-equal'
import { recordPipelineRun } from '@/lib/observability/pipeline-run'

export const dynamic = 'force-dynamic'
/*
 * 60 → 300 (2026-09-23): kurallar artık bütçeyle işleniyor ve kalanlar bir
 * sonraki saatlik çağrıya devrediliyor (bkz. `runAutoPlaylists`).
 */
export const maxDuration = 300

/** Bu süreden sonra yeni kural başlatılmaz (kural başına ~2-5 sn Spotify). */
const SURE_BUTCESI_MS = 240_000

/**
 * Autonomous Auto-Playlists Cron Endpoint.
 *
 * Triggered by Supabase pg_cron (rosso-auto-playlists-cron).
 * Processes active rules in auto_playlist_rules and generates fresh Spotify playlists.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.WORKER_SHARED_SECRET

  if (!expectedSecret) {
    console.error('[cron/auto-playlists] Server misconfiguration: CRON_SECRET missing.')
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET missing' },
      { status: 500 }
    )
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!timingSafeEqualString(token, expectedSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid cron secret' },
      { status: 401 }
    )
  }

  const startTime = Date.now()

  try {
    const res = await runAutoPlaylists(startTime + SURE_BUTCESI_MS)
    if (res.rulesProcessed > 0) {
      await recordPipelineRun({
        runType: 'auto_playlist',
        outcome: res.successful === res.rulesProcessed ? 'success' : res.successful > 0 ? 'partial' : 'error',
        stats: { rulesProcessed: res.rulesProcessed, successful: res.successful, deadlineReached: res.deadlineReached },
      })
    }
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      ...res,
    })
  } catch (err) {
    console.error('[cron/auto-playlists] Unexpected error:', err)
    await recordPipelineRun({
      runType: 'auto_playlist',
      outcome: 'error',
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
