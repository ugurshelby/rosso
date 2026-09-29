import 'server-only'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

/**
 * Güvenilir app origin. NEXT_PUBLIC_APP_URL env yoksa
 * dev'de 127.0.0.1:3847, production'da hata fırlatır.
 */
export function getAppOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (url) return url.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'development') return 'http://127.0.0.1:3847'
  throw new Error('NEXT_PUBLIC_APP_URL env is required in production')
}

/**
 * Env'e göre OAuth state cookie options üretir.
 * Production: sameSite none + secure (cross-origin redirect sonrası cookie korunur)
 * Dev: lax + insecure
 */
export function oauthCookieOptions(path: string): Partial<ResponseCookie> {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 600,
    path,
  }
}

/*
 * ⚠ Buradaki `refreshSpotifyToken` KALDIRILDI (2026-09-23, BYOC denetimi).
 * Hiçbir yerden çağrılmıyordu ve yenilemeyi her zaman PAYLAŞILAN app'le
 * yapıyordu — BYOC kullanıcısının refresh_token'ı ona karşı geçersizdir.
 * Tek doğru yol: `@/lib/services/token-refresh` (`ensureValidToken`), o da
 * kimliği `resolveSpotifyCredentialsForConnection`'dan alır.
 */
