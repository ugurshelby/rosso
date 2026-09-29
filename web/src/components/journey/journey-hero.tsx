'use client'

import { memo, useMemo, useRef } from 'react'
import Link from 'next/link'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import { useSectionScrollProgress } from '@/lib/journey/use-section-scroll-progress'
import { VIBE_CARDS, type VibeCardId } from '@/lib/vibe-cards/data'
import {
  pickJourneyHeroCompanions,
  JOURNEY_HERO_COMPANION_COUNT,
} from '@/lib/vibe-cards/journey-hero-picks'
import {
  COMPANION_VIBE_MOTIONS,
  HERO_VIBE_MOTION,
  vibeMotionStyle,
} from '@/lib/vibe-cards/journey-vibe-motion'
import { JourneyVibeTile } from './journey-vibe-tile'
import { useT } from '@/lib/i18n/provider'
import styles from './journey-hero.module.css'

interface JourneyHeroProps {
  vibeCardId: VibeCardId
  userSeed: string
  hideExit?: boolean
  hideScrollCue?: boolean
}

/**
 * Journey açılış — kimlik vibe kartı + 8 eşlik kartı, tam viewport.
 */
export const JourneyHero = memo(function JourneyHero({
  vibeCardId,
  userSeed,
  hideExit = false,
  hideScrollCue = false,
}: JourneyHeroProps) {
  const reduced = usePrefersReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const scrollP = useSectionScrollProgress(heroRef, reduced)
  const vibeCard = VIBE_CARDS[vibeCardId]
  const { t } = useT()

  const companions = useMemo(
    () => pickJourneyHeroCompanions(vibeCardId, userSeed, JOURNEY_HERO_COMPANION_COUNT),
    [vibeCardId, userSeed],
  )

  return (
    <section ref={heroRef} className={styles.hero} aria-label={t('journey.hero.ariaLabel')}>
      <div className={styles.vibeField} aria-hidden>
        {companions.map((slug, i) => (
          <JourneyVibeTile
            key={slug}
            slug={slug}
            variant="companion"
            slotIndex={i}
            motion={COMPANION_VIBE_MOTIONS[i] ?? COMPANION_VIBE_MOTIONS[0]!}
            scrollProgress={scrollP}
            reduced={reduced}
          />
        ))}
      </div>
      <div className={styles.heroStage}>
        <div
          className={styles.heroStageMotion}
          style={vibeMotionStyle(HERO_VIBE_MOTION, reduced ? 0 : scrollP)}
        >
          <div className={styles.heroIdentity}>
            <JourneyVibeTile
              slug={vibeCardId}
              variant="hero"
              stacked
              motionHost="external"
              label={vibeCard.nameTr}
              motion={HERO_VIBE_MOTION}
              scrollProgress={scrollP}
              reduced={reduced}
            />
            <div className={styles.heroTitlePlaque}>
              <div className={styles.heroIdentityBadge}>
                <span className={styles.heroIdentityEyebrow}>{t('journey.hero.soundNowEyebrow')}</span>
                <span className={styles.heroIdentityName}>{vibeCard.nameTr}</span>
              </div>
              <h1 className={styles.heroTitle}>Journey</h1>
            </div>
          </div>
        </div>
      </div>

      <div
        className={styles.heroScrim}
        style={reduced ? undefined : { opacity: 0.68 + scrollP * 0.28 }}
        aria-hidden
      />

      {!hideExit && (
        <header className={styles.heroChrome}>
          <Link href="/recap" className={styles.heroExit} aria-label={t('journey.hero.exitAriaLabel')}>
            <span className={styles.heroExitArrow} aria-hidden>←</span>
            <span className={styles.heroExitLabel}>{t('journey.hero.exitLabel')}</span>
          </Link>
        </header>
      )}

      <div className={styles.heroSpine} aria-hidden />

      {!hideScrollCue && (
        <p className={styles.scrollCue} aria-hidden>
          <span className={styles.scrollCueLine} />
          <span className={styles.scrollCueText}>{t('journey.hero.scrollCue')}</span>
        </p>
      )}
    </section>
  )
})
