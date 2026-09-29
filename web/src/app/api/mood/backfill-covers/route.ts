import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOODS, type MoodKey } from '@/lib/analytics/mood'
import { uploadMoodCoverToSpotify } from '@/lib/playlists/mood-cover-upload'

/**
 * Tek seferlik: kullanıcının Spotify'ındaki MEVCUT mood playlist'lerine geriye
 * dönük SVG kapak yükler (Sahip 2026-07-27: "geçmişte oluşturduğum mood
 * playlist'lerinde kapak yok, onlara da gelsin").
 *
 * Neden route (script değil): token'lar AES-256-GCM şifreli + refresh gerektiriyor
 * (getUserTokens/ensureValidToken, server-only). Bunları standalone Node script'te
 * yeniden üretmek riskli (§1.5: yanlış decrypt = 401, refresh'i bozmak = bağlantı
 * düşer). Route Next.js server context'inde çalışır → mevcut altyapı olduğu gibi.
 *
 * Eşleştirme: playlist ADI bir mood.title içeriyorsa o mood'un kapağı yüklenir.
 * "Rosso · Gecenin Üçü" ve "Gecenin Üçü" ikisi de yakalanır (eski önekli adlar).
 * Kapağı ZATEN olan (image_url dolu) veya mood olmayan playlist ATLANIR.
 */

/** Playlist adından moodKey çıkarır (ad mood.title içeriyor mu). */
function moodKeyFromName(name: string): MoodKey | null {
  const norm = name.toLocaleLowerCase('tr')
  for (const m of MOODS) {
    if (norm.includes(m.title.toLocaleLowerCase('tr'))) return m.key
  }
  return null
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Kullanıcının Spotify playlist'leri (platform_id = gerçek Spotify ID gerekli).
  const { data: playlists } = await supabase
    .from('playlists')
    .select('id, name, platform_id, image_url')
    .eq('user_id', user.id)
    .eq('platform', 'spotify')

  const results: Array<{ name: string; moodKey: MoodKey | null; outcome: string }> = []

  for (const p of playlists ?? []) {
    const moodKey = moodKeyFromName(p.name)
    if (!moodKey) { continue } // mood playlist'i değil — atla
    if (!p.platform_id) {
      results.push({ name: p.name, moodKey, outcome: 'skipped_no_spotify_id' })
      continue
    }
    // §1.6: her yükleme Spotify'a bir istek. Kullanıcının kendi az sayıda mood
    // playlist'i (≤5) olduğu için döngü küçük; yine de sıralı (paralel değil).
    const res = await uploadMoodCoverToSpotify(user.id, p.platform_id, moodKey)
    results.push({ name: p.name, moodKey, outcome: res.ok ? 'uploaded' : 'upload_failed' })
  }

  const uploaded = results.filter((r) => r.outcome === 'uploaded').length
  return NextResponse.json({ uploaded, total: results.length, results })
}
