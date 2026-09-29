import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getSpotifyToken } from '@/lib/playlists/spotify-target'
import { fetchWithRetry, RateLimitedError } from '@/lib/playlists/fetch-retry'

/**
 * A5 — Beğen / beğeniden kaldır (Spotify Web API **YAZMA**).
 * Plan: docs/plans/02-zip-verisi-urune-baglama.md → P1
 *
 * ★ Uç nokta sözleşmesi: `docs/reference/spotify-veri-ve-zip.md` §2
 *   "YAZMA İŞLEMLERİ" — hangi işlem hangi uçtan, URI mi id mi, gövde mi
 *   sorgu dizesi mi. Buraya dokunmadan ÖNCE oku.
 *
 * ⚠ Bu, üründeki **tek dış-API-yazan kullanıcı aksiyonu**. CLAUDE.md §4.2'nin
 * dört kuralı burada istisnasız uygulanır:
 *
 *   1. İstekler arası **≥250ms geçit** — toplu işlemde (`setLikedBulk`).
 *   2. **429 → cooldown'ı DB'ye YAZ** (`cooldown_set` RPC'si).
 *   3. Tur başında **`is_blocked` kontrolü** — bloklu isek token bile alma.
 *   4. `Retry-After` okunamazsa **1 saat varsay** (sıfır = devre kesici ölür).
 *
 * Neden bu kadar dikkat: 2026-06-22'de Spotify 6,4 saatlik ceza verdi. Yazma
 * işlemleri okumadan daha pahalıdır — ceza yerken kullanıcının kalbi de
 * kaydedilmemiş olur.
 */

const PROVIDER = 'spotify'
/** §4.2: istekler arası minimum bekleme (~4 istek/sn). */
const GATE_MS = 250
/** Retry-After okunamazsa varsayılan ceza — SIFIR OLAMAZ. */
const FALLBACK_COOLDOWN_S = 3600

export type LikeResult =
  | { ok: true; liked: boolean }
  | { ok: false; reason: 'blocked'; retryAfterSeconds: number }
  // `scope_missing`: token'da `user-library-modify` yok → yeniden bağlanmalı.
  // `failed`'dan AYRI tutulur çünkü çözümü farklı: beklemek işe yaramaz,
  // kullanıcının Spotify'ı yeniden yetkilendirmesi gerekir.
  | { ok: false; reason: 'no_token' | 'not_found' | 'failed' | 'scope_missing'; status?: number }

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * §4.2 kural 3 — ortak Spotify havuzu bloklu mu?
 * Bloklu isek token bile almayız: her istek cezayı besler.
 */
async function isBlocked(): Promise<{ blocked: boolean; remaining: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cooldown_get', { p_provider: PROVIDER })
  if (error || !data) return { blocked: false, remaining: 0 }

  const row = (data as Array<{ blocked_until: string | null }>)[0]
  if (!row?.blocked_until) return { blocked: false, remaining: 0 }

  const until = new Date(row.blocked_until).getTime()
  const remaining = Math.max(0, Math.round((until - Date.now()) / 1000))
  return { blocked: remaining > 0, remaining }
}

/** §4.2 kural 2 + 4 — cezayı DB'ye yaz; süre bilinmiyorsa 1 saat. */
async function writeCooldown(retryAfterSeconds: number | null, reason: string): Promise<number> {
  const seconds = retryAfterSeconds && retryAfterSeconds > 0
    ? retryAfterSeconds
    : FALLBACK_COOLDOWN_S
  const until = new Date(Date.now() + seconds * 1000).toISOString()

  const supabase = await createClient()
  await supabase.rpc('cooldown_set', {
    p_provider: PROVIDER,
    p_blocked_until: until,
    p_reason: reason,
  })
  return seconds
}

/**
 * Tek şarkıyı beğen / beğeniden kaldır.
 *
 * Yerel `liked_songs_events`'e de olay yazılır — böylece A2/A4 anında
 * güncel olur ve bir sonraki ZIP'i beklemek gerekmez. Spotify çağrısı
 * başarısızsa yerel kayıt da YAZILMAZ: iki taraf ayrışmasın.
 */
