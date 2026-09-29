import Image from 'next/image'
import { journeyVibeArtSrc, type JourneyVibeArtSlug } from '@/lib/vibe-cards/journey-hero-picks'
import { vibeMotionStyle, type VibeSlotMotion } from '@/lib/vibe-cards/journey-vibe-motion'
import styles from './journey-vibe-tile.module.css'

interface JourneyVibeTileProps {
  slug: JourneyVibeArtSlug
  variant: 'hero' | 'companion'
  motion: VibeSlotMotion
  scrollProgress?: number
  slotIndex?: number
  label?: string
  reduced?: boolean
  stacked?: boolean
  /** Scroll hareketi üst monolit sarmalayıcıda — tile içinde tekrarlanmaz. */
  motionHost?: 'self' | 'external'
}

export function JourneyVibeTile({
  slug,
  variant,
  motion,
  scrollProgress = 0,
  slotIndex = 0,
  label,
  reduced = false,
  stacked = false,
  motionHost = 'self',
}: JourneyVibeTileProps) {
  const isHero = variant === 'hero'
  const inMonolith = stacked && motionHost === 'external'

  return (
    <div
      className={`${styles.tile} ${
        isHero
          ? stacked
            ? styles.tileHeroStacked
            : styles.tileHero
          : styles.tileCompanion
      }`}
      data-slot={slotIndex}
    >
      <div
        className={styles.tileInner}
        style={
          motionHost === 'external'
            ? undefined
            : vibeMotionStyle(motion, reduced ? 0 : scrollProgress)
        }
      >
        <div className={`${styles.frame} ${inMonolith ? styles.frameMonolith : ''}`}>
          <Image
            src={journeyVibeArtSrc(slug)}
            alt=""
            fill
            className={styles.art}
            sizes={isHero ? '(min-width: 768px) 420px, 72vw' : '(min-width: 768px) 140px, 22vw'}
            priority={isHero}
          />
          {isHero ? <div className={styles.blurLayer} aria-hidden /> : null}
          {isHero && label && !inMonolith ? (
            <p className={styles.heroLabel}>
              <span className={styles.heroLabelEyebrow}>Your sound right now</span>
              <span className={styles.heroLabelName}>{label}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
