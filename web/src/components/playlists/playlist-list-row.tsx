'use client'

import { IntentLink } from '@/components/ui/intent-link'
import { PlaylistCoverFallback } from './playlist-cover-fallback'
import { platformConfig } from '@/lib/platforms'
import { useT } from '@/lib/i18n/provider'
import type { Platform } from '@rosso/shared-types'
import type { PlaylistCardData } from './playlist-card'
import styles from './playlists.module.css'

function formatLastSync(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface PlaylistListRowProps {
  playlist: PlaylistCardData
}

export function PlaylistListRow({ playlist }: PlaylistListRowProps) {
  const { t, tp } = useT()
  const config = platformConfig[playlist.platform as Platform]
  const platformLabel = config?.label ?? playlist.platform
  const trackLabel =
    playlist.track_count != null
      ? tp('playlists.listRow.tracksCount', playlist.track_count)
      : t('playlists.listRow.noTrackCount')
  const subtitle = `${trackLabel} · ${platformLabel}`

  return (
    <div className={styles.listRowWrap}>
      <IntentLink href={`/playlists/${playlist.id}`} className={styles.listRow} aria-label={playlist.name}>
        <div className={styles.listThumb} aria-hidden>
          {playlist.cover_url ? (
            // P0 (2026-07-24): lazy + async — liste görünümünde de ekran dışı
            // kapaklar ertelensin (grid'le aynı 3 MB sorunu, bkz. playlist-card).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playlist.cover_url}
              alt=""
              className={styles.listThumbImg}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <PlaylistCoverFallback platform={playlist.platform} iconSize={16} />
          )}
        </div>
        <div className={styles.listText}>
          <span className={styles.listTitle}>{playlist.name}</span>
          <span className={styles.listSubtitle}>{subtitle}</span>
        </div>
        {playlist.synced_at ? (
          <time className={styles.listSyncedAt} dateTime={playlist.synced_at}>
            {formatLastSync(playlist.synced_at)}
          </time>
        ) : (
          <span className={styles.listSyncedAt} aria-hidden>
            —
          </span>
        )}
      </IntentLink>
    </div>
  )
}
