import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@rosso/shared-types'
import {
  isClosedPersonalPath,
  isLoginOnlyPath,
  isProtectedPath,
} from '@/lib/auth/route-access'
import { safeNextPath } from '@/lib/auth/validation'

/**
 * Bu istekte Supabase oturum çerezi VAR MI? (ad'a bağlı olmayan kontrol)
 *
 * `@supabase/ssr` çerezi `sb-<project-ref>-auth-token` biçiminde adlandırır ve
 * büyük oturumları `...auth-token.0`, `.1` diye parçalara böler. Proje ref'ini
 * koda gömmek kırılgan olurdu (ortam değişince sessizce bozulur), bu yüzden
 * ÖNEK + ARA PARÇA eşleşmesi kullanılıyor.
 *
 * ⚠ Bu bir KİMLİK DOĞRULAMA DEĞİL — yalnız "sorulmaya değer mi" kapısı.
 * Çerez varsa gerçek doğrulama `auth.getClaims()` ile yapılır (aşağıda).
 * Sahte bir çerez bu kapıdan geçer ama imza doğrulamasına takılır; güvenlik
 * yüzeyi değişmez, yalnız gereksiz çağrı elenir.
 */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
}

/**
 * Middleware'in oturum turunu ATLADIĞI yollar (2026-09-24 performans denetimi).
 *
 * `/api/images/*` görsel proxy'si bir liste render'ında onlarca kez çağrılır.
 * HAR ölçümü: her çağrı İKİ Supabase Auth ağ turu ödüyordu — biri burada
 * (`getUser`, oturum yenileme), biri rotanın kendi `apiAuth()`'unda. Medyan
 * TTFB 250-470 ms'nin büyük kısmı buydu.
 *
 * Güvenlik yüzeyi DEĞİŞMEZ: bu yollar korumalı SAYFA değil (yönlendirme
 * kararı yok) ve rota kimliği `apiAuth()` ile TAM doğrular. Oturum yenileme
 * de kaybolmaz: rota içindeki sunucu istemcisi süresi dolan token'ı kendisi
 * yeniler ve çerezi yanıta yazar (Route Handler'da `cookies()` yazılabilir).
 * Görsel istekleri her zaman az önce yüklenmiş (yani oturumu yenilenmiş) bir
 * sayfadan gelir.
 *
 * Kural: docs/reference/kural-performans.md §3 — sıcak API yollarında auth
 * turu bir kez ödenir.
 */
const SESSION_REFRESH_SKIP_PREFIXES = ['/api/images/'] as const

export function skipsSessionRefresh(pathname: string): boolean {
  return SESSION_REFRESH_SKIP_PREFIXES.some((p) => pathname.startsWith(p))
}

