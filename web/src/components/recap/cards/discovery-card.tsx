'use client'

import { motion, useReducedMotion } from 'motion/react'
import { springFor } from '@/lib/motion/apple-spring'
import { Music } from 'lucide-react'
import { cleanTrackTitle } from '@/lib/recap/clean-title'
import { RecapImage } from './recap-image'
import styles from './discovery-card.module.css'

export interface DiscoveryData {
  /** 'YYYY-MM-DD' — ayın ilk günü. */
  month_start: string
  new_artists: number
  new_tracks: number
  top_artist?: { name: string; image_url: string | null } | null
  top_track?: { title: string; artist: string | null; image_url: string | null } | null
}

const nf = new Intl.NumberFormat('en-US')

function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  if (!y || !m) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, 1)))
    .toLocaleUpperCase('en-US')
}

export function DiscoveryCard({
  data,
  periodLabel,
}: {
  data: DiscoveryData
  periodLabel?: string
}) {
  const reduced = useReducedMotion()
  const ay = monthLabel(data.month_start)
  const topTrackTitle = data.top_track ? cleanTrackTitle(data.top_track.title) : null

  const spring = springFor(!!reduced)
  const isYearly = periodLabel ? /^\d{4}$/.test(periodLabel.trim()) : false
  const eyebrowText = isYearly
    ? 'the month you discovered most'
    : `discoveries in ${ay.toLowerCase()}`

  return (
    <div className={styles.frame}>
      <div className={styles.glow} aria-hidden />

      <div className={styles.content}>
        <motion.div
          className={styles.hero}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <span className={styles.eyebrow}>{eyebrowText}</span>
          <div className={styles.monthStack}>
            <div className={styles.monthHalo} aria-hidden />
            <p className={styles.month}>{ay}</p>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{nf.format(data.new_artists)}</span>
              <span className={styles.statLabel}>new artists</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{nf.format(data.new_tracks)}</span>
              <span className={styles.statLabel}>new tracks</span>
            </div>
          </div>
        </motion.div>

        {(data.top_track || data.top_artist) && (
          <motion.div
            className={styles.samples}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { ...spring, delay: 0.08 }}
          >
            {data.top_track ? (
              <figure className={styles.sample}>
                <span className={styles.square}>
                  <RecapImage
                    src={data.top_track.image_url}
                    className={styles.img}
                    alt={topTrackTitle ?? ''}
                    fallback={
                      <span className={styles.imgFallback}>
                        <Music size={18} aria-hidden />
                      </span>
                    }
                  />
                </span>
                <figcaption className={styles.sampleCaption}>
                  <span className={styles.sampleLabel}>a track you discovered</span>
                  <span className={styles.sampleName}>{topTrackTitle}</span>
                </figcaption>
              </figure>
            ) : null}

            {data.top_artist ? (
              <figure className={styles.sample}>
                <span className={styles.circle}>
                  <RecapImage
                    src={data.top_artist.image_url}
                    className={styles.img}
                    alt={data.top_artist.name}
                    fallback={
                      <span className={styles.imgFallback}>
                        <Music size={18} aria-hidden />
                      </span>
                    }
                  />
                </span>
                <figcaption className={styles.sampleCaption}>
                  <span className={styles.sampleLabel}>an artist you discovered</span>
                  <span className={styles.sampleName}>{data.top_artist.name}</span>
                </figcaption>
              </figure>
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  )
}
