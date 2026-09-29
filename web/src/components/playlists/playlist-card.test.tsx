import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@/lib/i18n/provider'
import { playlists as playlistsEn } from '@/lib/i18n/messages/en/playlists'
import { PlaylistCard, type PlaylistCardData } from './playlist-card'

const basePlaylist: PlaylistCardData = {
  id: 'pl-1',
  name: 'My Playlist',
  platform: 'spotify',
  track_count: 12,
  cover_url: null,
  synced_at: null,
}

function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nProvider locale="en" messages={{ playlists: playlistsEn }}>
      {ui}
    </I18nProvider>,
  )
}

describe('PlaylistCard — son senkron göstergesi', () => {
  it('synced_at doluysa "Last updated" metnini gösterir', () => {
    renderWithI18n(
      <PlaylistCard
        playlist={{ ...basePlaylist, synced_at: '2026-07-03T10:00:00Z' }}
      />,
    )
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
  })

  it('synced_at null ise "Last updated" metni gösterilmez', () => {
    renderWithI18n(<PlaylistCard playlist={basePlaylist} />)
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument()
  })
})
