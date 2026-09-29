'use client'

import { RecapRankRow } from '../recap-rank-row'
import styles from './top-artists-card.module.css'

export interface TopArtist {
  name: string
  plays: number
  image_url: string | null
  hours?: number | null
}

/**
 * Kart 3 — Top 5 sanatçı. Kardeş desen: recap-rank-row (Kart 4 ile aynı).
 * Her satırda blur'lu sanatçı görseli + isim + çalma sayısı.
 */
export function TopArtistsCard({
  artists,
  periodLabel,
}: {
  artists: TopArtist[]
  periodLabel?: string
}) {
  const rows = artists.slice(0, 5)

  return (
    <div className={styles.frame}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>{periodLabel ? `${periodLabel} · THE SOUNDTRACK` : 'THE SOUNDTRACK'}</p>
        <h1 className={styles.heading}>TOP ARTISTS</h1>
      </div>

      <div className={styles.list}>
        {rows.map((artist, i) => (
          <RecapRankRow
            key={`${artist.name}-${i}`}
            rank={i + 1}
            imageUrl={artist.image_url}
            title={artist.name}
            plays={artist.plays}
            shape="circle"
            imageAlt={`${artist.name} — artist`}
            animateDelay={i * 0.05}
            animateFrom="up"
          />
        ))}
      </div>
    </div>
  )
}
