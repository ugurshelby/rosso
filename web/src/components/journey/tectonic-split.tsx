'use client'

import { memo } from 'react'
import type { JourneyYear, YearPalette } from '@/lib/journey/types'
import styles from './tectonic-split.module.css'

interface TectonicSplitProps {
  prevYear: JourneyYear
  breakpointYear: JourneyYear
  prevPalette: YearPalette
  breakPalette: YearPalette
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

const nf = new Intl.NumberFormat('en-US')

export const TectonicSplit = memo(function TectonicSplit({
  prevYear,
  breakpointYear,
  prevPalette,
  breakPalette,
}: TectonicSplitProps) {
  return (
    <section
      className={styles.tectonicContainer}
      style={
        {
          '--split-from-accent': prevPalette.accent,
          '--split-to-accent': breakPalette.accent,
          '--split-to-glow': breakPalette.glow,
        } as React.CSSProperties
      }
      aria-label="The Tectonic Split: Significant Genre Evolution"
    >
      <header className={styles.faultHeader}>
        <span className={styles.faultEyebrow}>Tectonic Shift</span>
        <h3 className={styles.faultTitle}>
          {prevYear.genreLabel} → {breakpointYear.genreLabel}
        </h3>
      </header>

      <div className={styles.faultStage}>
        {/* Outgoing Tectonic Plate */}
        <div className={styles.plateLeft}>
          <span className={styles.plateLabel}>Pre-Shift Horizon</span>
          <span className={styles.plateYear}>{prevYear.year}</span>
          <span className={styles.plateGenre}>{prevYear.genreLabel}</span>
          <span className={styles.plateStat}>
            {pct(prevYear.discoveryRate)} discovery · {nf.format(prevYear.playCount)} plays
          </span>
        </div>

        {/* The Jagged Fracture Chasm */}
        <div className={styles.fractureChasm}>
          <div className={styles.chasmGlow} aria-hidden />
          <svg
            className={styles.fractureSvg}
            viewBox="0 0 64 220"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="magmaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={prevPalette.accent} stopOpacity="0.4" />
                <stop offset="50%" stopColor={breakPalette.accent} stopOpacity="0.95" />
                <stop offset="100%" stopColor={breakPalette.glow} stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Magma undercurrent polygon */}
            <polygon
              points="28,0 36,0 44,45 28,95 42,145 28,190 36,220 28,220 20,185 34,140 18,90 32,45 24,0"
              className={styles.magmaUndercurrent}
            />

            {/* Jagged crack spine lines */}
            <polyline
              points="32,0 26,45 38,90 22,135 36,180 32,220"
              className={styles.faultLine}
            />
          </svg>
        </div>

        {/* Incoming Tectonic Plate */}
        <div className={styles.plateRight}>
          <span className={styles.plateLabel}>New Undercurrent</span>
          <span className={styles.plateYear}>{breakpointYear.year}</span>
          <span className={styles.plateGenre}>{breakpointYear.genreLabel}</span>
          <span className={styles.plateStat}>
            {pct(breakpointYear.discoveryRate)} discovery · {nf.format(breakpointYear.playCount)} plays
          </span>
        </div>
      </div>
    </section>
  )
})
