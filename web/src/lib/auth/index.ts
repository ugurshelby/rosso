import 'server-only'

import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Mevcut oturum kullanıcısını döner, yoksa null.
 * Hata durumunda da null döner — çağıran taraf patlamaz.
 *
 * React cache() sarması (B2.2, 2026-07-18): supabase.auth.getUser() her
 * çağrıda Supabase Auth sunucusuna AĞ isteği atar (~100-300ms). Layout +
 * page + iç yardımcılar aynı istekte 2-3 kez çağırınca her sayfa gezinmesi
 * 1-2 gereksiz Auth gidiş-dönüşü ödüyordu. cache() aynı server-request
 * içinde sonucu tekilleştirir; istekler arası paylaşmaz (güvenlik değişmez).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
})

/**
 * **Server Component** içinde oturumu zorunlu kılar.
 * Oturum yoksa /login'e (isteğe bağlı `next` ile) yönlendirir.
 *
 * ⚠ **API rotalarında KULLANMA** — `apiAuth()` var (aşağıda). Buradaki
 * `redirect()` bir HTTP 307 üretir; `fetch()` yapan istemci JSON beklerken
 * HTML login sayfası alır, `res.json()` ayrıştırma hatası verir ve gerçek
 * sebep ("oturum yok") kaybolur. Ölçüldü 2026-08-22: 16 API rotası bu
 * durumdaydı.
 */
export async function requireAuth(next?: string): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    const target = next ? `/login?next=${encodeURIComponent(next)}` : '/login'
    redirect(target)
  }
  return user
}

/**
 * **Route Handler** içinde oturumu zorunlu kılar.
 *
 * `requireAuth`tan farkı: yönlendirmez, **401 JSON** döner. API tüketicisi
 * (fetch/mobil istemci) hatayı okuyabilsin diye.
 *
 * Desteklenen oturum kanalları:
 * 1. Web: Cookie tabanlı oturum (`getCurrentUser()`)
 * 2. Mobil / Harici: `Authorization: Bearer <token>` başlığı
 *
 * Kullanım:
 * ```ts
 * const oturum = await apiAuth()
 * if (!oturum.ok) return oturum.response
 * const user = oturum.user
 * ```
 *
 * Neden `{ok, ...}` birleşimi, neden throw değil: Route Handler'da atılan
 * hata Next tarafından 500'e çevrilir — 401 anlamı kaybolur. Çağıranın
 * yanıtı açıkça döndürmesi hem tip güvenli hem okunur.
 */
export async function apiAuth(): Promise<
  { ok: true; user: User } | { ok: false; response: Response }
> {
  const user = await getCurrentUser()
  if (user) {
    return { ok: true, user }
  }

  // Mobil istemci veya harici istek: Authorization: Bearer <token> kontrolü
  try {
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const supabase = await createServiceClient()
        const {
          data: { user: bearerUser },
        } = await supabase.auth.getUser(token)
        if (bearerUser) {
          return { ok: true, user: bearerUser }
        }
      }
    }
  } catch {
    // headers() çağrısı veya token doğrulama başarısız olursa 401'e düşer
  }

  return {
    ok: false,
    response: Response.json({ error: 'Giriş yapmalısın.' }, { status: 401 }),
  }
}

