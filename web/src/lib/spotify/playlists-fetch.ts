import 'server-only'
import { pacedFetch } from '@/lib/spotify/api-gate'

/**
 * Spotify playlist listeleme + item pagination.
 * `worker/app/services/spotify_playlists.py`'nin TS portu
 * (01-yillik-kontrolsuz-calisma-plani.md devamı, 2026-09-16).
 */

const PLAYLISTS_URL = 'https://api.spotify.com/v1/me/playlists'

export class SpotifyHttpError extends Error {
  readonly status: number
  /** `Retry-After` başlığı (saniye) — 429 yanıtlarında api-gate'in cooldown süresini belirlemesi için. */
  readonly retryAfterSeconds: number | null
  constructor(status: number, message: string, retryAfterSeconds: number | null = null) {
    super(message)
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function retryAfterFromHeaders(res: Response): number | null {
  const raw = res.headers.get('retry-after')
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

interface SpotifyImage {
  url?: string
  width?: number | null
}

function largestImage(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null
  let best: SpotifyImage | null = null
  for (const im of images as SpotifyImage[]) {
    if (!im || typeof im !== 'object' || !im.url) continue
    if (!best || (im.width ?? 0) > (best.width ?? 0)) best = im
  }
  return best?.url ?? null
}

export interface RemotePlaylist {
  spotifyId: string
  name: string
  snapshotId: string | null
  trackCount: number
  coverUrl: string | null
  description: string | null
  ownerId: string | null
}

/** Kullanıcının tüm playlist'lerini döner (pagination dahil). */
export async function fetchUserPlaylists(accessToken: string): Promise<RemotePlaylist[]> {
  const headers = { Authorization: `Bearer ${accessToken}` }
  const results: RemotePlaylist[] = []
  let url: string | null = `${PLAYLISTS_URL}?limit=50`

  while (url) {
    const res = await pacedFetch(url, { headers })
    if (!res.ok) throw new SpotifyHttpError(res.status, `GET ${url} → ${res.status}`, retryAfterFromHeaders(res))
    const data = (await res.json()) as {
      items?: Array<Record<string, unknown>>
      next?: string | null
    }
    for (const item of data.items ?? []) {
      const tracksField = (item.tracks ?? {}) as { total?: number }
      const itemsField = (item.items ?? {}) as { total?: number }
      const trackCount = tracksField.total ?? itemsField.total ?? 0
      const owner = (item.owner ?? {}) as { id?: string }
      const description = typeof item.description === 'string' ? item.description.trim() : ''
      results.push({
        spotifyId: String(item.id ?? ''),
        name: String(item.name ?? ''),
        snapshotId: (item.snapshot_id as string) ?? null,
        trackCount,
        coverUrl: largestImage(item.images),
        description: description || null,
        ownerId: owner.id ?? null,
      })
    }
    url = data.next ?? null
  }

  return results
}

export interface RemotePlaylistItem {
  spotifyId: string
  isrc: string | null
  title: string
  artists: string[]
  position: number
  addedAt: string | null
}

/** Playlist'in tüm track'lerini pozisyon sırasıyla döner (pagination dahil). */
export async function fetchPlaylistItems(
  accessToken: string,
  playlistId: string,
): Promise<RemotePlaylistItem[]> {
  const headers = { Authorization: `Bearer ${accessToken}` }
  const results: RemotePlaylistItem[] = []
  let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`
  let position = 0

  while (url) {
    const res = await pacedFetch(url, { headers })
    if (!res.ok) throw new SpotifyHttpError(res.status, `GET ${url} → ${res.status}`, retryAfterFromHeaders(res))
    const data = (await res.json()) as {
      items?: Array<Record<string, unknown>>
      next?: string | null
    }
    for (const item of data.items ?? []) {
      // Spotify 2026 şeması: track objesi item["item"] altında; eski anahtar
      // (item["track"]) geriye dönük uyumluluk için fallback tutulur.
      const track = (item.item ?? item.track ?? {}) as Record<string, unknown>
      const trackId = track.id as string | undefined
      if (item.is_local || !trackId) continue
      const artistsRaw = (track.artists ?? []) as Array<{ name?: string }>
      const externalIds = (track.external_ids ?? {}) as { isrc?: string }
      results.push({
        spotifyId: trackId,
        isrc: externalIds.isrc ?? null,
        title: (track.name as string) ?? '',
        artists: artistsRaw.map((a) => a.name ?? ''),
        position,
        addedAt: (item.added_at as string) ?? null,
      })
      position += 1
    }
    url = data.next ?? null
  }

  return results
}
