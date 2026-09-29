import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { fetchWithRetry } from './fetch-retry'

/**
 * Spotify playlist oluşturma + şarkı ekleme çekirdeği.
 *
 * ★ Uç nokta sözleşmesi: `docs/reference/spotify-veri-ve-zip.md` §2
 *   "YAZMA İŞLEMLERİ". ⚠ Playlist uçları GÖVDE kullanır, `/me/library`
 *   SORGU DİZESİ — ikisi karıştırılırsa 400 döner.
 *
 * 2026-07-28 (plan 07): YT Music + Apple Music kaldırıldı → taşıma motoru
 * (eski src/lib/migration/engine.ts) silindi. Ama bu üç fonksiyon Spotify
 * playlist ÜRETİMİ için de gerekliydi (mood playlist, add-track, generate).
 * Buraya YT/Apple mantığı OLMADAN kurtarıldılar — Rosso saf Spotify.
 */

/** Kullanıcının Spotify access token'ı — süresi dolmuşsa yeniler, şifreyi çözer. */
export async function getSpotifyToken(userId: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('platform_connections')
    .select('is_active')
    .eq('user_id', userId)
    .eq('platform', 'spotify')
    .single()

  if (!data?.is_active) throw new Error('Spotify not connected')

  // ensureValidToken: süresi dolduysa YENİLER + şifreyi ÇÖZER (düz token döner).
  // (Eski engine.ts'te getUserTokens bu bug'ı 2026-07-11'de kapatmıştı — Spotify'a
  // şifreli token gidip 401 alınıyordu; ensureValidToken ikisini birden yapar.)
  const { ensureValidToken } = await import('@/lib/services/token-refresh')
  const token = await ensureValidToken(userId, 'spotify')
  if (!token) throw new Error('Spotify token alınamadı (yeniden bağlanma gerekebilir)')
  return token
}

/**
 * Spotify'da yeni playlist oluşturur (ve kütüphaneye ekler). Playlist id döner.
 *
 * KRİTİK (2026-07-09): /users/{uuid}/playlists DEĞİL /me/playlists — Supabase
 * UUID'si Spotify user id sanılınca 404 alınıyordu.
 *
 * ⚠ AYRI FOLLOW ÇAĞRISI YOK (2026-08-05 ölçümü). Eskiden `POST /me/playlists`
 * sonrası ayrıca "follow" ediliyordu, yoksa listenin Kitaplığım'da görünmediği
 * varsayılıyordu. Canlıda ölçüldü: oluşturma zaten kütüphaneye ekliyor —
 * `/me/library/contains` hemen `[true]` dönüyor ve liste `/me/playlists`'te
 * görünüyor. Fazladan follow çağrısı işe yaramadığı gibi **500** döndürüyor
 * (zaten üye olan listeye tekrar üye olunmuyor) ve log'u kirletiyordu.
 */
export async function createSpotifyPlaylist(
  userId: string,
  name: string,
  description?: string,
): Promise<string> {
  const desc = description?.trim().slice(0, 300) || undefined
  const token = await getSpotifyToken(userId)

  const res = await fetchWithRetry(`https://api.spotify.com/v1/me/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(desc ? { name, description: desc, public: false } : { name, public: false }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Spotify create playlist error: ${res.status} ${detail.slice(0, 200)}`)
  }
  const data = (await res.json()) as { id: string }

  return data.id
}

/**
 * Playlist kapak görseli yükler (P4.2 — Sahip: "kapak görseli de panelden
 * girilebilmeli").
 *
 * ⚠ Spotify sözleşmesi katı:
 *   - gövde **ham base64 JPEG** (data: öneki YOK, JSON değil)
 *   - `Content-Type: image/jpeg`
 *   - base64 sonrası **256 KB** üst sınır
 *   - `ugc-image-upload` scope'u ister — bu scope YOKSA 403 döner ve
 *     403'ün gövdesi sebebi söylemez (bkz. hafıza: "okuma izni yazmaya yetmez")
 *
 * 🔴 Hata YUTULUR, fırlatılmaz: kapak playlist'in kendisi değil, süsüdür.
 * Şarkılar eklenmişken "kapak olmadı" diye tüm işlemi başarısız saymak
 * kullanıcının emeğini çöpe atardı. Sonuç boolean olarak döner; çağıran
 * isterse kullanıcıya ayrıca söyler.
 */
