'use client'

import { motion, useReducedMotion } from 'motion/react'
import { springFor } from '@/lib/motion/apple-spring'
import { Music, User } from 'lucide-react'
import { cleanTrackTitle } from '@/lib/recap/clean-title'
import { RecapImage } from './recap-image'
import styles from './number-one-card.module.css'

export interface NumberOneData {
  artistName: string | null
  artistHours: number | null
  artistImageUrl?: string | null
  trackTitle: string | null
  trackArtist: string | null
  trackHours: number | null
  trackImageUrl?: string | null
}

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export function NumberOneCard({ data }: { data: NumberOneData }) {
  const reduced = useReducedMotion()
  const showArtist =
    data.artistName && data.artistHours !== null && data.artistHours > 0
  const showTrack =
    data.trackTitle && data.trackHours !== null && data.trackHours > 0
  const trackTitle = data.trackTitle ? cleanTrackTitle(data.trackTitle) : data.trackTitle

  const spring = springFor(!!reduced)

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
          <span className={styles.eyebrow}>TIME WITH YOUR #1</span>

          <div className={styles.blocksContainer}>
            {showArtist ? (
              <div className={styles.block}>
                <span className={styles.avatar}>
                  <RecapImage
                    src={data.artistImageUrl}
                    className={styles.avatarImg}
                    alt={data.artistName ?? ''}
                    fallback={
                      <span className={styles.avatarFallback}>
                        <User size={22} strokeWidth={1.5} aria-hidden />
                      </span>
                    }
                  />
                </span>
                <p className={styles.hours}>{nf.format(data.artistHours!)}</p>
                <span className={styles.unit}>hours · artist</span>
                <p className={styles.name}>{data.artistName}</p>
              </div>
            ) : null}

            {showTrack ? (
              <div className={`${styles.block} ${showArtist ? styles.blockSecondary : ''}`}>
                <span className={showArtist ? styles.coverSm : styles.cover}>
                  <RecapImage
                    src={data.trackImageUrl}
                    className={styles.avatarImg}
                    alt={trackTitle ?? ''}
                    fallback={
                      <span className={styles.avatarFallback}>
                        <Music size={showArtist ? 18 : 22} strokeWidth={1.5} aria-hidden />
                      </span>
                    }
                  />
                </span>
                <p className={showArtist ? styles.hoursSm : styles.hours}>
                  {nf.format(data.trackHours!)}
                </p>
                <span className={styles.unit}>hours · track</span>
                <p className={styles.name}>{trackTitle}</p>
                {data.trackArtist ? (
                  <p className={styles.subname}>{data.trackArtist}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
