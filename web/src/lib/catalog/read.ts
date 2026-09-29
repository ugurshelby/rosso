import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'
import { normalizeArtistName } from '@/lib/catalog/normalize-artist-name'

/**
 * Katalog okuma katmanı — Track & Sanatçı detay sayfaları (migration 0068).
 *
 * ALBÜM YOK: canlı ölçüm (2026-07-11) tracks.album 0/11679, duration_ms 0/11679.
 * Albüm detay sayfası boş kabuk olurdu; albüm adları link de yapılmıyor.
 */

export type ArtistRelationshipArchetype =
  | 'core_pillar'
  | 'obsession_comet'
  | 'evergreen_anchor'
  | 'recent_discovery'
  | 'casual_explorer'

export interface TrackDetail {
  id: string
  title: string
  artists: string[]
  genres: string[]
  album: string | null
  imageUrl: string | null
  spotifyId: string | null
  playCount: number
  totalMinutes: number
  firstPlayed: string | null
  lastPlayed: string | null
  activeMonths: number
  playlistCount: number
  isTalisman: boolean
  skipRate: number
  circadianCentroid: string | null
  circadianTag: string | null
}

export type TimelineBucket = 'day' | 'week' | 'month' | 'quarter'

export interface TrackTimelinePoint {
  month: string
  plays: number
  /** Kova genişliği (adaptif, migration 0130). Eski RPC dönmezse 'month'. */
  bucket_type: TimelineBucket
}

export interface ArtistDetail {
  name: string
  genres: string[]
  imageUrl: string | null
  playCount: number
  totalMinutes: number
  trackCount: number
  firstPlayed: string | null
  lastPlayed: string | null
  activeMonths: number
  archetype: ArtistRelationshipArchetype
  archetypeLabel: string
  circadianPreference: string | null
}

export interface ArtistTopTrack {
  trackId: string
  title: string
  playCount: number
  minutes: number
  imageUrl?: string | null
}

export interface ArtistAlbumItem {
  name: string
  artist: string
  imageUrl: string | null
  trackCount: number
  userPlayCount: number
  userTotalMinutes: number
  completionRate: number
}

export interface AlbumTrackItem {
  id: string
  number: number
  title: string
  imageUrl?: string | null
  playCount: number
  minutes: number
  durationMs: number | null
  durationFormatted: string
  isTalisman: boolean
}

export interface AlbumDetail {
  name: string
  artist: string
  genres: string[]
  imageUrl: string | null
  releaseYear: number | null
  playCount: number
  totalMinutes: number
  trackCount: number
  firstPlayed: string | null
  lastPlayed: string | null
  completionRate: number
  dominantTrack: { id: string; title: string; playCount: number } | null
  deepCut: { id: string; title: string; playCount: number } | null
  tracks: AlbumTrackItem[]
}

