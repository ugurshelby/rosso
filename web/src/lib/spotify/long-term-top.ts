import 'server-only'
import { getSpotifyToken } from '@/lib/playlists/spotify-target'
import { fetchWithRetry, RateLimitedError } from '@/lib/playlists/fetch-retry'

/**
 * L1 (yalnız OAuth) kullanıcısı için Spotify'ın kendi uzun-vade top listesi.
 *
 * §1.14-B: "L1 (yalnız Connection) kullanıcısı /taste'e girince: taste
 * bileşenleri kilitli-önizleme + üstünde GERÇEK Spotify uzun-vade (~1yıl)
 * top-artist/track + net 'bu kimlik değil, geçmişini yükle' çağrısı."
 *
 * ⚠ Taste/identity İDDİASI YOK — bu Spotify'ın kendi hesabı, Rosso'nun
 * decay/evergreen/tür motoruyla ilgisi yok. Yalnız "elde ne varsa o".
 *
 * Tekil (döngüsüz) istek — §4.2 dış API disiplini (cooldown/is_blocked)
 * yalnız DÖNGÜYLE istek atan koda uygulanır (kural-veritabani-islemleri.md
 * §1). `fetchWithRetry` yine de 429/5xx'e karşı korur.
 */

export interface LongTermTopTrack {
  id: string
  title: string
  artist: string
  imageUrl: string | null
}

export type LongTermTopResult =
  | { ok: true; tracks: LongTermTopTrack[] }
  | { ok: false; reason: 'no_token' | 'rate_limited' | 'failed' }

interface SpotifyTopTracksResponse {
  items?: Array<{
    id?: string
    name?: string
    artists?: Array<{ name?: string }>
    album?: { images?: Array<{ url?: string }> }
  }>
}

/** Spotify uzun-vade (~1 yıl) top track listesi — L1 önizleme için. */
export async function getLongTermTopTracks(
  userId: string,
  limit = 10,
): Promise<LongTermTopResult> {
  let token: string
  try {
    token = await getSpotifyToken(userId)
  } catch {
    return { ok: false, reason: 'no_token' }
  }

  try {
    const res = await fetchWithRetry(
      `https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return { ok: false, reason: 'failed' }

    const json = (await res.json()) as SpotifyTopTracksResponse
    const tracks: LongTermTopTrack[] = (json.items ?? [])
      .filter((item): item is Required<Pick<typeof item, 'id' | 'name'>> & typeof item =>
        Boolean(item.id && item.name),
      )
      .map((item) => ({
        id: item.id,
        title: item.name,
        artist: item.artists?.[0]?.name ?? '—',
        imageUrl: item.album?.images?.[0]?.url ?? null,
      }))

    return { ok: true, tracks }
  } catch (err) {
    if (err instanceof RateLimitedError) return { ok: false, reason: 'rate_limited' }
    return { ok: false, reason: 'failed' }
  }
}
