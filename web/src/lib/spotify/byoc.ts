import 'server-only'
import { encrypt, decrypt } from '@/lib/crypto/token-cipher'
import { createServiceClient } from '@/lib/supabase/server'
import { serverEnv } from '@/lib/env.server'

/**
 * Spotify BYOC ("kendi dev app'ini getir") kimlik bilgisi çözümleme.
 *
 * ── Neden bu dosya var (2026-09-23, Sahibin kararı) ───────────────────
 * Spotify Development Mode uygulama başına 5 kullanıcı allowlist'iyle
 * sınırlı. Rosso'nun kendi paylaşılan dev app'i ÜRÜN olarak sunulmaz —
 * yalnız Sahibin kişisel kullanımı. Canlı senkron isteyen HER kullanıcı
 * kendi Spotify Developer app'ini kurar; bu, sınırı kullanıcı başına
 * sıfırlar (her kullanıcı kendi app'inin tek sahibi/kullanıcısı) ve
 * Spotify'ın ToS'unu hiç zorlamaz — çoklu-hesap yaklaşımının aksine.
 * Bkz. docs/plans/spotify-byoc-canli-baglanti.md
 *
 * ── `createServiceClient` NEDEN (0275/0340 ile aynı gerekçe) ─────────────
 * `client_secret` kolonunun SELECT yetkisi `authenticated`'dan geri
 * alındı (migration 0340) — RLS kendi satırını sınırlasa da kolon
 * seviyesinde ek bir defans katmanı. Bu dosya server-only ve userId'yi
 * çağıran taraftan alıp sorgusunu o kullanıcıyla sınırlıyor (token-refresh.ts
 * ile aynı desen).
 *
 * ── DOĞRULANMAMIŞ satır asla kullanılmaz ─────────────────────────────────
 * `verified_at` NULL ise (kullanıcı kimlik bilgisini girdi ama Spotify'a
 * karşı hiç test edilmedi/edilemedi) OAuth akışında bu satır YOK sayılır,
 * paylaşılan env'e (varsa) düşülür. Yanlış kopyalanmış bir sırla kullanıcı
 * sessizce kilitlenmesin.
 */

export interface SpotifyClientCredentials {
  clientId: string
  clientSecret: string
  /** UI ve hata mesajları için: bu kimlik bilgisi kullanıcının kendi app'i mi? */
  source: 'byoc' | 'shared'
}

/** Yalnız client_id — /connect'teki yetkilendirme yönlendirmesi için yeterli (sır gerekmez). */
export async function resolveSpotifyClientId(userId: string): Promise<string | null> {
  const byoc = await getVerifiedByocClientId(userId)
  if (byoc) return byoc
  return serverEnv.SPOTIFY_CLIENT_ID ?? null
}

/** client_id + çözülmüş client_secret — token değişimi/yenileme için. */
export async function resolveSpotifyClientCredentials(
  userId: string,
): Promise<SpotifyClientCredentials | null> {
  const byoc = await getVerifiedByocCredentials(userId)
  if (byoc) return { ...byoc, source: 'byoc' }

  const clientId = serverEnv.SPOTIFY_CLIENT_ID
  const clientSecret = serverEnv.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, source: 'shared' }
}

/**
 * MEVCUT bağlantının token'larını yenilemek için kimlik — `resolveSpotifyClientCredentials`
 * DEĞİL, çünkü o "yeni bir OAuth başlatırken hangi app" sorusunun cevabı.
 *
 * 🔴 Neden ayrı (2026-09-23, migration 0341): BYOC kaydı OAuth BİTMEDEN yazılıyor.
 * Paylaşılan app'le bağlı bir kullanıcı BYOC bilgisini girip OAuth'u yarıda
 * bırakırsa, elindeki refresh_token hâlâ paylaşılan app'e ait — BYOC kimliğiyle
 * yenilemek `invalid_client` döner ve senkron bağlantıyı düşürür. Refresh token'ı
 * ÜRETEN app'in kimliği kullanılmalı; o bilgi `platform_connections.oauth_client_id`.
 *
 *   NULL (0341 öncesi bağlantı) → paylaşılan (o zaman tek yol buydu)
 *   paylaşılan env id'si        → paylaşılan
 *   BYOC client_id'si            → BYOC (sır çözülerek)
 *   hiçbiri                      → null (kimlik silinmiş/değişmiş; yeniden bağlanmalı)
 */
export async function resolveSpotifyCredentialsForConnection(
  userId: string,
): Promise<SpotifyClientCredentials | null> {
  const service = await createServiceClient()
  const { data: conn } = await service
    .from('platform_connections')
    .select('oauth_client_id')
    .eq('user_id', userId)
    .eq('platform', 'spotify')
    .maybeSingle()

  const sharedId = serverEnv.SPOTIFY_CLIENT_ID
  const sharedSecret = serverEnv.SPOTIFY_CLIENT_SECRET
  const kurucu = conn?.oauth_client_id ?? null

  if (kurucu === null || kurucu === sharedId) {
    if (!sharedId || !sharedSecret) return null
    return { clientId: sharedId, clientSecret: sharedSecret, source: 'shared' }
  }

  const byoc = await getVerifiedByocCredentials(userId)
  if (byoc && byoc.clientId === kurucu) return { ...byoc, source: 'byoc' }
  return null
}

/**
 * Kullanıcının Spotify çağrılarının hangi app KOTASINA yazılacağı.
 *
 * Spotify kotası client_id başınadır. Kota kapısı (`api-gate`) ve ceza
 * damgası (`api_cooldowns`) bu anahtarla tutulur (migration 0342):
 *   paylaşılan app (NULL ya da env id) → 'spotify'           (eski anahtar)
 *   BYOC app                          → 'spotify@<client_id>'
 * Böylece bir kullanıcının app'i 429 yerse YALNIZ o app durur; diğer 999
 * kullanıcı ve Sahibin paylaşılan app'i etkilenmez.
 */
