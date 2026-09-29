'use client'

import { PlaylistLibrary } from './playlist-library'
import type { PlaylistCardData } from './playlist-card'
import type { Platform } from '@rosso/shared-types'

interface PlaylistWorkspaceProps {
  playlists: PlaylistCardData[]
  connectedPlatforms: Platform[]
}

/**
 * Kütüphane sarmalayıcısı.
 *
 * Sıra (2026-08-02, G-FAZ 0): Hero (+ kompakt aksiyonlar) → Toolbar → Liste.
 * "Araçlar" bölümü kaldırıldı: iki büyük kart kütüphaneyi ~209px aşağı
 * itiyordu ve "Playlist oluştur" sayfa içinde panel açıyordu. Oluşturma akışı
 * artık `/settings/automations`'ta, hero'dan yönlendirilir.
 * (2026-07-28 plan 07: taşıma kaldırıldı → Rosso saf Spotify.)
 */
export function PlaylistWorkspace({
  playlists,
  connectedPlatforms,
}: PlaylistWorkspaceProps) {
  return (
    <PlaylistLibrary
      playlists={playlists}
      connectedPlatforms={connectedPlatforms}
    />
  )
}