export async function getTrackDetail(
  userId: string,
  trackId: string,
): Promise<TrackDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_track_detail', {
    p_user_id: userId,
    p_track_id: trackId,
  })

  if (error) {
    void systemLog({
      operation: 'track_detail',
      userId,
      severity: 'warn',
      errorCode: 'track_detail_failed',
      errorMessage: error.message,
      relatedId: trackId,
    })
    return null
  }

  const row = data?.[0]
  if (!row) return null

  // Fetch track metadata (album, image_url) from tracks table
  let trackMeta: { album: string | null; image_url: string | null } | null = null
  try {
    const { data } = await supabase
      .from('tracks')
      .select('album, image_url')
      .eq('id', trackId)
      .maybeSingle()
    trackMeta = data
  } catch {}

  // Fetch user play_events for skip and circadian analysis
  let playEvents: { played_at: string | null; skipped: boolean | null }[] | null = null
  try {
    const { data } = await supabase
      .from('play_events')
      .select('played_at, skipped')
      .eq('user_id', userId)
      .eq('track_id', trackId)
    playEvents = data
  } catch {}

  const events = playEvents ?? []
  const playCount = Number(row.play_count ?? 0)
  const skippedCount = events.filter((e) => e.skipped === true).length
  const skipRate = playCount > 0 ? Math.round((skippedCount / playCount) * 100) : 0
  const isTalisman = playCount >= 15 && skipRate <= 2

  // Circadian centroid
  let circadianCentroid: string | null = null
  let circadianTag: string | null = null
  if (events.length > 0) {
    let sinSum = 0
    let cosSum = 0
    let validDates = 0
    for (const ev of events) {
      if (!ev.played_at) continue
      const d = new Date(ev.played_at)
      const hours = d.getHours() + d.getMinutes() / 60
      const theta = (hours / 24) * 2 * Math.PI
      sinSum += Math.sin(theta)
      cosSum += Math.cos(theta)
      validDates++
    }
    if (validDates > 0) {
      let avgTheta = Math.atan2(sinSum / validDates, cosSum / validDates)
      if (avgTheta < 0) avgTheta += 2 * Math.PI
      const centroidDec = (avgTheta / (2 * Math.PI)) * 24
      const ch = Math.floor(centroidDec)
      const cm = Math.floor((centroidDec - ch) * 60)
      circadianCentroid = `${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}`
      if (centroidDec >= 22 || centroidDec < 5) {
        circadianTag = 'Nocturnal Pulse'
      } else if (centroidDec >= 5 && centroidDec < 11) {
        circadianTag = 'Morning Clarity'
      } else if (centroidDec >= 11 && centroidDec < 17) {
        circadianTag = 'Solar Apex'
      } else {
        circadianTag = 'Twilight Flow'
      }
    }
  }

  return {
    id: row.id,
    title: row.title,
    artists: row.artists ?? [],
    genres: row.genres ?? [],
    album: trackMeta?.album ?? null,
    imageUrl: trackMeta?.image_url ?? null,
    spotifyId: row.spotify_id,
    playCount,
    totalMinutes: Number(row.total_minutes ?? 0),
    firstPlayed: row.first_played,
    lastPlayed: row.last_played,
    activeMonths: Number(row.active_months ?? 0),
    playlistCount: Number(row.playlist_count ?? 0),
    isTalisman,
    skipRate,
    circadianCentroid,
    circadianTag,
  }
}

export async function getTrackTimeline(
  userId: string,
  trackId: string,
): Promise<TrackTimelinePoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_track_timeline', {
    p_user_id: userId,
    p_track_id: trackId,
  })
  if (error || !data) return []
  return data.map((r) => ({
    month: r.month,
    plays: Number(r.plays ?? 0),
    bucket_type: ((r as { bucket_type?: string }).bucket_type ?? 'month') as TimelineBucket,
  }))
}

