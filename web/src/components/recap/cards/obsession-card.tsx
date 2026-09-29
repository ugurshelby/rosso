'use client'

import { motion, useReducedMotion } from 'motion/react'
import { springFor } from '@/lib/motion/apple-spring'
import { Disc3 } from 'lucide-react'
import { cleanTrackTitle } from '@/lib/recap/clean-title'
import { RecapImage } from './recap-image'
import styles from './obsession-card.module.css'

export interface ObsessionData {
  title: string
  artist: string
  plays: number
  hours: number
  sharePct: number
  spanDays: number
  peakWindowPlays: number
  peakWindowStart: string | null
  imageUrl?: string | null
}

const nf = new Intl.NumberFormat('en-US')

function monthLabel(iso: string | null): string | null {
  if (!iso) return null
  const [y, m] = iso.split('-').map(Number)
  if (!y || !m) return null
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, 1)))
    .toLocaleUpperCase('en-US')
}

export function ObsessionCard({ data }: { data: ObsessionData }) {
  const reduced = useReducedMotion()
  const donem = monthLabel(data.peakWindowStart)
  const title = cleanTrackTitle(data.title)

  const spring = springFor(!!reduced)

  return (
    <div className={styles.frame}>
      <div className={styles.glow} aria-hidden />
      {data.imageUrl ? (
        <div
          className={styles.ambient}
          style={{ backgroundImage: `url(${data.imageUrl})` }}
          aria-hidden
        />
      ) : null}

      <div className={styles.content}>
        <motion.div
          className={styles.hero}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <span className={styles.eyebrow}>the track you locked onto</span>

          <div className={styles.coverWrap}>
            <RecapImage size={256}
              src={data.imageUrl}
              alt={`${title} cover`}
              className={styles.cover}
              fallback={
                <span className={styles.coverFallback}>
                  <Disc3 size={40} strokeWidth={1.25} aria-hidden />
                </span>
              }
            />
          </div>

          <div className={styles.identity}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.artist}>{data.artist}</p>
          </div>
        </motion.div>

        <motion.div
          className={styles.statsBand}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { ...spring, delay: 0.08 }}
        >
          <div className={styles.statCell}>
            <span className={styles.statValue}>{nf.format(data.peakWindowPlays)}</span>
            <span className={styles.statLabel}>plays · in 30 days</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statValue}>{nf.format(data.plays)}</span>
            <span className={styles.statLabel}>total plays</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statValue}>{data.hours.toFixed(1)}</span>
            <span className={styles.statLabel}>hours</span>
          </div>
          {donem ? (
            <div className={styles.statCell}>
              <span className={styles.statValueSm}>{donem}</span>
              <span className={styles.statLabel}>peak month</span>
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}
