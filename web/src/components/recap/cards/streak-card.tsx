'use client'

import { motion, useReducedMotion } from 'motion/react'
import { springFor, SPRING_UI } from '@/lib/motion/apple-spring'
import './recap-card-atmosphere.css'
import styles from './streak-card.module.css'

/**
 * Kart 6 — "The Unbroken Chain" (FAZ R1.5, 2026-07-21).
 *
 * Sahibin tarifi ★ KABUL KRİTERİ:
 *   · Duolingo ateşinin Rosso'nun karanlık/lüks diline uyarlanması — TEK ODAK
 *   · Grid hücresi YOK; mobil ve masaüstünde mutlak merkez
 *   · Mikro noktalar: seriyi temsil eden nokta dokusu (opacity 0.1, amber)
 *   · Glow: ÜST ÜSTE blur katmanı YOK — tek div, box-shadow, opacity 0.3
 *   · Lüks Rosso gradient dolgulu sayı
 *   · Tarih etiketi dikeyde esnek boşlukla ayrılır
 */
export interface StreakData {
  days: number
  /** 'YYYY-MM-DD' */
  start: string
  end: string
}

/** 'YYYY-MM-DD' → '12 EKİM'. UTC'de ayrıştırılır (yerel saat kaymasın). */
function dayLabel(iso: string): string {
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

/** Nokta dokusu — seriyi temsil eder. Çok uzun serilerde DOM şişmesin diye
 *  tavan var; doku hissi için 180 nokta fazlasıyla yeter. */
const MAX_DOTS = 180

export function StreakCard({ data }: { data: StreakData }) {
  const reduced = useReducedMotion()
  const dots = Math.min(data.days, MAX_DOTS)

  return (
    <div className={`${styles.frame} recap-atmosphere`}>
      {/* Nokta dokusu — arka planda homojen, dikkat çalmaz. */}
      <div className={styles.dots} aria-hidden>
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} className={styles.dot} />
        ))}
      </div>

      {/* TEK katman glow — kirli leke kuralı. */}
      <div className={styles.glow} aria-hidden />

      <div className={styles.content}>
        <motion.span
          className={styles.eyebrow}
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springFor(!!reduced)}
        >
          THE UNBROKEN CHAIN
        </motion.span>

        <motion.p
          className={styles.number}
          initial={reduced ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springFor(!!reduced)}
        >
          {data.days}
        </motion.p>

        <motion.span
          className={styles.label}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springFor(!!reduced, { ...SPRING_UI, delay: 0.08 })}
        >
          DAYS WITHOUT A BREAK
        </motion.span>

        <motion.div
          className={styles.rangePill}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springFor(!!reduced, { ...SPRING_UI, delay: 0.14 })}
        >
          <span className={styles.range}>
            {dayLabel(data.start)} — {dayLabel(data.end)}
          </span>
        </motion.div>
      </div>
    </div>
  )
}
