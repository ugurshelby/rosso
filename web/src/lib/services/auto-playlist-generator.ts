import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { createSpotifyPlaylist, addTracksToSpotify } from '@/lib/playlists/spotify-target'
import { bekleyenDonemler, donemAdi, type Donem } from '@/lib/playlists/otomatik-donem'

export interface AutoPlaylistRule {
  id: string
  user_id: string
  rule_type: 'top_month' | 'top_year' | 'morning_routine' | 'nostalgia' | 'most_skipped' | 'obsession'
  track_count: number
  target_platforms: string[]
  enabled: boolean
  sort_by: 'plays' | 'duration'
  name_format: string | null
  last_run_at: string | null
  created_at: string
}

export interface RuleExecutionResult {
  ruleId: string
  userId: string
  ruleType: string
  /** Dönem anahtarı: 'YYYY-MM' ya da 'YYYY'. */
  donem?: string
  status: 'completed' | 'skipped' | 'empty' | 'failed'
  playlistId?: string
  trackCount: number
  error?: string
}

/** Tek çağrıda en fazla bu kadar kural okunur (bellek + sorgu sınırı). */
const CAGRI_BASINA_KURAL = 300

/** Bir kural için tek çağrıda en çok bu kadar eksik dönem üretilir (Spotify yazma yükü). */
const KURAL_BASINA_DONEM = 3

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>

/**
 * Eksik dönemleri üretir.
 *
 * Her kural için `auto_playlist_runs.donem` ile tamamlanmış dönemler okunur,
 * eksik olanlar (bkz. `bekleyenDonemler`) en eskiden başlayarak üretilir.
 * Bir dönem başarısız olursa kaydı düşer ve bir sonraki çağrıda yeniden
 * denenir — ayın 1-3'üne bağlı değildir (pg_cron 6 saatte bir çağırır, 0367).
 *
 * @param bitis Bu zamandan (epoch ms) sonra YENİ üretim başlatılmaz.
 */
export async function runAutoPlaylists(bitis?: number, simdi = new Date()): Promise<{
  rulesProcessed: number
  successful: number
  results: RuleExecutionResult[]
  deadlineReached: boolean
}> {
  const supabase = await createServiceClient()

  const { data: rules, error: rulesErr } = await supabase
    .from('auto_playlist_rules')
    .select('*')
    .eq('enabled', true)
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(CAGRI_BASINA_KURAL)
  if (rulesErr) throw new Error(`Failed to query auto_playlist_rules: ${rulesErr.message}`)

  const kurallar = (rules as AutoPlaylistRule[] | null) ?? []
  const results: RuleExecutionResult[] = []
  if (kurallar.length === 0) return { rulesProcessed: 0, successful: 0, results, deadlineReached: false }

  const [tamamlanan, diller] = await Promise.all([
    tamamlananDonemler(supabase, kurallar.map((k) => k.id)),
    kullaniciDilleri(supabase, [...new Set(kurallar.map((k) => k.user_id))]),
  ])

  let deadlineReached = false
  kurallar: for (const rule of kurallar) {
    const bekleyen = bekleyenDonemler(
      rule.rule_type,
      tamamlanan.get(rule.id) ?? new Set(),
      simdi,
      rule.created_at ? new Date(rule.created_at) : null,
    ).slice(0, KURAL_BASINA_DONEM)

    for (const donem of bekleyen) {
      if (bitis !== undefined && Date.now() >= bitis) {
        deadlineReached = true
        break kurallar
      }
      const sonuc = await donemUret(supabase, rule, donem, diller.get(rule.user_id) ?? null)
      results.push(sonuc)
      // Bağlantı/izin hatası aynı kuralın diğer dönemlerinde de tekrarlanır: kuralı bırak.
      if (sonuc.status === 'failed') continue kurallar
    }
  }

  const successful = results.filter((r) => r.status === 'completed').length
  return { rulesProcessed: results.length, successful, results, deadlineReached }
}

