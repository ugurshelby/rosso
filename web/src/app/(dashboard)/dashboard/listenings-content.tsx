'use client'

import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { SPRING_UI } from '@/lib/motion/apple-spring'
import { StatBlock } from '@/components/recap/stat-block'
import { TopList } from '@/components/recap/top-list'
import { PeriodSelector } from '@/components/recap/period-selector'
import { useT } from '@/lib/i18n/provider'
import styles from './dashboard.module.css'

import { useState } from 'react'
import type { Period } from '@/lib/analytics/engine'

interface TrackItem {
  track_id?: string | null
  raw_track_name: string | null
  raw_artist_name: string | null
  play_count: number
  total_ms: number
  album_image_url?: string | null
  image_url?: string | null
}

interface ArtistItem {
  artist_name: string
  play_count: number
  total_ms: number
  image_url?: string | null
}

interface SummaryData {
  total_ms: number
  total_tracks: number
  total_artists: number
}

interface PeriodData {
  summary: SummaryData
  topTracks: TrackItem[]
  topArtists: ArtistItem[]
}

interface ListeningsContentProps {
  defaultPeriod: Period
  allowedPeriods: Period[]
  initialDataByPeriod: Record<Period, PeriodData>
}

export function ListeningsContent({ defaultPeriod, allowedPeriods, initialDataByPeriod }: ListeningsContentProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const reduced = useReducedMotion()
  const { t } = useT()

  const currentData = initialDataByPeriod[period]
  if (!currentData) return null

  const { summary, topTracks, topArtists } = currentData
  const hasPeriodData = summary.total_ms > 0

  return (
    <>
      <div className={styles.listeningSectionHeader}>
        <h2 className={styles.sectionLabel}>{t('dashboard.listenings.title')}</h2>
        <PeriodSelector 
          value={period} 
          periods={allowedPeriods} 
          onChange={(p) => {
            setPeriod(p)
            window.history.replaceState(null, '', `/dashboard?period=${p}`)
          }}
        />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={period}
        initial={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
        transition={SPRING_UI}
      >
        <StatBlock
          totalMs={summary.total_ms}
          totalTracks={summary.total_tracks}
          totalArtists={summary.total_artists}
        />

        {hasPeriodData ? (
          <TopList tracks={topTracks} artists={topArtists} />
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              {t('dashboard.listenings.noData')}{' '}
              <Link href="/data" prefetch={false} className={styles.emptyStateLink}>{t('dashboard.listenings.uploadData')}</Link>
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
    </>
  )
}
