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

import { PlaylistEditModal } from './playlist-edit-modal'

function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nProvider locale="en" messages={{ playlists: playlistsEn }}>
      {ui}
    </I18nProvider>,
  )
}

/**
 * Sahip (2026-08-11): hero'daki hayalet senkron menüsü yerine gerçek
 * playlist düzenleme — ad/açıklama Spotify'a `PATCH /details` ile yazılır.
 */
describe('PlaylistEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('mevcut ad ve açıklamayla açılır', () => {
    renderWithI18n(
      <PlaylistEditModal
        open
        onClose={vi.fn()}
        playlistId="pl1"
        initialName="Yaz Modu"
        initialDescription="Güneşli günler için"
      />,
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Yaz Modu')
    expect(screen.getByLabelText('Description')).toHaveValue('Güneşli günler için')
  })

  it('boş ad ile Kaydet devre dışı kalır', async () => {
    const user = userEvent.setup()
    renderWithI18n(
      <PlaylistEditModal
        open
        onClose={vi.fn()}
        playlistId="pl1"
        initialName="Yaz Modu"
        initialDescription={null}
      />,
    )

    await user.clear(screen.getByLabelText('Name'))

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('Kaydet doğru gövdeyle PATCH atar ve kapanır', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response)
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderWithI18n(
      <PlaylistEditModal
        open
        onClose={onClose}
        playlistId="pl1"
        initialName="Eski ad"
        initialDescription={null}
      />,
    )

    const nameInput = screen.getByLabelText('Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Yeni ad')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/playlists/pl1/details',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Yeni ad', description: '' }),
      }),
    )
    expect(onClose).toHaveBeenCalled()
    expect(refreshMock).toHaveBeenCalled()
  })

  it('başarısız istekte hata gösterilir, modal kapanmaz', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Spotify update failed' }),
    } as Response)
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderWithI18n(
      <PlaylistEditModal
        open
        onClose={onClose}
        playlistId="pl1"
        initialName="Ad"
        initialDescription={null}
      />,
    )

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Spotify update failed')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
