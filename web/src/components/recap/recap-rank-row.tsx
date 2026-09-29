'use client'

import { motion, useReducedMotion } from 'motion/react'
import { springFor, SPRING_UI } from '@/lib/motion/apple-spring'
import { RecapImage } from './cards/recap-image'
import styles from './recap-rank-row.module.css'

const nf = new Intl.NumberFormat('en-US')

export interface RecapRankRowProps {
  rank: number
  imageUrl: string | null
  title: string
  subtitle?: string | null
  plays: number
  shape?: 'circle' | 'square'
  imageAlt?: string
  animateDelay?: number
  /** Sanatçı satırında yukarı animasyon, şarkıda aşağıdan */
  animateFrom?: 'up' | 'down'
}

export function RecapRankRow({
  rank,
  imageUrl,
  title,
  subtitle,
  plays,
  shape = 'square',
  imageAlt = '',
  animateDelay = 0,
  animateFrom = 'down',
}: RecapRankRowProps) {
  const reduced = useReducedMotion() ?? false
  const y = animateFrom === 'up' ? 12 : -14

  return (
    <motion.div
      className={styles.row}
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={springFor(!!reduced, { ...SPRING_UI, delay: animateDelay })}
    >
      {imageUrl ? (
        <div className={styles.bg} aria-hidden>
          <RecapImage size={104} src={imageUrl} alt="" />
        </div>
      ) : null}
      <div className={styles.glass} aria-hidden />

      <div className={`${styles.thumb} ${shape === 'circle' ? styles.thumbCircle : styles.thumbSquare}`}>
        <RecapImage size={104} src={imageUrl} alt={imageAlt} />
      </div>

      <div className={styles.text}>
        <p className={styles.rank}>{String(rank).padStart(2, '0')}</p>
        <h2 className={styles.title}>{title}</h2>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>

      {/* 🔴 2026-08-11 — "ÇALMA" kelimesi mobilde 67px'in ~40px'ini yiyordu
          ve isimleri bölünmeye zorluyordu (ölçüm: recap-rank-row.module.css
          `.title`). Mobilde yalnız sayı görünür; ≥900px'te kelime döner.
          Ekran okuyucu her iki durumda da tam ifadeyi okur. */}
      <span className={styles.plays}>
        {nf.format(plays)}
        <span className={styles.playsUnit}> PLAYS</span>
      </span>
    </motion.div>
  )
}
