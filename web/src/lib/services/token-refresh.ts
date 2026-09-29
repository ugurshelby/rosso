import 'server-only'
import { encrypt, decrypt } from '@/lib/crypto/token-cipher'
import { createServiceClient } from '@/lib/supabase/server'
import { ZAMAN_ASIMI_KIMLIK } from '@/lib/fetch/zaman-asimi'
import { resolveSpotifyCredentialsForConnection } from '@/lib/spotify/byoc'

/**
 * ⚠ NEDEN `createServiceClient` (2026-08-13, migration 0275):
 *
 * Bu dosya `platform_connections.access_token` / `refresh_token`
 * kolonlarını okuyan TEK yerdir. Migration 0275 o kolonların SELECT
 * yetkisini `authenticated` rolünden geri aldı (kullanıcı kendi şifreli
 * token'ını bile çekememeli — savunma katmanı).
 *
 * Dosya eskiden `createClient()` (SSR, kullanıcı bağlamı = `authenticated`
 * rolü) kullanıyordu; 0275 sonrası o yolla token okunamaz ve Spotify
 * yenileme SESSİZCE çalışmayı bırakırdı (`conn.access_token` undefined →
 * `return null` → kullanıcı "bağlı değilsin" görürdü).
 *
 * `service_role` RLS'i ve kolon yetkilerini bypass eder — token yenileme
 * zaten bir sistem işlemi, kullanıcı adına yapılan bir okuma değil.
 * Güvenlik yüzeyi genişlemiyor: bu dosya `server-only`, dışarıdan
 * çağrılamaz ve her fonksiyon `userId`'yi çağıran taraftan alıp
 * sorgusunu o kullanıcıyla sınırlıyor.
 */

// Refresh 5 dakika kala başlasın (ensureValidToken)
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000
// Dashboard layout: 10 dakika kala proaktif yenile
const LAYOUT_REFRESH_BUFFER_MS = 10 * 60 * 1000

// ─── Spotify refresh ─────────────────────────────────────────────────────────

async function refreshSpotifyToken(
  userId: string,
  encryptedRefreshToken: string,
): Promise<boolean> {
  const refreshToken = decrypt(encryptedRefreshToken)
  /*
   * BYOC (2026-09-23): bağlantı hangi app'in client_id'siyle KURULDUYSA
   * yenileme de AYNI çiftle yapılmalı — Spotify refresh_token'ı yalnızca
   * onu üreten app'e karşı kabul eder. `resolveSpotifyCredentialsForConnection`
   * bunu `platform_connections.oauth_client_id`'den okur (migration 0341) —
   * "BYOC kaydı var mı" değil, "bu bağlantı HANGİ app'le kuruldu" sorusu.
   * İlk sürüm BYOC kaydına bakıyordu; OAuth yarıda kalınca paylaşılan
   * app'in refresh_token'ı BYOC kimliğiyle denenip bağlantı düşerdi.
   */
  const credentials = await resolveSpotifyCredentialsForConnection(userId)
  if (!credentials) {
    return false
  }
  const { clientId, clientSecret } = credentials

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(ZAMAN_ASIMI_KIMLIK),
  })

  if (!res.ok) return false

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
  }

  const supabase = await createServiceClient()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  const newRefreshToken = data.refresh_token ? encrypt(data.refresh_token) : encryptedRefreshToken

  const { error } = await supabase
    .from('platform_connections')
    .update({
      access_token: encrypt(data.access_token),
      refresh_token: newRefreshToken,
      token_expires: expiresAt,
      is_active: true,
    })
    .eq('user_id', userId)
    .eq('platform', 'spotify')

  return !error
}

// ─── Public: ensure valid token ───────────────────────────────────────────────

// 2026-07-28 (plan 07): Rosso saf Spotify.
type Platform = 'spotify'

/**
 * Spotify token'ının geçerli olduğunu sağlar; süresi dolmak üzereyse refresh eder.
 * @returns Geçerli erişim token'ı (decrypted) veya null (bağlı değil / refresh başarısız).
 */
export async function ensureValidToken(
  userId: string,
  platform: Platform,
): Promise<string | null> {
  const supabase = await createServiceClient()
  const { data: conn } = await supabase
    .from('platform_connections')
    .select('access_token, refresh_token, token_expires, is_active')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single()

  if (!conn?.refresh_token) return null

  // Bağlantı pasife düşmüşse ama refresh_token varsa, canlandırmayı dene (Auto-Resurrect)
  if (!conn.is_active) {
    const ok = await refreshSpotifyToken(userId, conn.refresh_token)
    if (!ok) return null
    const { data: fresh } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single()
    return fresh?.access_token ? decrypt(fresh.access_token) : null
  }

  if (!conn.access_token) return null

  // Token süresi dolmak üzere mi?
  const needsRefresh =
    conn.token_expires
      ? new Date(conn.token_expires).getTime() - Date.now() < REFRESH_THRESHOLD_MS
      : false

  if (needsRefresh && conn.refresh_token) {
    const ok = await refreshSpotifyToken(userId, conn.refresh_token)
    if (!ok) return null

    // Re-fetch after refresh
    const { data: fresh } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single()

    return fresh?.access_token ? decrypt(fresh.access_token) : null
  }

  return decrypt(conn.access_token)
}

/**
 * Dashboard layout'tan çağrılır — token süresi dolmak üzereyse arka planda yeniler.
 * Bağlantı is_active=false kalmışsa ama refresh_token varsa otomatik canlandırır (Auto-Resurrect).
 */
export async function refreshPlatformTokensIfNeeded(userId: string): Promise<void> {
  const supabase = await createServiceClient()
  const { data: conn } = await supabase
    .from('platform_connections')
    .select('platform, refresh_token, token_expires, is_active')
    .eq('user_id', userId)
    .eq('platform', 'spotify')
    .maybeSingle()

  if (!conn?.refresh_token) return

  // 1. Pasife düşmüş bağlantıyı canlandır
  if (!conn.is_active) {
    await refreshSpotifyToken(userId, conn.refresh_token)
    return
  }

  // 2. Süresi dolmak üzere olan aktif bağlantıyı yenile
  if (!conn.token_expires) return
  const expiresAt = new Date(conn.token_expires).getTime()
  if (expiresAt - Date.now() > LAYOUT_REFRESH_BUFFER_MS) return

  await refreshSpotifyToken(userId, conn.refresh_token)
}
