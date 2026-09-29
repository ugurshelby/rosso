import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n/provider'
import { playlists as playlistsEn } from '@/lib/i18n/messages/en/playlists'
import { TrackTable } from './track-table'

function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nProvider locale="en" messages={{ playlists: playlistsEn }}>
      {ui}
    </I18nProvider>,
  )
}

/**
 * Sahibin bildirdiği BUG (2026-07-11):
 * "bir şarkının üç noktasına tıklıyorum, sonra başka bir şarkınınkine
 *  tıklıyorum, önceden tıkladığım GİTMİYOR."
 *
 * Sebep: her satır kendi native <details> elementiydi; <details>'ler
 * birbirinden habersizdir. Artık React state'i tek menü açık tutuyor.
 *
 * Ayrıca menü ISRC gösteriyordu (kimse istemez) — artık gerçek eylemler.
 */

const rows = [
  {
    position: 1,
    tracks: {
      id: 'aaaaaaaa-1111-1111-1111-111111111111',
      title: 'Rüzgar Gülü',
      artist_name: ['Madrigal'],
      isrc: 'TRAUR2500051',
      duration_ms: null,
      album: null,
      spotify_id: 'sp_ruzgar',
    },
  },
  {
    position: 2,
    tracks: {
      id: 'bbbbbbbb-2222-2222-2222-222222222222',
      title: 'Dance Up',
      artist_name: ['TumaniYO'],
      isrc: null,
      duration_ms: null,
      album: null,
      spotify_id: null,
    },
  },
]

function menuButton(name: string) {
  return screen.getByRole('button', { name: `${name} — options` })
}

describe('TrackTable — üç nokta menüsü', () => {
  it('bir menü açıkken DİĞERİNE tıklanınca ilki KAPANIR (bildirilen bug)', async () => {
    const user = userEvent.setup()
    renderWithI18n(<TrackTable rows={rows} />)

    await user.click(menuButton('Rüzgar Gülü'))
    expect(menuButton('Rüzgar Gülü')).toHaveAttribute('aria-expanded', 'true')

    await user.click(menuButton('Dance Up'))

    // İlki artık KAPALI olmalı — bug tam olarak buydu.
    expect(menuButton('Rüzgar Gülü')).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton('Dance Up')).toHaveAttribute('aria-expanded', 'true')
  })

  it('menüde ISRC YOKTUR (kullanıcı ISRC görmek istemez)', async () => {
    const user = userEvent.setup()
    renderWithI18n(<TrackTable rows={rows} />)

    await user.click(menuButton('Rüzgar Gülü'))

    expect(screen.queryByText(/ISRC/i)).not.toBeInTheDocument()
    expect(screen.queryByText('TRAUR2500051')).not.toBeInTheDocument()
    expect(screen.queryByText(/ek bilgi yok/i)).not.toBeInTheDocument()
  })

  it('menü gerçek eylemler sunar: şarkı detayı, sanatçı detayı, Spotify', async () => {
    const user = userEvent.setup()
    renderWithI18n(<TrackTable rows={rows} />)

    await user.click(menuButton('Rüzgar Gülü'))

    expect(screen.getByRole('menuitem', { name: /track details/i })).toHaveAttribute(
      'href',
      '/track/aaaaaaaa-1111-1111-1111-111111111111',
    )
    expect(screen.getByRole('menuitem', { name: /artist details/i })).toHaveAttribute(
      'href',
      '/artist/Madrigal',
    )
    expect(screen.getByRole('menuitem', { name: /spotify/i })).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/sp_ruzgar',
    )
  })

  it('spotify_id yoksa "Open in Spotify" GÖSTERİLMEZ (kırık link üretmeyiz)', async () => {
    const user = userEvent.setup()
    renderWithI18n(<TrackTable rows={rows} />)

    await user.click(menuButton('Dance Up'))

    expect(screen.queryByRole('menuitem', { name: /spotify/i })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /track details/i })).toBeInTheDocument()
  })

  it('Escape menüyü kapatır (a11y)', async () => {
    const user = userEvent.setup()
    renderWithI18n(<TrackTable rows={rows} />)

    await user.click(menuButton('Rüzgar Gülü'))
    expect(menuButton('Rüzgar Gülü')).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(menuButton('Rüzgar Gülü')).toHaveAttribute('aria-expanded', 'false')
  })

  it('şarkı ve sanatçı adları detay sayfalarına bağlanır', () => {
    renderWithI18n(<TrackTable rows={rows} />)

    expect(screen.getByRole('link', { name: 'Rüzgar Gülü' })).toHaveAttribute(
      'href',
      '/track/aaaaaaaa-1111-1111-1111-111111111111',
    )
    expect(screen.getByRole('link', { name: 'Madrigal' })).toHaveAttribute(
      'href',
      '/artist/Madrigal',
    )
  })
})
