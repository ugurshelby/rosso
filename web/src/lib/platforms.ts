import type { Platform } from '@rosso/shared-types'

/** Platform görsel konfigürasyonu — tek kaynak (design.md §5). */
export const platformConfig: Record<Platform, { color: string; label: string }> = {
  spotify: { color: 'var(--color-spotify)', label: 'Spotify' },
}

/**
 * Spotify'daki şarkı URL'si. `spotify_id` canlıda 11.656/11.679 dolu.
 */
export function getTrackSpotifyUrl(spotifyId: string | null | undefined): string | null {
  if (!spotifyId) return null
  return `https://open.spotify.com/track/${spotifyId}`
}

/**
 * Spotify'da sanatçı — ARAMA linki, doğrudan sanatçı sayfası değil.
 * Sebep: `tracks.spotify_artist_ids` canlıda 0/11679 dolu (hiç yok), yani
 * sanatçının Spotify id'si elimizde YOK. Uydurma id üretmek yerine adıyla
 * aratıyoruz — kullanıcı bir tık fazla atar ama yanlış sayfaya düşmez.
 */
export function getArtistSpotifySearchUrl(name: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(name)}/artists`
}

/** Platformdaki playlist URL'si — platform_id yoksa null. */
export function getPlaylistExternalUrl(
  platform: Platform,
  platformId: string | null | undefined,
): string | null {
  if (!platformId) return null

  switch (platform) {
    case 'spotify':
      return `https://open.spotify.com/playlist/${platformId}`
    default: {
      const _exhaustive: never = platform
      return _exhaustive
    }
  }
}
