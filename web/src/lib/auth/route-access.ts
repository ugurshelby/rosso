/**
 * Korumalı (auth gerektiren) dashboard rotaları — tek kaynak.
 * Auth (`/login`, `/register` vb.) ve yasal metin (`/privacy`, `/help`) public.
 * Landing, fiyat, blog login'e düşer.
 */
export const PROTECTED_PATHS = [
  '/dashboard',
  '/recap',
  '/journey',
  '/gecmis',
  '/mood',
  '/taste',
  '/playlists',
  '/migrate',
  '/settings',
] as const

/** Çok kullanıcılı mimaride sosyal yüzeyler artık kapalı değil. */
export const CLOSED_PERSONAL_PREFIXES = [] as const

/** Oturumsuz ziyaretçiyi login'e alan eski marketing yolları. */
export const LOGIN_ONLY_PREFIXES = ['/pricing', '/blog'] as const

/** Verilen path korumalı bir alt-ağaca mı düşüyor? */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export function isClosedPersonalPath(pathname: string): boolean {
  return CLOSED_PERSONAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export function isLoginOnlyPath(pathname: string): boolean {
  // /pricing, /blog ve / artık marketing sayfalarını gösterdiği için giriş yapılmasını GEREKTİRMEZ
  return false
}
