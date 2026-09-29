import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAuthProvider, authProvidersEnabled, resolveAuthProviders } from '@/lib/auth/providers'
import { safeNextPath } from '@/lib/auth/validation'
import { getAppOrigin } from '@/lib/platform-auth'

/**
 * OAuth giriş başlatma ucu — FAZ KİMLİK-V2 (2026-08-13).
 *
 * `GET /api/auth/oauth/google?next=/dashboard`
 *   → Supabase'in sağlayıcı yetkilendirme URL'ine 302
 *   → sağlayıcı `/api/auth/callback?code=…` adresine döner (mevcut uç)
 *
 * ─── Neden sunucu tarafında bir uç, doğrudan istemci çağrısı değil ──────
 * `supabase.auth.signInWithOAuth()` istemciden de çağrılabilirdi. Sunucu
 * ucu tercih edildi çünkü:
 *
 * • **`redirectTo` doğrulaması burada yapılır.** İstemci tarafında
 *   üretilen bir `redirectTo` kullanıcı tarafından değiştirilebilir;
 *   açık yönlendirme (open redirect) riski doğar. Burada `next`
 *   `safeNextPath` süzgecinden geçiyor (aynı-origin göreli yol şartı).
 *
 * • **Sağlayıcı kimliği beyaz listeden geçer.** `[provider]` bir URL
 *   parçası; doğrulanmazsa Supabase'e rastgele bir sağlayıcı adı
 *   iletilir ve hata mesajı sızdırabilir.
 *
 * • **Bayrak kapalıyken akış hiç başlamaz** — Supabase panelinde
 *   sağlayıcı açık değilse kullanıcı anlamsız bir hata sayfası yerine
 *   login'e anlaşılır bir mesajla döner.
 *
 * ⚠ PKCE + state üretimi Supabase SSR istemcisinin kendi işi; burada
 * elle state üretmiyoruz (Spotify **veri bağlantısı** akışından farkı
 * bu — orada state'i biz üretip çereze yazıyoruz çünkü Supabase o akışın
 * parçası değil).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
): Promise<NextResponse> {
  const origin = getAppOrigin()
  const { provider } = await params

  if (!authProvidersEnabled(process.env.NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED)) {
    return NextResponse.redirect(`${origin}/login?error=provider_disabled`)
  }

  if (!isAuthProvider(provider)) {
    // ⚠ Sağlayıcı adını hata mesajına KOYMUYORUZ — yansıtılan girdi
    // (reflected input) küçük de olsa bir yüzeydir.
    return NextResponse.redirect(`${origin}/login?error=unknown_provider`)
  }

  /*
   * Sağlayıcı BAŞINA kontrol (KİMLİK-V2.1, 2026-08-14).
   *
   * ⚠ Ana şalter tek başına yetmiyor: Apple düğmesi arayüzde pasif
   * gösteriliyor (hesap yok) ama bu ucu koruyan bir şey yoktu — adresi
   * elle yazan biri Supabase'e ulaşır ve ham "Unsupported provider"
   * hatasını görürdü. Arayüzdeki kilit, sunucudaki kilidin yerine geçmez.
   */
  const ready = resolveAuthProviders({
    master: process.env.NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED,
    google: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED,
    spotify: process.env.NEXT_PUBLIC_AUTH_SPOTIFY_ENABLED,
    apple: process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED,
  }).find((p) => p.id === provider)?.ready

  if (!ready) {
    return NextResponse.redirect(`${origin}/login?error=provider_disabled`)
  }

  // Açık yönlendirme koruması: yalnız aynı-origin göreli yol.
  const next = safeNextPath(request.nextUrl.searchParams.get('next'))

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Sağlayıcı buraya döner; `callback` kodu oturuma çevirir.
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data?.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth_start_failed`)
  }

  return NextResponse.redirect(data.url, { status: 302 })
}
