import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { addTracksToSpotify } from '@/lib/playlists/spotify-target'

/**
 * Öneri bölümünden ("Sana göre buraya ait") bir şarkıyı playliste ekler
 * (Sahip 2026-07-27: "her şarkı için playliste ekle butonu — Rosso'da en alta,
 * arka planda Spotify'a").
 *
 * Akış (buton anında tetikler, cron yok):
 *   1. IDOR guard — playlist kullanıcıya ait mi?
 *   2. Rosso playlist_tracks'e EN ALTA ekle (max position + 1). Zaten varsa atla.
 *   3. Spotify'a ekle (playlist Spotify'sa + track'in spotify_id'si varsa),
 *      mevcut addTracksToTarget engine ile (rate-limit korumalı). İKİNCİL:
 *      Spotify başarısız olsa bile Rosso'ya eklendi — ok döner, uyarı taşır.
 */

const Schema = z.object({
  playlistId: z.string().uuid(),
  trackId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 422 })
  }
  const { playlistId, trackId } = parsed.data

  // 1) IDOR guard — playlist kullanıcının mı? + platform bilgisi.
  const { data: pl } = await supabase
    .from('playlists')
    .select('id, user_id, platform, platform_id')
    .eq('id', playlistId)
    .maybeSingle()
  if (!pl || pl.user_id !== user.id) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  // Track gerçekten var mı + spotify_id (Spotify'a eklemek için).
  const { data: track } = await supabase
    .from('tracks')
    .select('id, spotify_id')
    .eq('id', trackId)
    .maybeSingle()
  if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 })

  // 2) Rosso playlist_tracks'e EN ALTA ekle. Zaten varsa çift ekleme.
  const { data: existing } = await supabase
    .from('playlist_tracks')
    .select('track_id')
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId)
    .maybeSingle()

  let rossoAdded = false
  if (!existing) {
    // En alt pozisyon = mevcut max + 1 (boşsa 0).
    const { data: last } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextPos = (last?.position ?? -1) + 1

    const { error: insErr } = await supabase
      .from('playlist_tracks')
      .insert({ playlist_id: playlistId, track_id: trackId, position: nextPos })
    if (insErr) {
      return NextResponse.json({ error: 'Rosso playlist couldn’t be updated' }, { status: 500 })
    }
    rossoAdded = true
    // track_count'u gerçek satır sayısına eşitle (denormalize alan tutarlı kalsın).
    // İkincil: başarısız olsa bile playlist_tracks satırı yazıldı.
    const { count } = await supabase
      .from('playlist_tracks')
      .select('track_id', { count: 'exact', head: true })
      .eq('playlist_id', playlistId)
    if (typeof count === 'number') {
      await supabase.from('playlists').update({ track_count: count }).eq('id', playlistId)
    }
  }

  // 3) Spotify'a ekle (playlist Spotify'sa + spotify_id varsa) — anında.
  let spotifyAdded = false
  let spotifyNote: string | undefined
  if (pl.platform === 'spotify' && pl.platform_id && track.spotify_id) {
    try {
      const res = await addTracksToSpotify(user.id, pl.platform_id, [track.spotify_id])
      spotifyAdded = res.addedCount > 0
      if (!spotifyAdded) spotifyNote = 'Could not add to Spotify (you can try again)'
    } catch {
      spotifyNote = 'Could not add to Spotify (you can try again)'
    }
  } else if (pl.platform === 'spotify' && !track.spotify_id) {
    spotifyNote = 'This track has no Spotify match'
  }

  return NextResponse.json({
    ok: true,
    rossoAdded,
    alreadyPresent: !rossoAdded && !!existing,
    spotifyAdded,
    note: spotifyNote,
  })
}
