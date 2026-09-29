'use client'

import { cleanTrackTitle } from '@/lib/recap/clean-title'
import { RecapRankRow } from '../recap-rank-row'
import styles from './top-tracks-card.module.css'

export interface TopTrack {
  title: string
  artist: string | null
  plays: number
  image_url: string | null
}

/**
 * Kart 4 — Top 5 şarkı. Kardeş desen: recap-rank-row (Kart 3 ile aynı).
 */
export function TopTracksCard({
  tracks,
  periodLabel,
}: {
  tracks: TopTrack[]
  periodLabel?: string
}) {
  const rows = tracks.slice(0, 5)

  return (
    <div className={styles.frame}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>{periodLabel ? `${periodLabel} · HEAVY ROTATION` : 'HEAVY ROTATION'}</p>
        <h1 className={styles.heading}>TOP TRACKS</h1>
      </div>

      <div className={styles.list}>
        {rows.map((track, i) => (
          <RecapRankRow
            key={`${track.title}-${i}`}
            rank={i + 1}
            imageUrl={track.image_url}
            title={cleanTrackTitle(track.title)}
            subtitle={track.artist}
            plays={track.plays}
            imageAlt={track.title}
            animateDelay={i * 0.045}
            animateFrom="down"
          />
        ))}
      </div>
    </div>
  )
}
