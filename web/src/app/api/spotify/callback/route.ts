import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getAppOrigin, oauthCookieOptions } from '@/lib/platform-auth'
import { encrypt } from '@/lib/crypto/token-cipher'
import { triggerUserRefresh } from '@/lib/sync/trigger-refresh'
import { fetchSpotifyIdentity, recordSpotifyAccess } from '@/lib/spotify/allowlist'
import { spotifyKimlikCakismasi } from '@/lib/auth/spotify-kimlik'
import { ZAMAN_ASIMI_KIMLIK } from '@/lib/fetch/zaman-asimi'
import { resolveSpotifyClientCredentials } from '@/lib/spotify/byoc'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const origin = getAppOrigin()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/settings/platforms?error=spotify_denied`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings/platforms?error=spotify_invalid`)
  }

  const storedState = req.cookies.get('spotify_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${origin}/settings/platforms?error=spotify_state_mismatch`)
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  /*
   * BYOC (2026-09-23): /connect BU KULLANICI için hangi client_id ile
   * yetkilendirmeyi başlattıysa, token değişimi de AYNI çiftle yapılmalı —
   * Spotify `code`'u yalnız onu üreten app'e karşı doğrular. `state`'e
   * kullanıcı bilgisi gömmüyoruz; kullanıcı burada da oturumundan (session
   * cookie) bilinir, BYOC satırı yine ona göre okunur — iki uç bağımsız
   * sorgulasa da her zaman aynı sonucu üretir (tutarlılık için yeterli).
   */
  const credentials = await resolveSpotifyClientCredentials(user.id)
  if (!credentials) {
    return NextResponse.redirect(`${origin}/settings/platforms?error=spotify_config`)
  }
  const { clientId, clientSecret } = credentials

  /*
   * Dönüş sayfası (2026-09-23): BYOC sihirbazı `/data`'da yaşıyor —
   * başarı/hata durumunu orada göstermesi gerekiyor. Eskiden her şey
   * `/settings/platforms`'a dönüyordu; sihirbaz sonucu hiç göremezdi.
   * Paylaşılan app akışı değişmedi.
   */
  const donus = credentials.source === 'byoc' ? '/data' : '/settings/platforms'

  const redirectUri = `${origin}/api/spotify/callback`

  /*
   * ⚠ Zaman aşımı + try: bu uç kullanıcıyı DOĞRUDAN bekletiyor (Spotify'dan
   * dönüş anı). Korumasızken takılan bir istek Vercel varsayılanı olan
   * 300sn boyunca asılı kalır ve kullanıcı boş ekrana bakar.
   *
   * `try` şart: `AbortSignal.timeout` bir `TimeoutError` FIRLATIR; yakalanmazsa
   * kullanıcı yönlendirme yerine ham 500 hatası görürdü.
   */
  let tokenRes: Response
  try {
    tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(ZAMAN_ASIMI_KIMLIK),
    })
  } catch {
    return NextResponse.redirect(`${origin}${donus}?error=spotify_token_failed`)
  }

  if (!tokenRes.ok) {
    /*
     * BYOC hatası ayrıştırılır (2026-09-23). ⚠ Düzeltme: ilk yazımda "en olası
     * sebep eksik redirect URI" denmişti — YANLIŞ. Redirect URI app'e
     * kayıtlı değilse Spotify /authorize adımında kendi sayfasında
     * `INVALID_CLIENT: Invalid redirect URI` gösterip DURUR, buraya hiç
     * dönmez. Buraya ulaşıp token değişimi başarısız olan BYOC akışının
     * sebebi kayıtlı URI'nin bizim gönderdiğimizle birebir aynı olmaması
     * (sondaki `/`, http/https, www) ya da secret'ın OAuth sırasında
     * değişmiş olmasıdır — mesaj yine kullanıcıyı app ayarlarına yollar.
     */
    const hataKodu = credentials.source === 'byoc' ? 'spotify_byoc_redirect_uri' : 'spotify_token_failed'
    return NextResponse.redirect(`${origin}${donus}?error=${hataKodu}`)
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // FAZ 6: Spotify kimliğini şimdi öğren. Allowlist'e eklenecek e-posta,
  // kullanıcının Rosso e-postasından FARKLI olabilir — tahmine bırakmıyoruz.
  // Allowlist dışındaki kullanıcıda /v1/me'nin kendisi 403 verir; bunu da
  // dürüstçe kaydediyoruz (kimliği öğrenemedik, ama sorunu biliyoruz).
  const identity = await fetchSpotifyIdentity(tokens.access_token)

  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from('platform_connections')
    .upsert(
      {
        user_id: user.id,
        platform: 'spotify',
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        token_expires: expiresAt,
        is_active: true,
        connected_at: new Date().toISOString(),
        spotify_email: identity.spotifyEmail,
        spotify_user_id: identity.spotifyUserId,
        // 0341: refresh_token'ı ÜRETEN app — yenileme her zaman bununla
        // yapılır (bkz. lib/spotify/byoc.ts resolveSpotifyCredentialsForConnection).
        oauth_client_id: clientId,
      },
      { onConflict: 'user_id,platform' },
    )

  if (dbError) {
    return NextResponse.redirect(`${origin}${donus}?error=spotify_db`)
  }

  // FAZ 6: erişim kaydını aç. 403 aldıysak 'pending' (admin elle eklemeli),
  // /v1/me çalıştıysa kullanıcı zaten allowlist'te → 'active'.
  await recordSpotifyAccess(user.id, identity, credentials.source)

  /*
   * BACKEND TURU (2026-08-25) — aynı Spotify hesabı birden çok Rosso
   * kullanıcısına bağlandı mı?
   *
   * ⚠ Otomatik BİRLEŞTİRMİYORUZ. Hesap birleştirme geri alınamaz ve
   * yanlış birleştirme iki kullanıcının dinleme geçmişini kalıcı olarak
   * karıştırır — Rosso'nun tüm anlatısı *"senin hikâyen"* üstüne kurulu,
   * karışmış bir geçmiş ürünü anlamsız kılar. Çakışma ölçülür, `system_logs`'a
   * uyarı olarak düşer, birleştirme kararını insan verir.
   *
   * Fire-and-forget: kullanıcı bu kontrolü BEKLEMEZ; bağlantı akışı
   * gecikmemeli. Sonuç admin panelinde görünür.
   */
  if (identity.spotifyUserId) {
    void spotifyKimlikCakismasi(identity.spotifyUserId)
  }

  // FAZ 2: yeni bağlantı → recently-played + playlist'leri HEMEN çek (friend senaryosu).
  // Yeni üye verisinin cron saatini beklemesin. Fire-and-forget; debounce zaten yeni
  // bağlantıda tetiklenmez (damga henüz boş). Allowlist dışıysa çekecek veri yok.
  if (!identity.forbidden) {
    void triggerUserRefresh(user.id, 'both')
  }

  // 403 → boş sayfaya değil, dürüst mesaja yönlendir (6.3).
  const query = identity.forbidden ? 'error=spotify_pending_access' : 'connected=spotify'
  const res = NextResponse.redirect(`${origin}${donus}?${query}`)
  res.cookies.set('spotify_oauth_state', '', { ...oauthCookieOptions('/'), maxAge: 0 })
  return res
}