export async function getArtistDetail(
  userId: string,
  name: string,
): Promise<ArtistDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_artist_detail', {
    p_user_id: userId,
    p_name: name,
  })

  if (error) {
    void systemLog({
      operation: 'artist_detail',
      userId,
      severity: 'warn',
      errorCode: 'artist_detail_failed',
      errorMessage: error.message,
    })
    return null
  }

  const row = data?.[0]
  if (!row || Number(row.play_count ?? 0) === 0) {
    // Fallback: check if artist exists in tracks as secondary/featured artist
    try {
      const { data: artistTracks } = await supabase
        .from('tracks')
        .select('id, artists, genres, image_url')
        .contains('artists', [name])
        .limit(30)

      if (!artistTracks || artistTracks.length === 0) return null

      const trackIds = artistTracks.map((t) => t.id)
      const { data: peFallback } = await supabase
        .from('play_events')
        .select('ms_played, played_at')
        .eq('user_id', userId)
        .in('track_id', trackIds)

      const plays = peFallback ?? []
      const playCount = plays.length
      const totalMinutes = Math.round(plays.reduce((acc, p) => acc + (p.ms_played || 0), 0) / 60000)
      const genres = Array.from(new Set(artistTracks.flatMap((t) => t.genres ?? [])))
      const imgTrack = artistTracks.find((t) => t.image_url)

      let firstPlayed: string | null = null
      let lastPlayed: string | null = null
      const monthSet = new Set<string>()
      for (const p of plays) {
        if (!firstPlayed || (p.played_at && p.played_at < firstPlayed)) firstPlayed = p.played_at
        if (!lastPlayed || (p.played_at && p.played_at > lastPlayed)) lastPlayed = p.played_at
        if (p.played_at) monthSet.add(p.played_at.slice(0, 7))
      }

      return {
        name,
        genres,
        imageUrl: imgTrack?.image_url ?? null,
        playCount,
        totalMinutes,
        trackCount: artistTracks.length,
        firstPlayed,
        lastPlayed,
        activeMonths: monthSet.size,
        archetype: 'casual_explorer',
        archetypeLabel: 'Müzik Kaşifi',
        circadianPreference: null,
      }
    } catch {
      return null
    }
  }

  const playCount = Number(row.play_count ?? 0)
  const activeMonths = Number(row.active_months ?? 0)
  const firstPlayed = row.first_played

  // Get artist avatar: canonical artists table first, fallback to tracks
  let artistImageUrl: string | null = null
  const { data: artistImgRow } = await supabase
    .from('artists')
    .select('image_url')
    .eq('name_normalized', normalizeArtistName(name))
    .maybeSingle()

  if (artistImgRow?.image_url) {
    artistImageUrl = artistImgRow.image_url
  } else {
    const { data: trkWithImg } = await supabase
      .from('tracks')
      .select('image_url')
      .contains('artists', [name])
      .not('image_url', 'is', null)
      .limit(1)
      .maybeSingle()
    artistImageUrl = trkWithImg?.image_url ?? null
  }

  // Derive relationship archetype
  let archetype: ArtistRelationshipArchetype = 'casual_explorer'
  let archetypeLabel = 'Müzik Kaşifi'

  const now = Date.now()
  const firstPlayedMs = firstPlayed ? new Date(firstPlayed).getTime() : now
  const daysSinceFirst = (now - firstPlayedMs) / (1000 * 60 * 60 * 24)

  if (activeMonths >= 12 && playCount >= 80) {
    archetype = 'core_pillar'
    archetypeLabel = 'Kök Sütun'
  } else if (activeMonths <= 3 && playCount >= 40) {
    archetype = 'obsession_comet'
    archetypeLabel = 'Tutku Kuyrukluyıldızı'
  } else if (activeMonths >= 6) {
    archetype = 'evergreen_anchor'
    archetypeLabel = 'Daimi Çapa'
  } else if (daysSinceFirst <= 90) {
    archetype = 'recent_discovery'
    archetypeLabel = 'Yeni Keşif'
  }

  return {
    name: row.name,
    genres: row.genres ?? [],
    imageUrl: artistImageUrl,
    playCount,
    totalMinutes: Number(row.total_minutes ?? 0),
    trackCount: Number(row.track_count ?? 0),
    firstPlayed: row.first_played,
    lastPlayed: row.last_played,
    activeMonths,
    archetype,
    archetypeLabel,
    circadianPreference: null,
  }
}

export async function getArtistTopTracks(
  userId: string,
  name: string,
  limit = 10,
): Promise<ArtistTopTrack[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_artist_top_tracks', {
    p_user_id: userId,
    p_name: name,
    p_limit: limit,
  })

  let list: ArtistTopTrack[] = []
  if (!error && data && data.length > 0) {
    list = data.map((r) => ({
      trackId: r.track_id,
      title: r.title,
      playCount: Number(r.play_count ?? 0),
      minutes: Number(r.minutes ?? 0),
    }))
  } else {
    // Fallback if RPC returned empty (e.g. featured/secondary artist)
    try {
      const { data: tracks } = await supabase
        .from('tracks')
        .select('id, title, image_url')
        .contains('artists', [name])
        .limit(50)

      if (tracks && tracks.length > 0) {
        const trackIds = tracks.map((t) => t.id)
        const { data: plays } = await supabase
          .from('play_events')
          .select('track_id, ms_played')
          .eq('user_id', userId)
          .in('track_id', trackIds)

        const map = new Map<string, { count: number; ms: number }>()
        for (const p of plays ?? []) {
          const cur = map.get(p.track_id) ?? { count: 0, ms: 0 }
          cur.count++
          cur.ms += p.ms_played || 0
          map.set(p.track_id, cur)
        }

        const res: ArtistTopTrack[] = []
        for (const t of tracks) {
          const st = map.get(t.id)
          if (st && st.count > 0) {
            res.push({
              trackId: t.id,
              title: t.title,
              playCount: st.count,
              minutes: Math.round(st.ms / 60000),
              imageUrl: t.image_url ?? null,
            })
          }
        }
        list = res.sort((a, b) => b.playCount - a.playCount).slice(0, limit)
      }
    } catch {
      list = []
    }
  }

  // Batch-fetch image_url for RPC tracks if missing
  const missingIds = list.filter((t) => !t.imageUrl && t.trackId).map((t) => t.trackId)
  if (missingIds.length > 0) {
    try {
      const { data: trkImgs } = await supabase
        .from('tracks')
        .select('id, image_url')
        .in('id', missingIds)
      if (trkImgs && trkImgs.length > 0) {
        const imgMap = new Map(trkImgs.map((t) => [t.id, t.image_url]))
        return list.map((t) => ({
          ...t,
          imageUrl: t.imageUrl || imgMap.get(t.trackId) || null,
        }))
      }
    } catch {
      // non-blocking
    }
  }

  return list
}

