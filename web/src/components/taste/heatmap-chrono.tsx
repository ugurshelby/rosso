'use client'

import { useState } from 'react'
import type { ChronotypeSummary } from '@/lib/analytics/identity'
import { LockedPreview } from '@/components/ui/locked-preview'
import { useT } from '@/lib/i18n/provider'
import styles from './heatmap-chrono.module.css'

type ChronotypeCardData = Pick<ChronotypeSummary, 'label' | 'peakHour' | 'peakHourLabel' | 'hourlyData'>

// Boş durum önizlemesi — gerçek kart tasarımı blur arkasında görünür (kilitli/
// blur sistemi, Sahip madde 9: "kartlar gizlenmesin, gerçek tasarım dursun,
// kilit ikonuna dokununca açılsın"). Temsili eğri — gerçek veri değil.
const PREVIEW_DATA_BASE: Omit<ChronotypeCardData, 'label'> = {
  peakHour: 21,
  peakHourLabel: '21:00',
  hourlyData: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    play_count: Math.max(4, Math.round(30 + 25 * Math.sin((hour - 6) / 3.8))),
  })),
}

interface HeatmapChronoProps {
  data: ChronotypeSummary
}

// KATMAN 4 (2026-07-25): şeritler tema accent'ine bürünüyordu (her paletde farklı
// renk) → bug raporu "KESİNLİKLE monokrom" istiyor. Isı skalası artık
// text-primary ↔ bg-sunken arası (nötr gri kademesi, palet renginden bağımsız).
// Peak hücre = en yoğun ton (tam text-primary), accent değil.
function getCellColor(playCount: number, maxCount: number, isPeak: boolean): string {
  if (isPeak) return 'var(--color-text-primary)'
  if (maxCount === 0 || playCount === 0) return 'var(--color-bg-sunken)'
  const intensity = playCount / maxCount
  if (intensity >= 0.75) return 'color-mix(in srgb, var(--color-text-primary) 60%, var(--color-bg-sunken))'
  if (intensity >= 0.5)  return 'color-mix(in srgb, var(--color-text-primary) 35%, var(--color-bg-sunken))'
  if (intensity >= 0.25) return 'color-mix(in srgb, var(--color-text-primary) 18%, var(--color-bg-sunken))'
  return 'color-mix(in srgb, var(--color-text-primary) 8%, var(--color-bg-sunken))'
}

function HeatmapCard({ data }: { data: ChronotypeCardData }) {
  const { t, tp } = useT()
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const maxCount = Math.max(...data.hourlyData.map((h) => h.play_count), 1)
  const peakEntry = data.hourlyData.find((h) => h.hour === data.peakHour)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <p className={styles.typeLabel}>{data.label}</p>
          <span className={styles.peakBadge}>
            <span className={styles.peakDot} aria-hidden="true" />
            {t('taste.heatmap.peak', { label: data.peakHourLabel })}
          </span>
        </div>
        {peakEntry && (
          <div className={styles.headerRight}>
            <span className={styles.statVal}>
              {peakEntry.play_count.toLocaleString('en-US')}
            </span>
            <span className={styles.statLabel}>{t('taste.heatmap.playsThatHour')}</span>
          </div>
        )}
      </div>

      <div
        className={styles.heatmapGrid}
        role="img"
        aria-label={t('taste.heatmap.heatmapAria')}
      >
        {data.hourlyData.map(({ hour, play_count }) => {
          const isPeak = hour === data.peakHour
          const cellColor = getCellColor(play_count, maxCount, isPeak)
          const isHovered = hoveredHour === hour
          return (
            <div
              key={hour}
              className={styles.cell}
              style={{ '--cell-color': cellColor } as React.CSSProperties}
              onMouseEnter={() => setHoveredHour(hour)}
              onMouseLeave={() => setHoveredHour(null)}
              aria-label={t('taste.heatmap.cellAria', { time: `${String(hour).padStart(2, '0')}:00`, count: play_count })}
            >
              {isHovered && (
                <div className={styles.tooltip} role="tooltip">
                  <span className={styles.tooltipHour}>
                    {String(hour).padStart(2, '0')}:00
                  </span>
                  <span className={styles.tooltipCount}>
                    {tp('taste.heatmap.plays', play_count)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className={styles.hourLabels} aria-hidden="true">
        {['00:00', '06:00', '12:00', '18:00', '23:00'].map((h) => (
          <span key={h} className={styles.hourLabel}>{h}</span>
        ))}
      </div>
    </div>
  )
}

export function HeatmapChrono({ data }: HeatmapChronoProps) {
  const { t } = useT()
  const previewData: ChronotypeCardData = {
    ...PREVIEW_DATA_BASE,
    label: t('taste.identity.chronoFallback.evening'),
  }
  return (
    <section className={styles.section} aria-label={t('taste.heatmap.eyebrow')}>
      <span className={styles.eyebrow}>{t('taste.heatmap.eyebrow')}</span>
      {data.available ? (
        <HeatmapCard data={data} />
      ) : (
        <LockedPreview label={t('taste.heatmap.locked')}>
          <HeatmapCard data={previewData} />
        </LockedPreview>
      )}
    </section>
  )
}
