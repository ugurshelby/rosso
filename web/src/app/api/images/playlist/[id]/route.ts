import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { cacheImageInBackground } from '@/lib/images/catalog-cache'
import { ZAMAN_ASIMI_VERI } from '@/lib/fetch/zaman-asimi'

/*
 * Rota süre sınırı (2026-08-21 refine).
 *
 * Vercel varsayılanı **300 saniye**. Bu rota dış API çağırıyor; oradaki
 * `AbortSignal.timeout` isteği keser ama rotanın KENDİSİ (yeniden denemeler,
 * DB yazımı, arka plan işi) hâlâ dakikalarca sürebilir. `maxDuration` ikinci
 * ve son sınır: kullanıcı sonsuz bekleyen bir istekle kalmaz, fonksiyon
 * boşuna faturalanmaz.
 *
 * Değer, fetch zaman aşımının ÜSTÜNDE seçildi ki normal yavaşlık burada
 * değil, kendi katmanında yakalansın ve hata mesajı anlamlı olsun.
 */
export const maxDuration = 30

/**
 * Playlist kapağı — runtime proxy + lazy cache (2026-07-05, genişletildi 2026-07-14).
 *
 * Önce `playlists.image_url` kontrol edilir — doluysa Spotify'a hiç gidilmez.
 * Boşsa Spotify'ın `/playlists/{id}/images`'ından canlı çekilir, arka planda
 * Storage'a kaydedilip `playlists.image_url` güncellenir (otorite:
 * gorsel-kalici-altyapi-oneri.md). Yalnızca Spotify playlist'leri desteklenir;
 * diğer platformlar (şimdilik) 404 → client fallback gösterir.
 * Sahiplik: playlist RLS ile user'a kısıtlı (createClient user-scoped).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response
  const user = oturum.user
  const { id: playlistId } = await params

  const supabase = await createClient()
  const { data: playlist } = await supabase
    .from('playlists')
    .select('platform, platform_id, image_url')
    .eq('id', playlistId)
    .single()

  if (!playlist?.platform_id || playlist.platform !== 'spotify') {
    return NextResponse.json({ error: 'Spotify playlist değil veya id yok' }, { status: 404 })
  }

  if (playlist.image_url) {
    return NextResponse.json(
      { images: [{ url: playlist.image_url, width: 640, height: 640 }] },
      { headers: { 'Cache-Control': 'public, max-age=86400, immutable' } },
    )
  }

  const token = await ensureValidToken(user.id, 'spotify')
  if (!token) {
    return NextResponse.json({ error: 'Spotify isn’t connected' }, { status: 400 })
  }

  // /playlists/{id}/images: sade endpoint, sadece kapak dizisini döner.
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.platform_id}/images`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(ZAMAN_ASIMI_VERI),
    },
  )

  if (!res.ok) {
    return NextResponse.json({ error: `Spotify HTTP ${res.status}` }, { status: 502 })
  }

  const images = (await res.json()) as Array<{ url: string; width: number | null; height: number | null }>

  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'No image' }, { status: 404 })
  }

  const bestImage = images[0]
  if (bestImage) {
    void cacheImageInBackground({
      table: 'playlists',
      rowId: playlistId,
      sourceUrl: bestImage.url,
    })
  }

  return NextResponse.json(
    { images },
    { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
  )
}
