import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { createSpotifyPlaylist, addTracksToSpotify } from '@/lib/playlists/spotify-target'

export interface AutoPlaylistRule {
  id: string
  user_id: string
  rule_type: 'top_month' | 'top_year' | 'morning_routine' | 'nostalgia' | 'most_skipped' | 'obsession'
  track_count: number
  target_platforms: string[]
  enabled: boolean
  sort_by: 'plays' | 'duration'
  last_run_at: string | null
  created_at: string
}

export interface RuleExecutionResult {
  ruleId: string
  userId: string
  ruleType: string
  status: 'completed' | 'skipped' | 'empty' | 'failed'
  playlistId?: string
  trackCount: number
  error?: string
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Derives the start and end dates and name for a rule execution.
 */
function resolveRuleParameters(ruleType: string, now = new Date()) {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1 // 1-12

  if (ruleType === 'top_month') {
    // Previous calendar month
    const prevYear = month === 1 ? year - 1 : year
    const prevMonth = month === 1 ? 12 : month - 1
    const from = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0)).toISOString()
    const to = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString()
    const name = `${MONTH_NAMES[prevMonth]} - ${prevYear}`
    const description = `Top tracks from ${MONTH_NAMES[prevMonth]} ${prevYear} generated automatically by Rosso.`
    return { from, to, name, description, hourFrom: null, hourTo: null, skipped: false }
  }

  if (ruleType === 'top_year') {
    // Previous calendar year (or current year if in second half)
    const targetYear = month === 1 ? year - 1 : year
    const from = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0)).toISOString()
    const to = new Date(Date.UTC(targetYear + 1, 0, 1, 0, 0, 0)).toISOString()
    const name = `${targetYear} Rewind`
    const description = `Top songs from ${targetYear} generated automatically by Rosso.`
    return { from, to, name, description, hourFrom: null, hourTo: null, skipped: false }
  }

  if (ruleType === 'morning_routine') {
    // Morning tracks in last 60 days (06:00 to 11:00)
    const from = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const to = now.toISOString()
    return {
      from,
      to,
      name: 'Morning Routine — Rosso',
      description: 'Your morning soundtrack curated automatically by Rosso.',
      hourFrom: 6,
      hourTo: 11,
      skipped: false,
    }
  }

  if (ruleType === 'obsession') {
    // Tracks on heavy rotation in last 30 days
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const to = now.toISOString()
    return {
      from,
      to,
      name: 'Obsessions — Rosso',
      description: 'Tracks on heavy repeat over the last 30 days.',
      hourFrom: null,
      hourTo: null,
      skipped: false,
    }
  }

  if (ruleType === 'most_skipped') {
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const to = now.toISOString()
    return {
      from,
      to,
      name: 'Skipped Relics — Rosso',
      description: 'Tracks frequently skipped in the last 90 days.',
      hourFrom: null,
      hourTo: null,
      skipped: true,
    }
  }

  // Default: last 30 days
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const to = now.toISOString()
  return {
    from,
    to,
    name: 'Auto Mix — Rosso',
    description: 'Auto-generated playlist by Rosso.',
    hourFrom: null,
    hourTo: null,
    skipped: false,
  }
}

/**
 * Executes all enabled auto playlist rules across users.
 */
/** Bir kural en fazla bu sıklıkla çalışır (eski aylık cron + 20 gün kuralıyla aynı). */
const KURAL_ARALIGI_GUN = 20

/** Tek çağrıda en fazla bu kadar kural okunur (bellek + sorgu sınırı). */
const CAGRI_BASINA_KURAL = 300

/**
 * Vadesi gelmiş kuralları çalıştırır.
 *
 * 🔴 1000 kullanıcı ölçeği (2026-09-23): eskiden ayın 1'inde TEK çağrıda
 * TÜM kurallar (her biri Spotify'da playlist oluşturup şarkı ekliyor, 60 sn
 * sınır). Kullanıcı başına birkaç kural × 1000 kullanıcı bir çağrıya sığmaz
 * ve kesilen kurallar bir sonraki AYA kalırdı. Artık:
 *   • yalnız vadesi gelmiş kurallar (son çalışma 20 günden eski), en eski önce;
 *   • `bitis` geçince durur — kalanlar bir sonraki saatlik çağrıda (0343:
 *     ayın 1–3'ü saatte bir) devam eder.
 *
 * @param bitis Bu zamandan (epoch ms) sonra YENİ kural başlatılmaz.
 */