export async function setTrackLiked(
  userId: string,
  spotifyTrackId: string,
  liked: boolean,
): Promise<LikeResult> {
  const gate = await isBlocked()
  if (gate.blocked) {
    return { ok: false, reason: 'blocked', retryAfterSeconds: gate.remaining }
  }

  const token = await getSpotifyToken(userId)
  if (!token) return { ok: false, reason: 'no_token' }

  try {
    // ⚠ `/me/library` — `/me/tracks` DEĞİL. Şubat 2026 Dev Mode değişikliğinde
    // tür-özel kütüphane uçlarının HEPSİ kaldırıldı (`/me/tracks`, `/me/albums`,
    // `/me/following`…) ve tek bir genel uçla değiştirildi. Eskisi 403 döner —
    // 2026-08-05'te canlıda ölçüldü, kalp butonu bu yüzden hiç çalışmıyordu.
    //
    // ⚠ İKİ fark birden, ikisi de ölçümle bulundu (2026-08-05):
    //   1. id DEĞİL **URI** alır (`spotify:track:...`)
    //   2. gövde DEĞİL **sorgu dizesi** (`?uris=`) — gövdeyle gönderince
    //      Spotify `400 Missing required field: uris` döner
    const res = await fetchWithRetry(
      `https://api.spotify.com/v1/me/library?uris=${encodeURIComponent(`spotify:track:${spotifyTrackId}`)}`,
      {
        method: liked ? 'PUT' : 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      },
    )

    if (!res.ok) {
      if (res.status === 404) return { ok: false, reason: 'not_found' }

      // ⚠ Kütüphane yazmada 403 = kullanıcının yetkilendirmesi eksik.
      // Beklemek veya tekrar denemek ASLA çözmez; yeniden bağlanmak gerekir.
      //
      // ⚠ Gövdeye BAKMIYORUZ — ÖLÇÜLDÜ (2026-08-05): Spotify bu uçta yalnız
      // `{"error":{"status":403,"message":"Forbidden"}}` döner, sebebi
      // söylemez. Gövdede 'scope' arayan bir ayrım hiç tetiklenmez.
      //
      // Olası sebepler, ikisi de aynı çözüme çıkar (yeniden bağlan / izin ver):
      //   · token'da `user-library-modify` yok — bu izin 2026-08-05'te
      //     eklendi, öncesinde alınan TÜM token'larda eksik
      //   · Dev Mode allowlist dışı hesap
      if (res.status === 403) {
        return { ok: false, reason: 'scope_missing', status: 403 }
      }
      return { ok: false, reason: 'failed', status: res.status }
    }

    await recordLikeEvent(userId, spotifyTrackId, liked)
    return { ok: true, liked }
  } catch (err) {
    if (err instanceof RateLimitedError) {
      const secs = await writeCooldown(
        Math.round(err.retryAfterMs / 1000),
        'like_write_429',
      )
      return { ok: false, reason: 'blocked', retryAfterSeconds: secs }
    }
    return { ok: false, reason: 'failed' }
  }
}

/**
 * Yerel olay kaydı — Spotify çağrısı BAŞARILI olduktan sonra.
 *
 * `liked_songs_events` bir olay tablosu: durum değil geçmiş tutar. Bu yüzden
 * güncelleme değil EKLEME yapılır; `user_liked_track_ids` son olayı okuyup
 * güncel durumu türetir (migration 0176).
 */
async function recordLikeEvent(
  userId: string,
  spotifyTrackId: string,
  liked: boolean,
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('liked_songs_events').insert({
    user_id: userId,
    spotify_uri: `spotify:track:${spotifyTrackId}`,
    event_type: liked ? 'liked' : 'unliked',
    occurred_at: new Date().toISOString(),
    platform: 'spotify',
  })
}

/**
 * Toplu beğeni — §4.2 kural 1: her istek arasında **250ms geçit**.
 *
 * Spotify `/me/library` tek çağrıda çok URI kabul eder; yine de 50'lik partiler
 * hâlinde ve aralarda bekleyerek gideriz. "50 kat artış masum bir değişiklikle
 * sessizce gelir" (§4.2) — bugün 3 şarkı olan liste yarın 300 olur.
 *
 * İlk 429'da DURUR: kalanları denemek cezayı büyütür.
 */
export async function setLikedBulk(
  userId: string,
  spotifyTrackIds: string[],
  liked: boolean,
): Promise<{ done: number; blocked: boolean; retryAfterSeconds?: number }> {
  const gate = await isBlocked()
  if (gate.blocked) return { done: 0, blocked: true, retryAfterSeconds: gate.remaining }

  const token = await getSpotifyToken(userId)
  if (!token) return { done: 0, blocked: false }

  let done = 0
  for (let i = 0; i < spotifyTrackIds.length; i += 50) {
    const batch = spotifyTrackIds.slice(i, i + 50)

    // §4.2 kural 1 — İLK partiden sonra her turda geçit.
    if (i > 0) await sleep(GATE_MS)

    try {
      // Sorgu dizesi, virgülle ayrılmış URI'ler (tekil çağrıyla aynı sözleşme).
      const uris = batch.map((id) => `spotify:track:${id}`).join(',')
      const res = await fetchWithRetry(
        `https://api.spotify.com/v1/me/library?uris=${encodeURIComponent(uris)}`,
        {
          method: liked ? 'PUT' : 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        },
      )
      if (!res.ok) break
      for (const id of batch) await recordLikeEvent(userId, id, liked)
      done += batch.length
    } catch (err) {
      if (err instanceof RateLimitedError) {
        const secs = await writeCooldown(
          Math.round(err.retryAfterMs / 1000),
          'like_write_bulk_429',
        )
        return { done, blocked: true, retryAfterSeconds: secs }
      }
      break
    }
  }

  return { done, blocked: false }
}