async function tamamlananDonemler(supabase: ServiceClient, kuralIdleri: string[]): Promise<Map<string, Set<string>>> {
  const { data, error } = await supabase
    .from('auto_playlist_runs')
    .select('rule_id, donem')
    .in('rule_id', kuralIdleri)
    .eq('status', 'completed')
    .not('donem', 'is', null)
  if (error) throw new Error(`Failed to query auto_playlist_runs: ${error.message}`)
  const harita = new Map<string, Set<string>>()
  for (const r of (data as { rule_id: string; donem: string }[] | null) ?? []) {
    if (!harita.has(r.rule_id)) harita.set(r.rule_id, new Set())
    harita.get(r.rule_id)!.add(r.donem)
  }
  return harita
}

async function kullaniciDilleri(supabase: ServiceClient, kullanicilar: string[]): Promise<Map<string, string | null>> {
  const { data } = await supabase.from('user_preferences').select('user_id, locale').in('user_id', kullanicilar)
  return new Map(((data as { user_id: string; locale: string | null }[] | null) ?? []).map((r) => [r.user_id, r.locale]))
}

async function donemUret(
  supabase: ServiceClient,
  rule: AutoPlaylistRule,
  donem: Donem,
  dil: string | null,
): Promise<RuleExecutionResult> {
  const temel = { ruleId: rule.id, userId: rule.user_id, ruleType: rule.rule_type, donem: donem.anahtar }
  try {
    const { data: topRows, error: rpcErr } = await supabase.rpc('get_top_tracks_for_rule', {
      p_user_id: rule.user_id,
      p_from: donem.from,
      p_to: donem.to,
      p_limit: rule.track_count || 50,
      p_skipped: donem.skipped,
      p_min_plays: undefined,
      p_hour_from: donem.hourFrom ?? undefined,
      p_hour_to: donem.hourTo ?? undefined,
      p_sort_by: rule.sort_by || 'plays',
    })
    if (rpcErr) throw new Error(`get_top_tracks_for_rule RPC error: ${rpcErr.message}`)

    const trackIds = ((topRows as { track_id: string }[] | null) ?? []).map((r) => r.track_id)
    const { data: tracks } = trackIds.length
      ? await supabase.from('tracks').select('id, spotify_id').in('id', trackIds)
      : { data: [] }
    // RPC sırası korunur (en çok dinlenen önce).
    const spotifyById = new Map(((tracks as { id: string; spotify_id: string | null }[] | null) ?? []).map((t) => [t.id, t.spotify_id]))
    const spotifyIds = trackIds.map((id) => spotifyById.get(id)).filter((s): s is string => !!s)

    if (spotifyIds.length === 0) {
      // Dinleme yoksa üretilecek liste de yok: dönemi "boş" olarak kapat, tekrar denenmesin.
      await supabase.from('auto_playlist_runs').insert({
        rule_id: rule.id, platform: 'spotify', generated_playlist_id: null,
        track_count: 0, status: 'completed', donem: donem.anahtar, error_message: 'Bu dönemde dinleme yok',
      })
      return { ...temel, status: 'empty', trackCount: 0 }
    }

    const ad = donemAdi(rule.rule_type, donem, rule.name_format, dil)
    const playlistId = await createSpotifyPlaylist(rule.user_id, ad, 'Auto-generated by Rosso')
    await addTracksToSpotify(rule.user_id, playlistId, spotifyIds)

    await supabase.from('auto_playlist_runs').insert({
      rule_id: rule.id, platform: 'spotify', generated_playlist_id: playlistId,
      track_count: spotifyIds.length, status: 'completed', donem: donem.anahtar,
    })
    await supabase.from('auto_playlist_rules').update({ last_run_at: new Date().toISOString() }).eq('id', rule.id)

    return { ...temel, status: 'completed', playlistId, trackCount: spotifyIds.length }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[auto-playlist-generator] rule ${rule.id} donem ${donem.anahtar}:`, msg)
    try {
      await supabase.from('auto_playlist_runs').insert({
        rule_id: rule.id, platform: 'spotify', generated_playlist_id: null,
        track_count: 0, status: 'failed', donem: donem.anahtar, error_message: msg.slice(0, 500),
      })
    } catch {
      // ikincil kayıt hatası turu bozmaz
    }
    return { ...temel, status: 'failed', trackCount: 0, error: msg }
  }
}
