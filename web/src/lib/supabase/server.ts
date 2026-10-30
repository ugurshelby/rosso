import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import type { Database } from '@rosso/shared-types'

/** Supabase erişim token'ı biçimi: üç base64url parça, başlık `eyJ` ile başlar. */
const JWT_BICIMI = /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/

/**
 * Mobil istemcinin (PLAN 4.2, mimari M5) `Authorization: Bearer <access token>`
 * başlığı. YALNIZ oturum çerezi yokken ve token JWT biçimindeyken döner:
 * - Çerez varsa web oturumu kazanır (aynı istekte iki kimlik olmaz).
 * - Cron/worker rotaları da `Bearer <CRON_SECRET>` gönderir; JWT biçiminde
 *   olmayan değer kullanıcı token'ı sayılmaz, istemci eskisi gibi anonim kalır.
 * Tarayıcı `Authorization` başlığını kendiliğinden göndermez → CSRF yüzeyi yok.
 */
export async function bearerToken(
  cookieStore?: Awaited<ReturnType<typeof cookies>>,
): Promise<string | null> {
  try {
    const store = cookieStore ?? (await cookies())
    if (store.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))) {
      return null
    }
    const deger = (await headers()).get('authorization')
    if (!deger?.startsWith('Bearer ')) return null
    const token = deger.slice(7).trim()
    return JWT_BICIMI.test(token) ? token : null
  } catch {
    // İstek bağlamı dışında (build, test) başlık yok.
    return null
  }
}

/**
 * Bearer token'la kullanıcı istemcisi: PostgREST'e token gider (RLS kullanıcıya
 * göre işler), `auth.getUser()` / `auth.getClaims()` argümansız çağrıldığında
 * token'ı doğrular. Oturum saklamaz, yenilemez (yenileme mobilin işi).
 */
function bearerIstemcisi(token: string) {
  const istemci = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  )
  const getUser = istemci.auth.getUser.bind(istemci.auth)
  istemci.auth.getUser = (jwt?: string) => getUser(jwt ?? token)
  const getClaims = istemci.auth.getClaims.bind(istemci.auth)
  istemci.auth.getClaims = ((jwt?: string, ...rest: unknown[]) =>
    (getClaims as (...a: unknown[]) => ReturnType<typeof getClaims>)(jwt ?? token, ...rest)) as typeof getClaims
  return istemci
}

// Server Component ve API Route'larda kullanılır
// Cookie tabanlı session yönetimi (Kullanıcı yetkisi); çerez yoksa mobilin Bearer token'ı
export async function createClient() {
  const cookieStore = await cookies()
  const token = await bearerToken(cookieStore)
  if (token) return bearerIstemcisi(token)

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component'te cookie set edilemez — middleware halleder
          }
        },
      },
    }
  )
}

// Service role client — sadece server-side, tam yetki
// Platform token yazma, export işleme gibi admin işlemler için
export async function createServiceClient() {
  // DİKKAT: Burada SSR (cookie) kullanılmaz!
  // Eğer cookie eklenirse Supabase, service_role yetkisini kullanıcının
  // token'ı ile ezer (downgrade) ve RPC çağrılarında permission denied alırsın.
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
