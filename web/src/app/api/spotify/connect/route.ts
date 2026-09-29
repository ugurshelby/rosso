import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getAppOrigin, oauthCookieOptions } from '@/lib/platform-auth'
import { resolveSpotifyClientId, deleteByocCredentials } from '@/lib/spotify/byoc'

const SPOTIFY_SCOPES = [
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  // 2026-08-05: Beğeni YAZMA (PUT|DELETE /v1/me/tracks) bu izni ister —
  // `user-library-read` yalnız OKUR. Bu satır olmadan her beğeni denemesi
  // 403 döner ve kullanıcı "Kaydedilemedi." görür (canlı ölçüldü: kalp
  // butonu hiç çalışmıyordu). Okuma izni yazmaya YETMEZ.
  'user-library-modify',
  'user-read-recently-played',
  // FAZ 6: Dev Mode allowlist'e eklenecek e-postayı öğrenmek için (B17 — ekleme
  // elle yapılır, ama hangi e-postanın ekleneceği artık tahmine kalmaz).
  'user-read-email',
  // 2026-07-25: Playlist ÖZEL KAPAK yükleme (PUT /playlists/{id}/images) bu
  // izni ister — playlist-modify yetmiyor, ayrı scope. Bunsuz kapak yükleme
  // 403 "Insufficient client scope" verir (canlı ölçüldü). Taşıma/otomatik
  // playlist özelliklerinin kapak basabilmesi için gerekli.
  'ugc-image-upload',
].join(' ')

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  /*
   * BYOC (2026-09-23): kullanıcının kendi doğrulanmış Spotify dev app'i
   * varsa yetkilendirme onun client_id'siyle başlar — sır bu adımda
   * gerekmiyor (yalnız /authorize URL parametresi). Yoksa paylaşılan
   * env'e düşülür. Bkz. lib/spotify/byoc.ts.
   */
  const clientId = await resolveSpotifyClientId(user.id)
  if (!clientId) {
    return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 })
  }

  const redirectUri = `${getAppOrigin()}/api/spotify/callback`
  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    // 2026-08-05: izin listesi büyüdüğünde (örn. `user-library-modify`)
    // kullanıcının onay ekranını GÖRMESİ şart. Bu parametre olmadan Spotify,
    // uygulamayı daha önce onaylamış kullanıcıyı ekranı göstermeden geri
    // çevirebilir — o durumda yeniden bağlanma "başarılı" görünür ama yeni
    // izin gelmez ve kalp butonu hâlâ 403 alır. Sessiz başarısızlık yerine
    // bir ek tıklama tercih edilir.
    show_dialog: 'true',
  })

  const res = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`,
    { status: 302 },
  )
  res.cookies.set('spotify_oauth_state', state, oauthCookieOptions('/'))
  return res
}

export async function DELETE(_req?: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('platform_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'spotify')
    if (error) throw error

    /*
     * BYOC (2026-09-23): bağlantı kesilince kayıtlı Client ID/Secret de
     * silinir — Sahibin kararı: sır, bağlantı yaşadığı sürece anlamlı;
     * kopunca tutmanın KVKK'da bir gerekçesi yok. Yeniden bağlanmak isteyen
     * kullanıcı kimlik bilgisini tekrar yapıştırır (arayüz tarafı: bkz.
     * docs/plans/spotify-byoc-canli-baglanti.md — yapıştırma alanı yalnız
     * bağlantı yokken açık).
     */
    await deleteByocCredentials(user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Disconnect failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
