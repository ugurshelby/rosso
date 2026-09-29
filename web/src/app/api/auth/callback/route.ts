import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/auth/validation'

/**
 * Email doğrulama / şifre sıfırlama / magic link / OAuth callback handler.
 * İki biçimi destekler:
 *   • `code`  — PKCE: bağlantı YALNIZ isteğin yapıldığı tarayıcıda çalışır
 *     (doğrulayıcı çerez orada). Başka tarayıcı/cihazda ya da posta tarayıcısı
 *     bağlantıyı önceden açtıysa değişim başarısız olur.
 *   • `token_hash` + `type` — e-posta şablonu buna çevrilirse her tarayıcıda çalışır.
 *
 * ⚠ Başarısızlıkta kullanıcı hatayı GÖRMELİ: şifre sıfırlama (`next=/update-password`)
 * `/forgot-password?error=link_invalid`'e, diğerleri `/login?error=…`'e gider. (Oturumlu
 * bir kullanıcı /login'e düşerse eskiden sessizce dashboard'a atılıyordu.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeNextPath(searchParams.get('next'))
  const isRecovery = next.startsWith('/update-password') || type === 'recovery'

  const fail = (loginCode: string) =>
    NextResponse.redirect(
      isRecovery ? `${origin}/forgot-password?error=link_invalid` : `${origin}/login?error=${loginCode}`,
    )

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'recovery' | 'email' | 'signup' | 'magiclink' | 'invite' | 'email_change',
    })
    if (error) return fail('auth_failed')
    return NextResponse.redirect(`${origin}${isRecovery && !searchParams.get('next') ? '/update-password' : next}`)
  }

  if (!code) return fail('missing_code')

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return fail('auth_failed')

  return NextResponse.redirect(`${origin}${next}`)
}