export async function getArtistAlbums(
  userId: string,
  name: string,
): Promise<ArtistAlbumItem[]> {
  const supabase = await createClient()
  try {
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, album, image_url')
      .contains('artists', [name])
      .not('album', 'is', null)

    if (error || !tracks || tracks.length === 0) return []

    const albumMap = new Map<string, { albumName: string; imageUrl: string | null; trackIds: string[] }>()
    for (const t of tracks) {
      if (!t.album) continue
      const existing = albumMap.get(t.album)
      if (existing) {
        existing.trackIds.push(t.id)
        if (!existing.imageUrl && t.image_url) existing.imageUrl = t.image_url
      } else {
        albumMap.set(t.album, { albumName: t.album, imageUrl: t.image_url ?? null, trackIds: [t.id] })
      }
    }

    const allTrackIds = tracks.map((t) => t.id)
    const { data: plays } = await supabase
      .from('play_events')
      .select('track_id, ms_played')
      .eq('user_id', userId)
      .in('track_id', allTrackIds)

    const playEventMap = new Map<string, { count: number; ms: number }>()
    for (const p of plays ?? []) {
      const cur = playEventMap.get(p.track_id) ?? { count: 0, ms: 0 }
      cur.count++
      cur.ms += p.ms_played || 0
      playEventMap.set(p.track_id, cur)
    }

    const result: ArtistAlbumItem[] = []
    for (const [albumName, info] of albumMap.entries()) {
      let albumPlays = 0
      let albumMs = 0
      let playedTracks = 0
      for (const tid of info.trackIds) {
        const p = playEventMap.get(tid)
        if (p && p.count > 0) {
          albumPlays += p.count
          albumMs += p.ms
          playedTracks++
        }
      }

      if (albumPlays > 0) {
        result.push({
          name: albumName,
          artist: name,
          imageUrl: info.imageUrl,
          trackCount: info.trackIds.length,
          userPlayCount: albumPlays,
          userTotalMinutes: Math.round(albumMs / 60000),
          completionRate: Math.round((playedTracks / info.trackIds.length) * 100),
        })
      }
    }

    return result.sort((a, b) => b.userPlayCount - a.userPlayCount)
  } catch {
    return []
  }
}

