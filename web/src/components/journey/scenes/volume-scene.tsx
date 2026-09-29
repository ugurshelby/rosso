'use client'

import { memo, type CSSProperties } from 'react'
import type { JourneyYear, JourneyCover } from '@/lib/journey/types'
import type { YilSahnesi } from '@/lib/journey/yil-sahnesi'
import type { YearPalette } from '@/lib/journey/types'
import { JourneyArtwork } from '../journey-artwork'
import { displayTrackTitle } from '@/lib/journey/display-title'
import { useT } from '@/lib/i18n/provider'
import styles from './volume-scene.module.css'

interface VolumeSceneProps {
  year: JourneyYear
  sahne: YilSahnesi
  covers: JourneyCover[]
  palette: YearPalette
  isBreak?: boolean
  isFirstYear?: boolean
}

const nf = new Intl.NumberFormat('tr-TR')

/**
 * Hacim Sahnesi (`hacim`) — recap-journey-design.md §3.2
 * Manşet dev sayı ekranın kahramanıdır. Tek destekleyici kapak küçük ve kenarda yer alır.
 */
export const VolumeScene = memo(function VolumeScene({
  year,
  sahne,
  covers,
  palette,
  isBreak = false,
  isFirstYear = false,
}: VolumeSceneProps) {
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
      <div className={styles.volumeContainer}>
        <header className={styles.headerRow}>
          <h2 className={styles.yearNum}>{year.year}</h2>
          {isBreak && (
            <span className={styles.breakBadge} title={t('journey.view.breakYearTitle')}>
              <span aria-hidden>🔥</span> {t('journey.view.breakYearBadge')}
            </span>
          )}
        </header>

        <div className={styles.mansetHeroBlock}>
          <span className={styles.mansetDevSayi}>{sahne.mansetDeger}</span>
          <span className={styles.mansetEtiket}>{sahne.mansetEtiket}</span>
        </div>

        <div className={styles.supportRow}>
          {apex && (
            <div className={styles.supportingArtworkWrap}>
              <JourneyArtwork
                id={apex.trackId}
                src={apex.imageUrl}
                size={320}
                priority={isFirstYear}
                alt={`${apex.artist} — ${apex.title}`}
              />
            </div>
          )}

          <div className={styles.supportingMeta}>
            {apex && (
              <>
                <h3 className={styles.apexTitle}>{displayTrackTitle(apex.title)}</h3>
                <p className={styles.apexArtist}>{apex.artist}</p>
              </>
            )}

            <div className={styles.statsPills}>
              {year.totalMinutes > 0 && (
                <span className={styles.statPill}>
                  {nf.format(year.totalMinutes)} dk
                </span>
              )}
              {year.trackCount > 0 && (
                <span className={styles.statPill}>
                  {nf.format(year.trackCount)} şarkı
                </span>
              )}
              {year.artistCount > 0 && (
                <span className={styles.statPill}>
                  {nf.format(year.artistCount)} sanatçı
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})
