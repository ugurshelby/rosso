import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * FAZ 6 — Spotify Dev Mode kullanıcı kabulü.
 *
 * Değişmez kısıt (B16/B17): Spotify allowlist'e ekleme YALNIZ Dashboard'dan,
 * ELLE yapılır. API yok. Tavan: Client ID başına 5 kullanıcı.
 *
 * Bu modülün işi eklemeyi otomatikleştirmek DEĞİL (mümkün değil) — kör aramayı
 * bitirmek: kimin, hangi e-postayla ekleneceğini bilmek ve sonucu doğrulamak.
 *
 * Kritik ayrım: Spotify 403 ≠ 401. 403'te token sağlamdır, sorun izindir.
 * Bu yüzden 403'te bağlantı devre dışı bırakılmaz.
 */

export const SPOTIFY_DEV_MODE_LIMIT = 5

export interface SpotifyIdentity {
  spotifyUserId: string | null
  spotifyEmail: string | null
  /** true = /v1/me 403 döndü → kullanıcı allowlist dışı (kimliği öğrenemedik). */
  forbidden: boolean
}

/**
 * Spotify kimliğini çeker. Allowlist dışındaki kullanıcıda /v1/me'nin KENDİSİ de
 * 403 verebilir — o zaman e-postayı öğrenemeyiz; bunu yutmak yerine dürüstçe
 * `forbidden: true` deriz ve admin kişiye Rosso e-postasından ulaşır.
 */
export async function fetchSpotifyIdentity(accessToken: string): Promise<SpotifyIdentity> {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    })

    if (res.status === 403) {
      return { spotifyUserId: null, spotifyEmail: null, forbidden: true }
    }
    if (!res.ok) {
      void systemLog({
        operation: 'spotify_identity',
        platform: 'spotify',
        severity: 'warn',
        errorCode: `spotify_me_${res.status}`,
        errorMessage: `GET /v1/me başarısız: ${res.status}`,
      })
      return { spotifyUserId: null, spotifyEmail: null, forbidden: false }
    }

    const me = (await res.json()) as { id?: string; email?: string }
    return {
      spotifyUserId: me.id ?? null,
      spotifyEmail: me.email ?? null,
      forbidden: false,
    }
  } catch (err) {
    void systemLog({
      operation: 'spotify_identity',
      platform: 'spotify',
      severity: 'warn',
      errorCode: 'spotify_me_network',
      errorMessage: errMessage(err),
    })
    return { spotifyUserId: null, spotifyEmail: null, forbidden: false }
  }
}

/**
 * Bağlantı anında allowlist kaydını açar/günceller (Sahip kararı: 403'ü
 * beklemeden, her bağlantıda).
 *
 * - 403 aldıysak ya da kapasite doluysa → `pending` (admin eklemeli)
 * - /v1/me çalıştıysa → kullanıcı zaten allowlist'te demektir → `active`
 *
 * Zaten `approved`/`active` olan bir kaydı geri `pending`'e ÇEKMEYİZ; yalnız
 * kimlik alanlarını tazeleriz (admin'in emeğini silmeyelim).
 */
export async function recordSpotifyAccess(
  userId: string,
  identity: SpotifyIdentity,
  /**
   * BYOC (2026-09-23): allowlist, PAYLAŞILAN app'in 5 kişilik listesidir.
   * Kullanıcı kendi app'iyle bağlandıysa admin'in o listeye dair eski kararı
   * (`approved`/`rejected`) geçersizdir; /v1/me çalıştıysa kayıt `active`
   * olur. Yoksa eskiden reddedilmiş biri kendi app'iyle bağlansa bile saatlik
   * senkron onu `rejected` diye atlardı.
   */
  kaynak: 'shared' | 'byoc' = 'shared',
): Promise<void> {
  try {
    const supabase = await createServiceClient()

    const { data: existing } = await supabase
      .from('spotify_allowlist_requests')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle()

    const alreadyHandled =
      kaynak === 'shared' && (existing?.status === 'approved' || existing?.status === 'rejected')
    const nextStatus = alreadyHandled
      ? existing.status
      : identity.forbidden
        ? 'pending'
        : 'active'

    const { error } = await supabase.from('spotify_allowlist_requests').upsert(
      {
        user_id: userId,
        spotify_email: identity.spotifyEmail,
        spotify_user_id: identity.spotifyUserId,
        status: nextStatus,
        ...(nextStatus === 'active' && existing?.status !== 'active'
          ? { activated_at: new Date().toISOString() }
          : {}),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw error
  } catch (err) {
    // Allowlist kaydı yan-defterdir; tutulamazsa bağlantı yine de kurulmalı.
    // Ama sessizce yutmuyoruz (B19) — admin panelinde eksik kayıt görürsek
    // nedenini system_logs'ta bulacağız.
    void systemLog({
      operation: 'spotify_allowlist',
      userId,
      platform: 'spotify',
      severity: 'error',
      errorCode: 'allowlist_record_failed',
      errorMessage: errMessage(err),
    })
  }
}

/**
 * B17 — Bu kullanıcının Spotify e-postası KAYITLI mı?
 *
 * `pending` kullanıcıya e-posta formu gösterip göstermeyeceğimizi belirler.
 * Dolu ise sormayız (gereksiz sürtünme); boşsa Sahip hesabı Spotify
 * Dashboard'a ekleyemez, kullanıcı sırada kalır.
 *
 * ⚠ E-postanın KENDİSİ döndürülmez, yalnız var/yok. Değeri UI'a taşımak
 * gereksiz — form onu göstermiyor, sadece istiyor.
 */
export async function spotifyEpostasiBiliniyorMu(userId: string): Promise<boolean> {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('spotify_allowlist_requests')
      .select('spotify_email')
      .eq('user_id', userId)
      .maybeSingle()
    return Boolean(data?.spotify_email)
  } catch {
    // Okunamıyorsa formu GÖSTER (false dön): fazladan sormak, hiç sormayıp
    // kullanıcıyı sırada unutmaktan iyidir.
    return false
  }
}

/** Kullanıcının Spotify erişim durumu — ürün mesajı bunun üstüne kurulur (6.3). */
export type SpotifyAccessStatus = 'pending' | 'approved' | 'active' | 'rejected' | null

export async function getSpotifyAccessStatus(userId: string): Promise<SpotifyAccessStatus> {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('spotify_allowlist_requests')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle()
    return (data?.status as SpotifyAccessStatus) ?? null
  } catch (err) {
    void systemLog({
      operation: 'spotify_allowlist',
      userId,
      platform: 'spotify',
      severity: 'warn',
      errorCode: 'allowlist_status_failed',
      errorMessage: errMessage(err),
    })
    return null
  }
}
