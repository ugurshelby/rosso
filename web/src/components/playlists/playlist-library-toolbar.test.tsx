import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '@/lib/i18n/provider'
import { playlists as playlistsEn } from '@/lib/i18n/messages/en/playlists'
import {
  PlaylistLibraryToolbar,
  readStoredViewMode,
  type PlaylistViewMode,
} from './playlist-library-toolbar'

/**
 * G-FAZ 2 (2026-08-02): "grid/liste toggle çalışmıyor" şikayeti.
 * Toggle'ın state'i gerçekten değiştirdiğini ve tercihi kalıcı yazdığını
 * kilitler — buton görünüp iş yapmıyorsa bu testler kırılır.
 */

function setup(viewMode: PlaylistViewMode = 'grid') {
  const onViewModeChange = vi.fn()
  render(
    <I18nProvider locale="en" messages={{ playlists: playlistsEn }}>
      <PlaylistLibraryToolbar
        onSearchChange={vi.fn()}
        sort="synced_desc"
        onSortChange={vi.fn()}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        folderMode="folder"
        onFolderModeChange={vi.fn()}
        canFolder={false}
        resultCount={10}
        totalCount={10}
      />
    </I18nProvider>,
  )
  return { onViewModeChange }
}

describe('PlaylistLibraryToolbar — görünüm toggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('liste butonuna tıklayınca "list" bildirir', async () => {
    const user = userEvent.setup()
    const { onViewModeChange } = setup('grid')

    await user.click(screen.getByRole('button', { name: 'List view' }))

    expect(onViewModeChange).toHaveBeenCalledWith('list')
  })

  it('ızgara butonuna tıklayınca "grid" bildirir', async () => {
    const user = userEvent.setup()
    const { onViewModeChange } = setup('list')

    await user.click(screen.getByRole('button', { name: 'Grid view' }))

    expect(onViewModeChange).toHaveBeenCalledWith('grid')
  })

  it('seçimi localStorage\'a yazar — sayfa yenilense de kalır', async () => {
    const user = userEvent.setup()
    setup('grid')

    await user.click(screen.getByRole('button', { name: 'List view' }))

    expect(readStoredViewMode()).toBe('list')
  })

  it('aktif görünümü aria-pressed ile bildirir', () => {
    setup('list')

    expect(screen.getByRole('button', { name: 'List view' }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Grid view' }))
      .toHaveAttribute('aria-pressed', 'false')
  })

  it('klasörlenebilir playlist yoksa klasör toggle\'ı hiç render edilmez', () => {
    setup('grid')

    expect(screen.queryByRole('group', { name: 'Folder mode' })).not.toBeInTheDocument()
  })
})
