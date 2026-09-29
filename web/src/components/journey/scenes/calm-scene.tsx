'use client'

import { memo, type CSSProperties } from 'react'
import type { JourneyYear, JourneyCover } from '@/lib/journey/types'
import type { YilSahnesi } from '@/lib/journey/yil-sahnesi'
import type { YearPalette } from '@/lib/journey/types'
import { JourneyArtwork } from '../journey-artwork'
import { displayTrackTitle } from '@/lib/journey/display-title'
import { useT } from '@/lib/i18n/provider'
import styles from './calm-scene.module.css'

interface CalmSceneProps {
  year: JourneyYear
  sahne: YilSahnesi
  covers: JourneyCover[]
  palette: YearPalette
  isBreak?: boolean
  isFirstYear?: boolean
}

/**
 * Sakin Sahne (`sakin`) — recap-journey-design.md §3.2
 * Tek 1:1 kapak, geniş negatif boşluk, sakin ve dingin manşet ("boşluk konuşur").
 * Kanıt sahnesi ve karmaşık listeler yok.
 */
export const CalmScene = memo(function CalmScene({
  year,
  sahne,
  covers,
  palette,
  isBreak = false,
  isFirstYear = false,
}: CalmSceneProps) {
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
      <div className={styles.calmContainer}>
        <header className={styles.headerRow}>
          <h2 className={styles.yearNum}>{year.year}</h2>
          {isBreak && (
            <span className={styles.breakBadge} title={t('journey.view.breakYearTitle')}>
              <span aria-hidden>🔥</span> {t('journey.view.breakYearBadge')}
            </span>
          )}
        </header>

        {apex && (
          <div className={styles.artworkWrap}>
            <JourneyArtwork
              id={apex.trackId}
              src={apex.imageUrl}
              size={420}
              priority={isFirstYear}
              alt={`${apex.artist} — ${apex.title}`}
            />
          </div>
        )}

        <div className={styles.metaWrap}>
          {apex && (
            <>
              <h3 className={styles.trackTitle}>{displayTrackTitle(apex.title)}</h3>
              <p className={styles.trackArtist}>{apex.artist}</p>
            </>
          )}

          <div className={styles.mansetBlock}>
            <span className={styles.mansetDeger}>{sahne.mansetDeger}</span>
            <span className={styles.mansetEtiket}>{sahne.mansetEtiket}</span>
          </div>
        </div>
      </div>
    </section>
  )
})
