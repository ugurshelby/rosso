'use client'

import { useMemo } from 'react'
import { MoreHorizontal, ExternalLink, Disc3, Mic2 } from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu/action-menu'
import type { MenuAction } from '@/components/ui/action-menu/types'
import { getTrackSpotifyUrl } from '@/lib/platforms'
import { useT } from '@/lib/i18n/provider'
import styles from './playlist-detail.module.css'

interface TrackRowMenuProps {
  trackId: string
  title: string
  /** Birincil sanatçı — sanatçı detayına gider. Yoksa o seçenek gizlenir. */
  artist: string | null
  spotifyId: string | null
}

/**
 * Şarkı satırı menüsü — tek ActionMenu kaynağı; masaüstü popover, mobil sheet.
 */
export function TrackRowMenu({ trackId, title, artist, spotifyId }: TrackRowMenuProps) {
  const { t } = useT()
  const spotifyUrl = getTrackSpotifyUrl(spotifyId)

  const actions = useMemo<MenuAction[]>(() => {
    const items: MenuAction[] = [
      {
        id: 'track',
        label: t('playlists.rowMenu.trackDetails'),
        icon: <Disc3 size={15} strokeWidth={1.75} aria-hidden />,
        href: `/track/${trackId}`,
      },
    ]

    if (artist) {
      items.push({
        id: 'artist',
        label: t('playlists.rowMenu.artistDetails'),
        icon: <Mic2 size={15} strokeWidth={1.75} aria-hidden />,
        href: `/artist/${encodeURIComponent(artist)}`,
      })
    }

    if (spotifyUrl) {
      items.push({
        id: 'spotify',
        label: t('playlists.rowMenu.openInSpotify'),
        icon: <ExternalLink size={15} strokeWidth={1.75} aria-hidden />,
        href: spotifyUrl,
        external: true,
      })
    }

    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist, spotifyUrl, trackId, t])

  return (
    <ActionMenu
      actions={actions}
      triggerLabel={t('playlists.rowMenu.optionsFor', { title })}
      sheetTitle={title}
      className={styles.trackRowMenu}
      enableLongPress
    >
      {({ ref, onClick, longPressHandlers, ...aria }) => (
        <button
          ref={ref}
          type="button"
          className={styles.trackRowMenuTrigger}
          onClick={onClick}
          {...longPressHandlers}
          {...aria}
        >
          <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </ActionMenu>
  )
}
