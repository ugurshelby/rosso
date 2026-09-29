'use client'

import { memo, useRef } from 'react'
import { Music } from 'lucide-react'
import { JourneyArtwork } from './journey-artwork'
import { sizedUrl } from '@/lib/images/sized-url'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import { useSectionScrollProgress } from '@/lib/journey/use-section-scroll-progress'
import type { JourneyArc } from '@/lib/journey/types'
import { useT } from '@/lib/i18n/provider'
import styles from './journey-origin.module.css'

interface JourneyOriginProps {
  arc: JourneyArc
  totalPlays: number
  journeyStartYear: number
  journeyEndYear: number
}

const nf = new Intl.NumberFormat('en-US')

function parseOriginDate(iso: string): { day: number; month: string; year: number } | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'long' }),
      year: d.getFullYear(),
    }
  } catch {
    return null
  }
}

/**
 * İlk dinleme — hero ile yıl arşivi arasında tam viewport köprü sahnesi.
 * Metin ve kapak ayrı sütunlarda; kapak üzerine metin bindirilmez.
 */
export const JourneyOrigin = memo(function JourneyOrigin({
  arc,
  totalPlays,
  journeyStartYear,
  journeyEndYear,
}: JourneyOriginProps) {
  const reduced = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const scrollP = useSectionScrollProgress(sectionRef, reduced)
  const { t } = useT()
  const origin = parseOriginDate(arc.firstTrack.playedAt)
  const coverUrl = arc.firstTrack.imageUrl
  const coverTrackId = arc.firstTrack.trackId
  const artSrc = coverUrl ? sizedUrl(coverUrl, 960) : null

  return (
    <section ref={sectionRef} className={styles.origin} aria-label={t('journey.origin.ariaLabel')}>
      <div
        className={styles.inner}
        style={
          reduced
            ? undefined
            : {
                opacity: 1 - scrollP * 0.28,
                transform: `translate3d(0, ${scrollP * -20}px, 0)`,
              }
        }
      >
        <div className={styles.storyCol}>
          <header className={styles.storyHeader}>
            <span className={styles.storyEyebrow}>{t('journey.origin.eyebrow')}</span>
            <span className={styles.storyCaption}>The moment your Journey began</span>
          </header>

          {origin ? (
            <time className={styles.storyDate} dateTime={arc.firstTrack.playedAt}>
              {origin.day} {origin.month} {origin.year}
            </time>
          ) : null}

          <h2 className={styles.storyArtist}>{arc.firstTrack.artist}</h2>
          <p className={styles.storyTrack}>{arc.firstTrack.title}</p>

          <div className={styles.metrics}>
            <p className={styles.statBlock}>
              <span className={styles.statNum}>{nf.format(totalPlays)}</span>
              <span className={styles.statLabel}>{t('journey.origin.playsUnit')}</span>
            </p>

            <div
              className={styles.journeyMarker}
              aria-label={t('journey.origin.rangeAriaLabel', { start: journeyStartYear, end: journeyEndYear })}
            >
              <span className={styles.journeyYears}>
                {journeyStartYear}
                <span className={styles.journeyDash} aria-hidden>
                  —
                </span>
                {journeyEndYear}
              </span>
              <span className={styles.journeyLabel}>{t('journey.origin.yourJourneyLabel')}</span>
            </div>
          </div>
        </div>

        <figure className={styles.artCol} aria-hidden={!artSrc && !coverTrackId}>
          <div className={styles.artFrame}>
            {artSrc ?? coverTrackId ? (
              <JourneyArtwork
                id={coverTrackId ?? 'journey-origin'}
                src={artSrc}
                size={640}
                priority={true}
                alt=""
                className={styles.artCover}
              />
            ) : (
              <div className={styles.artFallback}>
                <Music size={40} aria-hidden />
              </div>
            )}
            <div className={styles.artVignette} aria-hidden />
          </div>
        </figure>
      </div>

      <div className={styles.originSpine} aria-hidden />
    </section>
  )
})

