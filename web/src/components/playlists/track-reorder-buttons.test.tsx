import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n/provider'
import { playlists as playlistsEn } from '@/lib/i18n/messages/en/playlists'

const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

import { TrackReorderButtons } from './track-reorder-buttons'

/**
 * Sahip (2026-08-11): playlist detayında şarkı sıralaması yukarı/aşağı
 * ok ile değişmeli, `/api/playlists/[id]/reorder`'a POST atmalı.
 */
function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nProvider locale="en" messages={{ playlists: playlistsEn }}>
      {ui}
    </I18nProvider>,
  )
}

describe('TrackReorderButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('ilk satırda yukarı ok devre dışı', () => {
    renderWithI18n(
      <TrackReorderButtons
        playlistId="pl1"
        position={0}
        trackTitle="Şarkı A"
        isFirst
        isLast={false}
      />,
    )
    expect(screen.getByRole('button', { name: /move up/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /move down/i })).toBeEnabled()
  })

  it('son satırda aşağı ok devre dışı', () => {
    renderWithI18n(
      <TrackReorderButtons
        playlistId="pl1"
        position={4}
        trackTitle="Şarkı A"
        isFirst={false}
        isLast
      />,
    )
    expect(screen.getByRole('button', { name: /move down/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /move up/i })).toBeEnabled()
  })

  it('yukarı tıklayınca doğru position+direction ile POST atar', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response)
    const user = userEvent.setup()

    renderWithI18n(
      <TrackReorderButtons
        playlistId="pl1"
        position={2}
        trackTitle="Şarkı B"
        isFirst={false}
        isLast={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: /move up/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/playlists/pl1/reorder',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ position: 2, direction: 'up' }),
      }),
    )
    expect(refreshMock).toHaveBeenCalled()
  })

  it('başarısız istekte router.refresh çağrılmaz', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Already at the top.' }),
    } as Response)
    const user = userEvent.setup()

    renderWithI18n(
      <TrackReorderButtons
        playlistId="pl1"
        position={2}
        trackTitle="Şarkı B"
        isFirst={false}
        isLast={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: /move down/i }))

    expect(refreshMock).not.toHaveBeenCalled()
  })
})