export async function spotifyAppAnahtari(userId: string): Promise<string> {
  const service = await createServiceClient()
  const { data: conn } = await service
    .from('platform_connections')
    .select('oauth_client_id')
    .eq('user_id', userId)
    .eq('platform', 'spotify')
    .maybeSingle()
  const kurucu = conn?.oauth_client_id ?? null
  if (kurucu === null || kurucu === serverEnv.SPOTIFY_CLIENT_ID) return 'spotify'
  return `spotify@${kurucu}`
}

/** 'spotify' + 'user' → 'spotify:user'; 'spotify@abc' + 'user' → 'spotify@abc:user'. */
export function spotifyKapsami(appAnahtari: string, tur: 'user' | 'catalog' | 'search'): string {
  return `${appAnahtari}:${tur}`
}

async function getVerifiedByocClientId(userId: string): Promise<string | null> {
  const service = await createServiceClient()
  const { data, error } = await service
    .from('spotify_byoc_credentials')
    .select('client_id, verified_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data || !data.verified_at) return null
  return data.client_id
}

async function getVerifiedByocCredentials(
  userId: string,
): Promise<{ clientId: string; clientSecret: string } | null> {
  const service = await createServiceClient()
  const { data, error } = await service
    .from('spotify_byoc_credentials')
    .select('client_id, client_secret, verified_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data || !data.verified_at) return null

  try {
    return { clientId: data.client_id, clientSecret: decrypt(data.client_secret) }
  } catch {
    // Şifre çözme başarısız (bozuk kayıt/anahtar sapması) — paylaşılana düş,
    // kullanıcı kilitlenmesin. Nadiren olması beklenir; sessizce yutuluyor
    // çünkü çağıran taraf zaten null'ı "shared'a düş" olarak yorumluyor.
    return null
  }
}

/**
 * Kullanıcının BYOC durumu — ayarlar arayüzü için (sır asla dönmez).
 */
export interface ByocStatus {
  configured: boolean
  verified: boolean
  /**
   * Aktif Spotify bağlantısı GERÇEKTEN bu BYOC app'iyle mi kuruldu (0341).
   * `verified` yetmez: kimlik doğrulanmış ama OAuth yarıda kalmış olabilir —
   * o durumda kullanıcı hâlâ paylaşılan app'le (ya da hiç) bağlı. Arayüzün
   * "BYOC bağlı" kilit kartını göstermesi için doğru sinyal bu.
   */
  active: boolean
  clientId: string | null
  verifiedAt: string | null
}

export async function getByocStatus(userId: string): Promise<ByocStatus> {
  const service = await createServiceClient()
  const [{ data }, { data: conn }] = await Promise.all([
    service
      .from('spotify_byoc_credentials')
      .select('client_id, verified_at')
      .eq('user_id', userId)
      .maybeSingle(),
    service
      .from('platform_connections')
      .select('is_active, oauth_client_id')
      .eq('user_id', userId)
      .eq('platform', 'spotify')
      .maybeSingle(),
  ])

  if (!data) {
    return { configured: false, verified: false, active: false, clientId: null, verifiedAt: null }
  }
  const verified = Boolean(data.verified_at)
  return {
    configured: true,
    verified,
    active: verified && Boolean(conn?.is_active) && conn?.oauth_client_id === data.client_id,
    clientId: data.client_id,
    verifiedAt: data.verified_at,
  }
}

/**
 * Kullanıcının girdiği Client ID/Secret'ı Spotify'a karşı DOĞRULAR
 * (client_credentials grant — yalnız çiftin gerçek/eşleşen olduğunu
 * kanıtlar, redirect URI'nin doğru girildiğini KANITLAMAZ; o ancak
 * gerçek /authorize→/callback turunda ortaya çıkar).
 *
 * Başarılıysa şifreleyip kaydeder ve `verified_at` doldurur.
 * Döndürdüğü hata kodları arayüzün kullanıcıya net bir şey söylemesi için.
 */
export type ByocKaydetSonucu =
  | { ok: true }
  | { ok: false; kod: 'gecersiz_bicim' | 'spotify_reddetti' | 'ag_hatasi' | 'db_hatasi' }

export async function verifyAndSaveByocCredentials(
  userId: string,
  clientIdInput: string,
  clientSecretInput: string,
): Promise<ByocKaydetSonucu> {
  const clientId = clientIdInput.trim()
  const clientSecret = clientSecretInput.trim()

  // Spotify Client ID/Secret 32 karakterlik hex dizeleridir — biçim ön
  // kontrolü, Spotify'a gitmeden önce bariz hatalı girdiyi eler.
  const HEX32 = /^[0-9a-f]{32}$/i
  if (!HEX32.test(clientId) || !HEX32.test(clientSecret)) {
    return { ok: false, kod: 'gecersiz_bicim' }
  }

  let res: Response
  try {
    res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return { ok: false, kod: 'ag_hatasi' }
  }

  if (!res.ok) {
    return { ok: false, kod: 'spotify_reddetti' }
  }

  const service = await createServiceClient()
  const { error } = await service.from('spotify_byoc_credentials').upsert(
    {
      user_id: userId,
      client_id: clientId,
      client_secret: encrypt(clientSecret),
      verified_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) return { ok: false, kod: 'db_hatasi' }

  return { ok: true }
}

export async function deleteByocCredentials(userId: string): Promise<void> {
  const service = await createServiceClient()
  await service.from('spotify_byoc_credentials').delete().eq('user_id', userId)
}
