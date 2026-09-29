'use client'

import { memo, type CSSProperties } from 'react'
import type { JourneyYear, JourneyCover } from '@/lib/journey/types'
import type { YilSahnesi } from '@/lib/journey/yil-sahnesi'
import type { YearPalette } from '@/lib/journey/types'
import { JourneyArtwork } from '../journey-artwork'
import { displayTrackTitle } from '@/lib/journey/display-title'
import { useT } from '@/lib/i18n/provider'
import styles from './focus-scene.module.css'

interface FocusSceneProps {
  year: JourneyYear
  sahne: YilSahnesi
  covers: JourneyCover[]
  palette: YearPalette
  isBreak?: boolean
  isFirstYear?: boolean
}

/**
 * Bağlılık Sahnesi (`baglilik`) — recap-journey-design.md §3.2
 * Tek kahraman büyük 1:1 kapak, altında yalın manşet + yıl. Raf veya mozaik yok.
 */
export const FocusScene = memo(function FocusScene({
  year,
  sahne,
  covers,
  palette,
  isBreak = false,
  isFirstYear = false,
}: FocusSceneProps) {
  const { t } = useT()
  const apex = covers[0] ?? (year.topTrack ? {
    trackId: 'apex-' + year.year,
    title: year.topTrack.title,
    artist: year.topTrack.artist,
    imageUrl: null,
    plays: year.topTrack.plays,
  } : null)

  return (
    <section
      id={`year-${year.year}`}
      data-journey-section
      className={styles.sceneSection}
      style={
        {
          '--y-accent': palette.accent,
          '--y-from': palette.primary,
          '--y-to': palette.deep,
          '--y-glow': palette.glow,
        } as CSSProperties
      }
    >
      <div className={styles.focusContainer}>
        <header className={styles.headerRow}>
          <h2 className={styles.yearNum}>{year.year}</h2>
          {isBreak && (
            <span className={styles.breakBadge} title={t('journey.view.breakYearTitle')}>
              <span aria-hidden>🔥</span> {t('journey.view.breakYearBadge')}
            </span>
          )}
        </header>

        {apex && (
          <div className={styles.artworkHeroWrap}>
            <JourneyArtwork
              id={apex.trackId}
              src={apex.imageUrl}
              size={640}
              priority={isFirstYear}
              alt={`${apex.artist} — ${apex.title}`}
            />
          </div>
        )}

        <div className={styles.metaBlock}>
          {apex && (
            <>
              <h3 className={styles.trackTitle}>{displayTrackTitle(apex.title)}</h3>
              <p className={styles.trackArtist}>{apex.artist}</p>
            </>
          )}

          <div className={styles.mansetBox}>
            <span className={styles.mansetDeger}>{sahne.mansetDeger}</span>
            <span className={styles.mansetEtiket}>{sahne.mansetEtiket}</span>
          </div>
        </div>
      </div>
    </section>
  )
})
