import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response
  const user = oturum.user
  const { id } = await params
  const supabase = await createClient()

  const { data: playlist, error } = await supabase
    .from('playlists')
    .select(`
      id, name, platform, track_count, cover_url, description, synced_at,
      playlist_tracks (
        position,
        tracks (
          id, title, artist_name: artists, isrc, duration_ms, album
        )
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  return NextResponse.json({ playlist })
}
