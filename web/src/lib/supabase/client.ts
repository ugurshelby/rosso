import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@rosso/shared-types'

// Browser (client component) tarafında kullanılır
// NEXT_PUBLIC_ prefix'li key'ler client'a açık
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * "Beni hatırla" KAPALIYKEN oturum çerezlerini kalıcılıktan çıkarır
 * (FAZ KİMLİK-V2.1, 2026-08-14).
 *
 * ─── Neden `cookieOptions` ile YAPILAMADI (ölçüldü) ─────────────────────
 * İlk yaklaşım `createBrowserClient(..., { cookieOptions: { maxAge } })`
 * idi. Kütüphane kaynağı okundu — **çalışmıyor**:
 *
 *   // @supabase/ssr/dist/main/cookies.js:202
 *   const setCookieOptions = {
 *     ...DEFAULT_COOKIE_OPTIONS,
 *     ...options?.cookieOptions,
 *     maxAge: DEFAULT_COOKIE_OPTIONS.maxAge,   // ← bizimkini EZİYOR
 *   }
 *
 * Verdiğimiz `maxAge` spread ediliyor, hemen ardından 400 güne geri
 * yazılıyor. Yani seçenek sessizce yok sayılırdı ve kutu sahte bir söz
 * olurdu. (Ders: kütüphane seçeneği "kabul ediliyor" görünmesi, etkili
 * olduğu anlamına gelmez — kaynağa bakıldı.)
 *
 * ─── Çalışan yol ────────────────────────────────────────────────────────
 * Giriş başarılı olduktan SONRA, kütüphanenin yazdığı auth çerezlerini
 * `Max-Age`/`Expires` olmadan yeniden yazıyoruz. Ömrü olmayan çerez bir
 * **oturum çerezi**dir; tarayıcı kapanınca silinir. Değer aynı kaldığı
 * için sunucu tarafı hiç etkilenmez — aynı çerezi aynı şekilde okur.
 *
 * ⚠ Mutlak bir garanti değil: "kaldığın yerden devam et" ayarı açık
 * tarayıcılar oturum çerezlerini geri getirebilir. Ortak bilgisayarda
 * gerçek koruma **çıkış yapmaktır**; bu bir kolaylık ayarı, güvenlik
 * sözü değil. Bu yüzden arayüzde de "güvenli" gibi bir iddia yok.
 */
export function makeAuthCookiesSessionOnly() {
  if (typeof document === 'undefined') return

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''

  for (const raw of document.cookie.split(';')) {
    const eq = raw.indexOf('=')
    if (eq < 1) continue

    const name = raw.slice(0, eq).trim()
    // Supabase auth çerezleri `sb-` önekli (parçalıysa `.0`, `.1` ekli).
    if (!name.startsWith('sb-')) continue

    const value = raw.slice(eq + 1).trim()
    // `Max-Age`/`Expires` YOK → oturum çerezi. Path/SameSite korunur.
    document.cookie = `${name}=${value}; path=/; SameSite=Lax${secure}`
  }
}