export async function uploadSpotifyPlaylistCover(
  userId: string,
  playlistId: string,
  dataUri: string,
): Promise<boolean> {
  try {
    // "data:image/jpeg;base64,XXXX" → "XXXX"
    const base64 = dataUri.includes(',') ? dataUri.slice(dataUri.indexOf(',') + 1) : dataUri
    if (!base64 || base64.length > 256 * 1024) return false

    const token = await getSpotifyToken(userId)
    const res = await fetchWithRetry(
      `https://api.spotify.com/v1/playlists/${playlistId}/images`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'image/jpeg',
        },
        body: base64,
      },
    )
    return res.ok
  } catch {
    return false
  }
}

export interface AddTracksResult {
  /** Spotify'a GERÇEKTEN eklenen şarkı sayısı — eşleşme sayısı DEĞİL. */
  addedCount: number
  events: unknown[]
}

/**
 * Spotify track id'lerini playlist'e ekler, GERÇEK ekleme sonucunu döner.
 * (Eski addTracksToTarget'in Spotify dalı — "34/34 taşındı" yalanı bug'ı
 * 2026-07-13'te bu addedCount ile kapatılmıştı.)
 */
export async function addTracksToSpotify(
  userId: string,
  targetPlaylistId: string,
  trackIds: string[], // spotify track id'leri
): Promise<AddTracksResult> {
  const events: unknown[] = []
  const token = await getSpotifyToken(userId)
  if (!token) return { addedCount: 0, events }

  let addedCount = 0
  // Spotify: batch başına max 100.
  for (let i = 0; i < trackIds.length; i += 100) {
    const batch = trackIds.slice(i, i + 100)
    const uris = batch.map((id) => `spotify:track:${id}`)
    try {
      const res = await fetchWithRetry(`https://api.spotify.com/v1/playlists/${targetPlaylistId}/items`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris }),
      })
      if (res.ok) {
        addedCount += batch.length
      } else {
        events.push({ step: 'batch_failed', status: res.status, batchSize: batch.length })
        break
      }
    } catch (err) {
      events.push({ step: 'batch_exception', error: err instanceof Error ? err.message : String(err) })
      break
    }
  }
  return { addedCount, events }
}

export interface ReplaceTracksResult {
  ok: boolean
  trackCount: number
  error?: string
}

/**
 * Playlist'in TÜM içeriğini verilen şarkı listesiyle DEĞİŞTİRİR
 * (`PUT /playlists/{id}/tracks` — Spotify'ın "replace" uç noktası, `add`'in
 * aksine mevcut şarkıları önce siler, sonra yeni listeyi yazar).
 *
 * 2026-08-11 (Sahip: mood playlist'leri "senkron et" açıksa haftalık
 * güncellensin) için eklendi. `addTracksToSpotify`'dan FARKLI: o eklemeye
 * devam eder (birikir), bu tam bir "bugünkü hâl budur" anlık görüntüsü yazar
 * — haftalık senkron için doğru olan budur, eski hafta kalıntısı kalmamalı.
 *
 * ⚠ Spotify tek istekte max 100 URI kabul eder (`replace` dahil). 100'den
 * fazla şarkı — mood listeleri max 50, bugün için sorun değil ama gelecekte
 * büyürse ilk istek REPLACE, kalanlar ADD olmalı. Şimdilik 100 sınırı
 * içinde kalındığı varsayılıyor (mood_pkg limiti 50, `MOOD_TRACK_LIMIT`).
 */
export async function replaceTracksOnSpotify(
  userId: string,
  targetPlaylistId: string,
  trackIds: string[], // spotify track id'leri
): Promise<ReplaceTracksResult> {
  const token = await getSpotifyToken(userId)
  if (!token) return { ok: false, trackCount: 0, error: 'no_token' }

  if (trackIds.length > 100) {
    return { ok: false, trackCount: 0, error: 'too_many_tracks_for_single_replace' }
  }

  const uris = trackIds.map((id) => `spotify:track:${id}`)
  try {
    const res = await fetchWithRetry(
      `https://api.spotify.com/v1/playlists/${targetPlaylistId}/tracks`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris }),
      },
    )
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { ok: false, trackCount: 0, error: `${res.status} ${detail.slice(0, 160)}` }
    }
    return { ok: true, trackCount: trackIds.length }
  } catch (err) {
    return { ok: false, trackCount: 0, error: err instanceof Error ? err.message : String(err) }
  }
}
