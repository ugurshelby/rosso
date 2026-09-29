import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'

export interface PeriodWithData {
  period_type: 'month' | 'year'
  period_label: string
  period_start: string
  period_end: string
}

export interface RecapGenerationSummary {
  userId: string
  recapsProcessed: number
  recapsWritten: number
  errors: string[]
}

/**
 * Checks if a period has ended.
 * Prevents premature recap generation for ongoing (current) months or years.
 */
export function isPeriodCompleted(periodEnd: string, now = new Date()): boolean {
  try {
    const end = new Date(`${periodEnd}T23:59:59Z`)
    return end < now
  } catch {
    return false
  }
}

function monthEndIso(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  const end = new Date(Date.UTC(ny, nm - 1, 1, 0, 0, 0, -1))
  return end.toISOString()
}

/**
 * Generates and freezes completed monthly and yearly recaps for a user.
 */
export async function generateUserRecaps(userId: string): Promise<RecapGenerationSummary> {
  const supabase = await createServiceClient()
  const summary: RecapGenerationSummary = {
    userId,
    recapsProcessed: 0,
    recapsWritten: 0,
    errors: [],
  }

  // 1. Discover periods with real play events
  const { data: periods, error: periodsErr } = await supabase.rpc('recap_periods_with_data', {
    p_user_id: userId,
  })

  if (periodsErr) {
    summary.errors.push(`recap_periods_with_data error: ${periodsErr.message}`)
    return summary
  }

  const completedPeriods = (periods as PeriodWithData[] | null)?.filter((p) =>
    isPeriodCompleted(p.period_end)
  ) ?? []

  for (const period of completedPeriods) {
    summary.recapsProcessed++
    try {
      const payload: Record<string, unknown> = {}

      // Card 1: Cover
      payload.cover = {
        issue_label: period.period_type === 'year' ? 'ANNUAL ARCHIVE' : 'MONTHLY ISSUE',
        period_label: period.period_label,
      }

      // Card 2: Manifesto
      const { data: summaryRows } = await supabase.rpc('recap_listening_summary', {
        p_user_id: userId,
        p_from: period.period_start,
        p_to: period.period_end,
      })
      const summaryRow = summaryRows?.[0]
      const totalMs = Number(summaryRow?.total_ms || 0)

      if (totalMs === 0) {
        continue // No listening data in this period
      }

      const { data: genreRows } = await supabase.rpc('recap_dominant_genre', {
        p_user_id: userId,
        p_from: period.period_start,
        p_to: period.period_end,
      })
      const genreRow = genreRows?.[0]

      const manifesto: Record<string, unknown> = {
        minutes: Math.floor(totalMs / 60000),
        tracks: Number(summaryRow?.total_tracks || 0),
        artists: Number(summaryRow?.total_artists || 0),
        dominant_genre: genreRow?.genre_name || null,
      }

      try {
        const { data: carRows } = await supabase.rpc('car_listening_summary', {
          p_user_id: userId,
          p_from: period.period_start,
          p_to: period.period_end,
        })
        const carRow = carRows?.[0]
        if (carRow && Number(carRow.session_count || 0) > 0) {
          manifesto.car_hours = Math.round(Number(carRow.total_hours || 0) * 10) / 10
          manifesto.car_sessions = Number(carRow.session_count)
        }
      } catch {
        // Optional car metric
      }

      payload.manifesto = manifesto

      // Card 3: Top Artists (5)
      const { data: topArtists } = await supabase.rpc('recap_top_artists', {
        p_user_id: userId,
        p_from: period.period_start,
        p_to: period.period_end,
        p_limit: 5,
      })

      if (topArtists && topArtists.length > 0) {
        const artistNames = topArtists.map((a: { artist_name: string }) => a.artist_name).filter(Boolean)
        const { data: artistImages } = await supabase
          .from('artists')
          .select('name, image_url')
          .in('name', artistNames)

        const imgMap = new Map((artistImages || []).map((img) => [img.name, img.image_url]))
        payload.top_artists = topArtists.map((a: { artist_name: string; play_count: number }) => ({
          name: a.artist_name,
          plays: Number(a.play_count || 0),
          image_url: imgMap.get(a.artist_name) || null,
        }))
      }

      // Card 4: Top Tracks (5)
      const { data: topTracks } = await supabase.rpc('recap_top_tracks', {
        p_user_id: userId,
        p_from: period.period_start,
        p_to: period.period_end,
        p_limit: 5,
      })

      if (topTracks && topTracks.length > 0) {
        const trackIds = topTracks.map((t: { track_id: string }) => t.track_id).filter(Boolean)
        const { data: trackImages } = await supabase
          .from('tracks')
          .select('id, image_url')
          .in('id', trackIds)

        const coverMap = new Map((trackImages || []).map((img) => [img.id, img.image_url]))
        payload.top_tracks = topTracks.map((t: { track_id: string; title: string; artist_name: string; play_count: number }) => ({
          title: t.title,
          artist: t.artist_name,
          plays: Number(t.play_count || 0),
          image_url: coverMap.get(t.track_id) || null,
        }))
      }

      // Card 5: Discovery Archive
      try {
        const { data: discoveryRows } = await supabase.rpc('recap_discovery_by_month', {
          p_user_id: userId,
          p_from: period.period_start,
          p_to: period.period_end,
        })
        if (discoveryRows && discoveryRows.length > 0 && discoveryRows[0].month_start) {
          const topDisc = discoveryRows[0]
          const discPayload: Record<string, unknown> = {
            month_start: topDisc.month_start,
            new_artists: Number(topDisc.new_artists || 0),
            new_tracks: Number(topDisc.new_tracks || 0),
          }

          const ayBas = `${topDisc.month_start}T00:00:00Z`
          const aySon = monthEndIso(topDisc.month_start)

          // Kartın iki 1:1 karesi: o ayın en çok çalınan şarkısı ve sanatçısı.
          // Kapak URL'leri katalogdan ayrıca çekilir — RPC'ler görsel döndürmez.
          // (worker/app/pipeline/recap_runner.py ile birebir aynı davranış.)
          //
          // Kendi try'ı var: görseller kartın ZORUNLU parçası değil. Dıştaki
          // try'a bırakılırsa tek bir görsel hatası kartı tamamen düşürür ve
          // keşif sayıları da kaybolur.
          try {
            const { data: discTrack } = await supabase.rpc('recap_top_tracks', {
              p_user_id: userId,
              p_from: ayBas,
              p_to: aySon,
              p_limit: 1,
            })
            if (discTrack?.[0]?.title) {
              let trackCover: string | null = null
              if (discTrack[0].track_id) {
                const { data: trackImg } = await supabase
                  .from('tracks')
                  .select('image_url')
                  .eq('id', discTrack[0].track_id)
                  .limit(1)
                  .maybeSingle()
                trackCover = trackImg?.image_url ?? null
              }
              if (!trackCover && discTrack[0].title) {
                const { data: fallbackTrackImg } = await supabase
                  .from('tracks')
                  .select('image_url')
                  .eq('title', discTrack[0].title)
                  .not('image_url', 'is', null)
                  .limit(1)
                  .maybeSingle()
                trackCover = fallbackTrackImg?.image_url ?? null
              }
              discPayload.top_track = {
                title: discTrack[0].title,
                artist: discTrack[0].artist_name,
                image_url: trackCover,
              }
            }

            const { data: discArtist } = await supabase.rpc('recap_top_artists', {
              p_user_id: userId,
              p_from: ayBas,
              p_to: aySon,
              p_limit: 1,
            })
            if (discArtist?.[0]?.artist_name) {
              const { data: artistImg } = await supabase
                .from('artists')
                .select('image_url')
                .eq('name', discArtist[0].artist_name)
                .limit(1)
                .maybeSingle()
              let artistCover = artistImg?.image_url ?? null
              if (!artistCover) {
                const { data: fallbackArtistImg } = await supabase
                  .from('artists')
                  .select('image_url')
                  .ilike('name', discArtist[0].artist_name)
                  .not('image_url', 'is', null)
                  .limit(1)
                  .maybeSingle()
                artistCover = fallbackArtistImg?.image_url ?? null
              }
              discPayload.top_artist = {
                name: discArtist[0].artist_name,
                image_url: artistCover,
              }
            }
          } catch {
            // Görseller alınamadı — sayılar yine basılır.
          }

          payload.discovery = discPayload
        }
      } catch {
        // Optional discovery card
      }

      // Card 6: Streak
      try {
        const { data: streakRows } = await supabase.rpc('recap_longest_streak', {
          p_user_id: userId,
          p_from: period.period_start,
          p_to: period.period_end,
        })
        if (streakRows?.[0] && Number(streakRows[0].streak_days || 0) >= 2) {
          payload.streak = {
            days: Number(streakRows[0].streak_days),
            start: streakRows[0].streak_start,
            end: streakRows[0].streak_end,
          }
        }
      } catch {
        // Optional streak card
      }

      // Card 7: Peak Day
      try {
        const { data: peakDayRows } = await supabase.rpc('recap_peak_day', {
          p_user_id: userId,
          p_from: period.period_start,
          p_to: period.period_end,
        })
        if (peakDayRows?.[0]?.day) {
          const head = peakDayRows[0]
          payload.peak_day = {
            day: head.day,
            minutes: Math.round(Number(head.total_ms || 0) / 60000),
            plays: Number(head.play_count || 0),
            tracks: peakDayRows
              .filter((r: { title: string }) => !!r.title)
              .map((r: { title: string; artist: string; plays: number; image_url: string }) => ({
                title: r.title,
                artist: r.artist,
                plays: Number(r.plays || 0),
                image_url: r.image_url || null,
              })),
          }
        }
      } catch {
        // Optional peak day card
      }

      // Card 8: Obsession
      try {
        const { data: obsessionRows } = await supabase.rpc('recap_obsession', {
          p_user_id: userId,
          p_from: period.period_start,
          p_to: period.period_end,
        })
        if (obsessionRows?.[0]?.title) {
          const obs = obsessionRows[0]
          payload.obsession = {
            title: obs.title,
            artist: obs.artist,
            plays: Number(obs.plays || 0),
            peak_window_plays: Number(obs.peak_window_plays || 0),
            peak_window_start: obs.peak_window_start,
            span_days: Number(obs.span_days || 0),
            hours: Number(obs.hours || 0),
          }
        }
      } catch {
        // Optional obsession card
      }

      // Extras: number_one, discovery_total vb.
      try {
        const extras: Record<string, unknown> = {}

        try {
          const { data: noRows } = await supabase.rpc('recap_number_one', {
            p_user_id: userId,
            p_from: period.period_start,
            p_to: period.period_end,
          })
          const no = noRows?.[0] as
            | {
                artist_name?: string | null
                artist_hours?: number | null
                artist_plays?: number
                artist_image_url?: string | null
                track_title?: string | null
                track_artist?: string | null
                track_hours?: number | null
                track_plays?: number
                track_image_url?: string | null
              }
            | undefined
          if (no && (no.artist_name || no.track_title)) {
            let trackImg = no.track_image_url ?? null
            let artistImg = no.artist_image_url ?? null

            if (!trackImg && no.track_title) {
              const { data: tImg } = await supabase
                .from('tracks')
                .select('image_url')
                .ilike('title', no.track_title)
                .not('image_url', 'is', null)
                .limit(1)
                .maybeSingle()
              trackImg = tImg?.image_url ?? null
            }

            if (!artistImg && no.artist_name) {
              const { data: aImg } = await supabase
                .from('artists')
                .select('image_url')
                .ilike('name', no.artist_name)
                .not('image_url', 'is', null)
                .limit(1)
                .maybeSingle()
              artistImg = aImg?.image_url ?? null
            }

            extras.number_one = {
              artist_name: no.artist_name,
              artist_hours: no.artist_hours != null ? Number(no.artist_hours) : null,
              artist_plays: Number(no.artist_plays || 0),
              artist_image_url: artistImg,
              track_title: no.track_title,
              track_artist: no.track_artist,
              track_hours: no.track_hours != null ? Number(no.track_hours) : null,
              track_plays: Number(no.track_plays || 0),
              track_image_url: trackImg,
            }
          }
        } catch {
          // Optional number_one extra
        }

        if (Object.keys(extras).length > 0) {
          payload.extras = extras
        }
      } catch {
        // Optional extras
      }

      // Upsert frozen recap
      const { error: upsertErr } = await supabase.rpc('upsert_recap_partial', {
        p_user_id: userId,
        p_period_type: period.period_type,
        p_period_label: period.period_label,
        p_period_start: period.period_start,
        p_period_end: period.period_end,
        p_payload: payload as never,
      })

      if (upsertErr) {
        summary.errors.push(`upsert_recap_partial ${period.period_label}: ${upsertErr.message}`)
      } else {
        summary.recapsWritten++
      }
    } catch (err) {
      summary.errors.push(`Period ${period.period_label}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return summary
}
