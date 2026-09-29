'use client'

import { motion, useReducedMotion } from 'motion/react'
import { springFor } from '@/lib/motion/apple-spring'
import { Music } from 'lucide-react'
import { cleanTrackTitle } from '@/lib/recap/clean-title'
import { RecapImage } from './recap-image'
import styles from './peak-day-card.module.css'

export interface PeakDayData {
  /** 'YYYY-MM-DD' */
  day: string
  minutes: number
  plays: number
  tracks: Array<{
    title: string
    artist: string | null
    plays: number
    image_url: string | null
  }>
}

const nf = new Intl.NumberFormat('en-US')

function bigDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .toLocaleUpperCase('en-US')
}

export function PeakDayCard({ data }: { data: PeakDayData }) {
  const reduced = useReducedMotion()
  const spring = springFor(!!reduced)
  const tracks = data.tracks.slice(0, 3)

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
          <span className={styles.eyebrow}>busiest day</span>
          <p className={styles.signature}>
            <span className={styles.datePart}>{bigDate(data.day)}</span>
            <span className={styles.sep} aria-hidden />
            <span className={styles.minutesPart}>
              {nf.format(data.minutes)} <span className={styles.minutesUnit}>minutes</span>
            </span>
          </p>
        </motion.div>

        <motion.div
          className={styles.listSection}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { ...spring, delay: 0.06 }}
        >
          <p className={styles.listTitle}>TOP 3 TRACKS THAT DAY</p>
          <ol className={styles.list}>
            {tracks.map((t, i) => (
              <li key={`${t.title}-${i}`} className={styles.row}>
                <span className={styles.rank}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.thumb}>
                  <RecapImage size={52}
                    src={t.image_url}
                    className={styles.thumbImg}
                    alt={t.title}
                    fallback={
                      <span className={styles.thumbFallback}>
                        <Music size={16} strokeWidth={1.5} aria-hidden />
                      </span>
                    }
                  />
                </span>
                <div className={styles.trackMeta}>
                  <span className={styles.trackTitle}>{cleanTrackTitle(t.title)}</span>
                  {t.artist ? <span className={styles.trackArtist}>{t.artist}</span> : null}
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>
    </div>
  )
}
