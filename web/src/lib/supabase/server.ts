import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@rosso/shared-types'

// Server Component ve API Route'larda kullanılır
// Cookie tabanlı session yönetimi (Kullanıcı yetkisi)
export async function createClient() {
  const cookieStore = await cookies()

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