/**
 * Her request'te session token'ını yeniler + auth korumalı sayfaları yönetir.
 *
 * @param requestHeaders CSP nonce'u taşıyan başlık kopyası (pipeline adım 0).
 *   `NextResponse.next({ request: { headers } })` bunu
 *   `x-middleware-request-*` olarak Next'e geçirir; Next nonce'u oradan
 *   okuyup kendi hydration script'lerine basar. Verilmezse nonce kaybolur
 *   ve tarayıcı script'leri bloklar (2026-07-08 hatasının tam mekanizması
 *   — bkz. `src/lib/security/csp.ts`).
 *
 *   Opsiyonel: testler ve doğrudan çağrılar nonce'suz çalışabilsin diye.
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers
) {
  // Tek yerde kurulur; aşağıdaki üç `NextResponse.next()` dalı da bunu kullanır.
  const nextInit = requestHeaders
    ? { request: { headers: requestHeaders } }
    : { request }
  // ── Kapıdaki güvenlik (Sahibin kararı, 2026-07-30; belge §0.1) ──────────
  // "Kapıdan geçene kimlik soramazsın, ancak otele girmek isteyene."
  //
  // Middleware `_next/static` dışındaki HER isteği yakalıyor: marketing
  // sayfaları, bloglar, botlar, robots.txt... 31 günde ~350 bin çağrı. Bunların
  // her biri `auth.getUser()` ile Supabase'e gidiyordu — oturumu OLMAYAN bir
  // ziyaretçi için sonucu baştan belli bir tur.
  //
  // Oturum çerezi yoksa kullanıcı da yoktur. O hâlde:
  //   • korumalı yol istiyorsa → doğrudan /login (Supabase'e sormaya gerek yok)
  //   • public yol istiyorsa   → dokunmadan geç
  //
  // ⚠ Çerez VARSA hiçbir şey değişmez; tam doğrulama eskisi gibi çalışır.
  if (skipsSessionRefresh(request.nextUrl.pathname)) {
    return NextResponse.next(nextInit)
  }

  if (!hasAuthCookie(request)) {
    if (
      isProtectedPath(request.nextUrl.pathname) ||
      isLoginOnlyPath(request.nextUrl.pathname)
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const returnTo = request.nextUrl.pathname + request.nextUrl.search
      if (isProtectedPath(request.nextUrl.pathname)) {
        url.searchParams.set('next', safeNextPath(returnTo))
      } else {
        url.search = ''
      }
      return NextResponse.redirect(url)
    }
    return NextResponse.next(nextInit)
  }

  let supabaseResponse = NextResponse.next(nextInit)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next(nextInit)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  /*
   * Oturumu yenile + kimliği doğrula — `getClaims()` (2026-09-25 performans).
   *
   * Eskiden `getUser()`: her istekte Supabase Auth sunucusuna AĞ turu
   * (~100-300 ms). Aynı istekte sayfa da `getCurrentUser()` → `getUser()`
   * çağırdığı için her gezinme İKİ Auth turu ödüyordu (HAR: belge TTFB
   * tabanı ~550 ms). Proje asimetrik JWT anahtarı kullanıyor (ES256,
   * `/auth/v1/.well-known/jwks.json` doğrulandı) → `getClaims()` imzayı
   * YEREL doğrular; JWKS modül düzeyinde 10 dk önbellekli.
   *
   * Güvenlik yüzeyi:
   *   • Süresi dolmuş token → `getSession()` refresh token ile yeniler,
   *     çerezleri `setAll` ile yazar (eski davranışla aynı).
   *   • Sahte/bozuk imza → `claims` null → korumalı yolda /login'e.
   *   • Sunucu tarafında iptal edilmiş oturum (her yerden çıkış, silinen
   *     hesap) JWT süresi dolana dek (≤1 sa) middleware'den GEÇER — ama
   *     sayfalar `requireAuth()` / API'ler `apiAuth()` ile `getUser()`
   *     yapmaya devam ediyor; veri yine de verilmez. Middleware'in işi
   *     yalnız yönlendirme ve oturum yenilemedir (Supabase'in güncel
   *     Next.js önerisi). Kural: docs/reference/kural-performans.md §3.
   */
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null

  // Auth gerektiren sayfalar — login değilse yönlendir (tek kaynak: route-access)
  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const returnTo = request.nextUrl.pathname + request.nextUrl.search
    url.searchParams.set('next', safeNextPath(returnTo))
    return NextResponse.redirect(url)
  }

  if (user && isClosedPersonalPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Login/register/eski marketing — oturumlu kullanıcı dashboard'a
  // ⚠ `?error=` varsa yönlendirme YOK: hata (ör. geçersiz sıfırlama bağlantısı) kullanıcıya
  // gösterilmeli; aksi hâlde oturumlu kullanıcı hatayı görmeden dashboard'a atılıyordu.
  const AUTH_ONLY_PATHS = ['/login', '/register']
  if (
    user &&
    !request.nextUrl.searchParams.has('error') &&
    (AUTH_ONLY_PATHS.includes(request.nextUrl.pathname) ||
      isLoginOnlyPath(request.nextUrl.pathname))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = safeNextPath(request.nextUrl.searchParams.get('next'))
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
