import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response
  const user = oturum.user
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, platform, track_count, cover_url, synced_at, platform_id')
    .eq('user_id', user.id)
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'Failed to load playlists' }, { status: 500 })
  }

  return NextResponse.json({ playlists: data ?? [] })
}