export async function getAlbumDetail(
  userId: string,
  albumName: string,
  artistName?: string,
): Promise<AlbumDetail | null> {
  const supabase = await createClient()
  try {
    let q = supabase
      .from('tracks')
      .select('id, title, artists, genres, album, image_url, duration_ms, release_year')
      .ilike('album', albumName)

    if (artistName) {
      q = q.contains('artists', [artistName])
    }

    const { data: albumTracks, error: trkErr } = await q
    if (trkErr || !albumTracks || albumTracks.length === 0) {
      return null
    }

    const artist = artistName ?? albumTracks[0].artists?.[0] ?? 'Various Artists'
    // İlk track'in kapağı boş olabilir (single/local track) — albümdeki İLK
    // DOLU görseli al, tıpkı `getArtistAlbums`'daki desen gibi (satır ~483).
    const imageUrl = albumTracks.find((t) => t.image_url)?.image_url ?? null
    const releaseYear = albumTracks[0].release_year ?? null
    const genres = Array.from(new Set(albumTracks.flatMap((t) => t.genres ?? [])))

    const trackIds = albumTracks.map((t) => t.id)
    const { data: plays } = await supabase
      .from('play_events')
      .select('track_id, ms_played, played_at, skipped')
      .eq('user_id', userId)
      .in('track_id', trackIds)

    const events = plays ?? []

    const playMap = new Map<
      string,
      { count: number; ms: number; skippedCount: number; first: string | null; last: string | null }
    >()
    trackIds.forEach((id) =>
      playMap.set(id, { count: 0, ms: 0, skippedCount: 0, first: null, last: null }),
    )

    let totalMs = 0
    let totalPlays = 0
    let firstPlayed: string | null = null
    let lastPlayed: string | null = null

    for (const ev of events) {
      totalPlays++
      totalMs += ev.ms_played || 0
      if (!firstPlayed || (ev.played_at && ev.played_at < firstPlayed)) firstPlayed = ev.played_at
      if (!lastPlayed || (ev.played_at && ev.played_at > lastPlayed)) lastPlayed = ev.played_at

      const stat = playMap.get(ev.track_id)
      if (stat) {
        stat.count++
        stat.ms += ev.ms_played || 0
        if (ev.skipped) stat.skippedCount++
        if (!stat.first || (ev.played_at && ev.played_at < stat.first)) stat.first = ev.played_at
        if (!stat.last || (ev.played_at && ev.played_at > stat.last)) stat.last = ev.played_at
      }
    }

    const playedTracksCount = Array.from(playMap.values()).filter((s) => s.count > 0).length
    const completionRate = Math.round((playedTracksCount / albumTracks.length) * 100)

    const tracksList: AlbumTrackItem[] = albumTracks.map((t, idx) => {
      const st = playMap.get(t.id) ?? { count: 0, ms: 0, skippedCount: 0, first: null, last: null }
      const mins = Math.round(st.ms / 60000)
      const isTalisman = st.count >= 15 && (st.skippedCount === 0 || st.skippedCount / st.count <= 0.03)
      const durationMs = t.duration_ms || 210000
      const dSec = Math.floor(durationMs / 1000)
      const dMin = Math.floor(dSec / 60)
      const dRem = dSec % 60
      const durationFormatted = `${dMin}:${String(dRem).padStart(2, '0')}`

      return {
        id: t.id,
        number: idx + 1,
        title: t.title,
        // Track'in kendi kapağı (sorguda zaten çekiliyordu, buraya hiç
        // atanmıyordu — UI'daki `t.imageUrl || albumImageUrl` fallback'i bu
        // yüzden hep boş bacağa düşüyordu, bkz. listening-stats.tsx).
        imageUrl: t.image_url ?? null,
        playCount: st.count,
        minutes: mins,
        durationMs: t.duration_ms,
        durationFormatted,
        isTalisman,
      }
    })

    const sortedByPlays = [...tracksList]
      .filter((t) => t.playCount > 0)
      .sort((a, b) => b.playCount - a.playCount)
    const dominantTrack = sortedByPlays[0]
      ? { id: sortedByPlays[0].id, title: sortedByPlays[0].title, playCount: sortedByPlays[0].playCount }
      : null

    const deepCandidate = sortedByPlays.find((t) => t.number > 4 && t.id !== dominantTrack?.id)
    const deepCut = deepCandidate
      ? { id: deepCandidate.id, title: deepCandidate.title, playCount: deepCandidate.playCount }
      : null

    return {
      name: albumName,
      artist,
      genres,
      imageUrl,
      releaseYear,
      playCount: totalPlays,
      totalMinutes: Math.round(totalMs / 60000),
      trackCount: albumTracks.length,
      firstPlayed,
      lastPlayed,
      completionRate,
      dominantTrack,
      deepCut,
      tracks: tracksList,
    }
  } catch (err) {
    void systemLog({
      operation: 'album_detail',
      userId,
      severity: 'warn',
      errorCode: 'album_detail_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
      relatedId: albumName,
    })
    return null
  }
}
