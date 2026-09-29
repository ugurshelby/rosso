'use client'

import { memo, useRef, type CSSProperties } from 'react'
import { ArrowRight, ArrowLeft, Play } from 'lucide-react'
import type { JourneyYear, JourneyCover } from '@/lib/journey/types'
import type { YilSahnesi } from '@/lib/journey/yil-sahnesi'
import type { YearPalette } from '@/lib/journey/types'
import { JourneyArtwork } from '../journey-artwork'
import { displayTrackTitle } from '@/lib/journey/display-title'
import { useT } from '@/lib/i18n/provider'
import styles from './discovery-scene.module.css'

interface DiscoverySceneProps {
  year: JourneyYear
  sahne: YilSahnesi
  covers: JourneyCover[]
  palette: YearPalette
  isBreak?: boolean
  isFirstYear?: boolean
}

/**
 * Keşif Sahnesi (`kesif`) — recap-journey-design.md §3.2
 * Kapı Sahnesi (küçük kahraman kapak + dev keşif manşeti)
 * Kanıt Sahnesi (yatay kaydırma ile yana açılan, 10 adet 1:1 Spotify liste ergonomisi)
 */
export const DiscoveryScene = memo(function DiscoveryScene({
  year,
  sahne,
  covers,
  palette,
  isBreak = false,
  isFirstYear = false,
}: DiscoverySceneProps) {
  const { t } = useT()
  const trackRef = useRef<HTMLDivElement>(null)
  const apex = covers[0] ?? (year.topTrack ? {
    trackId: 'apex-' + year.year,
    title: year.topTrack.title,
    artist: year.topTrack.artist,
    imageUrl: null,
    plays: year.topTrack.plays,
  } : null)

  const evidenceTracks = covers.slice(0, 10)

  const scrollToEvidence = () => {
    if (trackRef.current) {
      trackRef.current.scrollTo({
        left: trackRef.current.clientWidth,
        behavior: 'smooth',
      })
    }
  }

  const scrollToDoor = () => {
    if (trackRef.current) {
      trackRef.current.scrollTo({
        left: 0,
        behavior: 'smooth',
      })
    }
  }

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
      <div ref={trackRef} className={styles.horizontalTrack}>
        {/* ── Panel 1: Kapı Sahnesi ─────────────────────────────── */}
        <div className={styles.doorPanel}>
          <div className={styles.doorContent}>
            <header className={styles.headerRow}>
              <h2 className={styles.yearNum}>{year.year}</h2>
              {isBreak && (
                <span className={styles.breakBadge} title={t('journey.view.breakYearTitle')}>
                  <span aria-hidden>🔥</span> {t('journey.view.breakYearBadge')}
                </span>
              )}
            </header>

            {apex && (
              <div className={styles.doorArtworkWrap}>
                <JourneyArtwork
                  id={apex.trackId}
                  src={apex.imageUrl}
                  size={420}
                  priority={isFirstYear}
                  alt={`${apex.artist} — ${apex.title}`}
                />
              </div>
            )}

            <div className={styles.mansetBlock}>
              <span className={styles.mansetDeger}>{sahne.mansetDeger}</span>
              <span className={styles.mansetEtiket}>{sahne.mansetEtiket}</span>
            </div>

            {evidenceTracks.length > 0 && (
              <button
                type="button"
                className={styles.evidencePromptBtn}
                onClick={scrollToEvidence}
                aria-label="Keşif şarkılarını incele"
              >
                <span>Kanıt Sahnesi</span>
                <ArrowRight size={14} aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* ── Panel 2: Kanıt Sahnesi (Spotify Ergonomisi) ───────── */}
        {evidenceTracks.length > 0 && (
          <div className={styles.evidencePanel}>
            <div className={styles.evidenceContent}>
              <div className={styles.evidenceHeader}>
                <h3 className={styles.evidenceTitle}>{year.year} Keşif Arşivi</h3>
                <button
                  type="button"
                  className={styles.backToDoorBtn}
                  onClick={scrollToDoor}
                  aria-label="Geri dön"
                >
                  <ArrowLeft size={13} aria-hidden />
                  <span>Kapı Sahnesi</span>
                </button>
              </div>

              <div className={styles.trackList} role="list">
                {evidenceTracks.map((tr, idx) => (
                  <div key={tr.trackId} className={styles.trackRow} role="listitem">
                    <div className={styles.trackIndexCol}>
                      <span className={styles.trackIndexNum}>{idx + 1}</span>
                      <Play size={13} className={styles.trackPlayIcon} aria-hidden />
                    </div>

                    <div className={styles.trackCoverCol}>
                      <JourneyArtwork
                        id={tr.trackId}
                        src={tr.imageUrl}
                        size={80}
                        alt={`${tr.artist} — ${tr.title}`}
                      />
                    </div>

                    <div className={styles.trackMetaCol}>
                      <span className={styles.trackTitle} title={tr.title}>
                        {displayTrackTitle(tr.title)}
                      </span>
                      <span className={styles.trackArtist} title={tr.artist}>
                        {tr.artist}
                      </span>
                    </div>

                    {tr.plays > 0 && (
                      <div className={styles.trackPlaysCol}>
                        {tr.plays} çalma
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
})
