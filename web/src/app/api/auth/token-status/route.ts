import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

type PlatformStatus = {
  connected: boolean
  expiresAt: string | null
  needsRefresh: boolean
  expired: boolean
  exportImported: boolean
}

type ExportStatus = {
  hasCompleted: boolean
  latestJob: {
    id: string
    status: string
    pipelineStep: string | null
    totalEvents: number
    processedEvents: number
    matchedEvents: number
    completedAt: string | null
    periodStart: string | null
    periodEnd: string | null
  } | null
}

type TokenStatusResponse = {
  spotify: PlatformStatus | null
  export: ExportStatus
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const [{ data: connections }, { data: exportJobs }] = await Promise.all([
    supabase
      .from('platform_connections')
      .select('platform, is_active, token_expires, export_imported')
      .eq('user_id', user.id)
      .eq('platform', 'spotify'),
    supabase
      .from('export_jobs')
      .select('id, status, pipeline_step, total_events, processed_events, matched_events, completed_at, period_start, period_end')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  function toStatus(
    conn: { is_active: boolean | null; token_expires: string | null; export_imported: boolean | null } | undefined,
  ): PlatformStatus | null {
    if (!conn || !conn.is_active) return null
    const expiresAt = conn.token_expires
    const now = Date.now()
    const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null
    const needsRefresh = expiresMs ? expiresMs - now < 10 * 60 * 1000 : false
    const expired = expiresMs ? expiresMs < now : false
    return {
      connected: true,
      expiresAt,
      needsRefresh,
      expired,
      exportImported: conn.export_imported ?? false,
    }
  }

  const byPlatform = Object.fromEntries(
    (connections ?? []).map((c) => [c.platform, c]),
  )

  const latestJob = exportJobs?.[0] ?? null
  const exportStatus: ExportStatus = {
    hasCompleted: latestJob?.status === 'completed',
    latestJob: latestJob ? {
      id: latestJob.id,
      status: latestJob.status,
      pipelineStep: latestJob.pipeline_step ?? null,
      totalEvents: latestJob.total_events ?? 0,
      processedEvents: latestJob.processed_events ?? 0,
      matchedEvents: latestJob.matched_events ?? 0,
      completedAt: latestJob.completed_at ?? null,
      periodStart: latestJob.period_start ?? null,
      periodEnd: latestJob.period_end ?? null,
    } : null,
  }

  const result: TokenStatusResponse = {
    spotify: toStatus(byPlatform['spotify']),
    export: exportStatus,
  }

  return NextResponse.json(result)
}