export async function runAutoPlaylists(bitis?: number): Promise<{
  rulesProcessed: number
  successful: number
  results: RuleExecutionResult[]
  deadlineReached: boolean
}> {
  const supabase = await createServiceClient()

  const vadeSiniri = new Date(Date.now() - KURAL_ARALIGI_GUN * 24 * 60 * 60 * 1000).toISOString()
  const { data: rules, error: rulesErr } = await supabase
    .from('auto_playlist_rules')
    .select('*')
    .eq('enabled', true)
    .or(`last_run_at.is.null,last_run_at.lt.${vadeSiniri}`)
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(CAGRI_BASINA_KURAL)

  if (rulesErr) {
    throw new Error(`Failed to query auto_playlist_rules: ${rulesErr.message}`)
  }

  const results: RuleExecutionResult[] = []

  let deadlineReached = false
  for (const rule of (rules as AutoPlaylistRule[] | null) || []) {
    if (bitis !== undefined && Date.now() >= bitis) {
      deadlineReached = true
      break
    }
    try {
      // Check if rule ran very recently (less than 20 days ago for monthly/yearly)
      if (rule.last_run_at && (rule.rule_type === 'top_month' || rule.rule_type === 'top_year')) {
        const lastRunTime = new Date(rule.last_run_at).getTime()
        const daysSinceLastRun = (Date.now() - lastRunTime) / (1000 * 60 * 60 * 24)
        if (daysSinceLastRun < 20) {
          results.push({
            ruleId: rule.id,
            userId: rule.user_id,
            ruleType: rule.rule_type,
            status: 'skipped',
            trackCount: 0,
          })
          continue
        }
      }

      const params = resolveRuleParameters(rule.rule_type)

      // Query top tracks for rule via DB RPC
      const { data: topRows, error: rpcErr } = await supabase.rpc('get_top_tracks_for_rule', {
        p_user_id: rule.user_id,
        p_from: params.from,
        p_to: params.to,
        p_limit: rule.track_count || 50,
        p_skipped: params.skipped,
        p_min_plays: undefined,
        p_hour_from: params.hourFrom ?? undefined,
        p_hour_to: params.hourTo ?? undefined,
        p_sort_by: rule.sort_by || 'plays',
      })

      if (rpcErr) {
        throw new Error(`get_top_tracks_for_rule RPC error: ${rpcErr.message}`)
      }

      const trackIds = ((topRows as { track_id: string }[] | null) || []).map((r) => r.track_id)

      if (trackIds.length === 0) {
        results.push({
          ruleId: rule.id,
          userId: rule.user_id,
          ruleType: rule.rule_type,
          status: 'empty',
          trackCount: 0,
        })
        continue
      }

      // Fetch corresponding spotify_id from tracks table
      const { data: tracks } = await supabase
        .from('tracks')
        .select('id, spotify_id')
        .in('id', trackIds)

      const spotifyIds = ((tracks as { id: string; spotify_id: string | null }[] | null) || [])
        .filter((t) => !!t.spotify_id)
        .map((t) => t.spotify_id as string)

      if (spotifyIds.length === 0) {
        results.push({
          ruleId: rule.id,
          userId: rule.user_id,
          ruleType: rule.rule_type,
          status: 'empty',
          trackCount: 0,
        })
        continue
      }

      // Create Spotify Playlist
      const playlistId = await createSpotifyPlaylist(rule.user_id, params.name, params.description)

      // Add tracks to the created playlist
      await addTracksToSpotify(rule.user_id, playlistId, spotifyIds)

      // Log execution in auto_playlist_runs
      await supabase.from('auto_playlist_runs').insert({
        rule_id: rule.id,
        platform: 'spotify',
        generated_playlist_id: playlistId,
        track_count: spotifyIds.length,
        status: 'completed',
      })

      // Update last_run_at
      await supabase
        .from('auto_playlist_rules')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', rule.id)

      results.push({
        ruleId: rule.id,
        userId: rule.user_id,
        ruleType: rule.rule_type,
        status: 'completed',
        playlistId,
        trackCount: spotifyIds.length,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[auto-playlist-generator] Error executing rule ${rule.id}:`, msg)

      try {
        await supabase.from('auto_playlist_runs').insert({
          rule_id: rule.id,
          platform: 'spotify',
          generated_playlist_id: null,
          track_count: 0,
          status: 'failed',
          error_message: msg.slice(0, 500),
        })
      } catch {
        // Ignore secondary logging errors
      }

      results.push({
        ruleId: rule.id,
        userId: rule.user_id,
        ruleType: rule.rule_type,
        status: 'failed',
        trackCount: 0,
        error: msg,
      })
    }
  }

  const successful = results.filter((r) => r.status === 'completed').length

  return {
    rulesProcessed: results.length,
    successful,
    results,
    deadlineReached,
  }
}
