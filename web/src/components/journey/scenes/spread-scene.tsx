'use client'

import { memo, type CSSProperties } from 'react'
import type { JourneyYear, JourneyCover } from '@/lib/journey/types'
import type { YilSahnesi } from '@/lib/journey/yil-sahnesi'
import type { YearPalette } from '@/lib/journey/types'
import { JourneyArtwork } from '../journey-artwork'
import { useT } from '@/lib/i18n/provider'
import styles from './spread-scene.module.css'

interface SpreadSceneProps {
  year: JourneyYear
  sahne: YilSahnesi
  covers: JourneyCover[]
  palette: YearPalette
  isBreak?: boolean
  isFirstYear?: boolean
}

/**
 * Dağılma Sahnesi (`dagilma`) — recap-journey-design.md §3.2
 * 3-5 farklı boyutta 1:1 kapaktan asimetrik mozaik (asla kırpılmamış, yalnız ölçeklenmiş).
 */
export const SpreadScene = memo(function SpreadScene({
  year,
  sahne,
  covers,
  palette,
  isBreak = false,
  isFirstYear = false,
}: SpreadSceneProps) {
  const { t } = useT()
  const primaryCover = covers[0]
  const secondCovers = covers.slice(1, 3)
  const thirdCovers = covers.slice(3, 5)

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
      <div className={styles.spreadContainer}>
        <header className={styles.headerRow}>
          <h2 className={styles.yearNum}>{year.year}</h2>
          {isBreak && (
            <span className={styles.breakBadge} title={t('journey.view.breakYearTitle')}>
              <span aria-hidden>🔥</span> {t('journey.view.breakYearBadge')}
            </span>
          )}
        </header>

        <div className={styles.mansetBlock}>
          <span className={styles.mansetDeger}>{sahne.mansetDeger}</span>
          <span className={styles.mansetEtiket}>{sahne.mansetEtiket}</span>
        </div>

        <div className={styles.mosaicWrap}>
          {primaryCover && (
            <div className={styles.mosaicPrimary}>
              <JourneyArtwork
                id={primaryCover.trackId}
                src={primaryCover.imageUrl}
                size={420}
                priority={isFirstYear}
                alt={`${primaryCover.artist} — ${primaryCover.title}`}
              />
            </div>
          )}

          {secondCovers.length > 0 && (
            <div className={styles.mosaicSecondaryCol}>
              {secondCovers.map((c) => (
                <div key={c.trackId} className={styles.mosaicSecondary}>
                  <JourneyArtwork
                    id={c.trackId}
                    src={c.imageUrl}
                    size={220}
                    alt={`${c.artist} — ${c.title}`}
                  />
                </div>
              ))}
            </div>
          )}

          {thirdCovers.length > 0 && (
            <div className={styles.mosaicTertiaryCol}>
              {thirdCovers.map((c) => (
                <div key={c.trackId} className={styles.mosaicTertiary}>
                  <JourneyArtwork
                    id={c.trackId}
                    src={c.imageUrl}
                    size={140}
                    alt={`${c.artist} — ${c.title}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {year.genreBreakdown && year.genreBreakdown.length > 0 && (
          <div className={styles.genresRow}>
            {year.genreBreakdown.slice(0, 5).map((g) => (
              <span key={g.label} className={styles.genreTag}>
                {g.label} ({Math.round(g.share * 100)}%)
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
})
