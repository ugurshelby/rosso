'use client'

import { memo, useEffect, useState, useTransition } from 'react'
import type { JourneyYear } from '@/lib/journey/types'
import { useT } from '@/lib/i18n/provider'
import styles from './year-rail.module.css'

interface YearRailProps {
  years: JourneyYear[]
}

/**
 * Sessiz & Minimal Yıl Göstergesi — recap-journey-design.md §3.4
 * Kök bileşeni re-render etmez; kendi bağımsız IntersectionObserver'ını tutar.
 * Cam kapsül, haptik titreşim ve 55Hz ses butonu kaldırılmıştır.
 */
export const YearRail = memo(function YearRail({ years }: YearRailProps) {
  const { t } = useT()
  const [activeId, setActiveId] = useState<string>('companions')
  const [, startTransition] = useTransition()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id
            if (id) {
              startTransition(() => {
                setActiveId(id)
              })
            }
          }
        })
      },
      {
        root: null,
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0,
      }
    )

    const sections = document.querySelectorAll('[data-journey-section]')
    sections.forEach((sec) => observer.observe(sec))

    return () => observer.disconnect()
  }, [years])

  const scrollToId = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const items = [
    { id: 'companions', label: t('journey.chapterRail.companionsLabel') },
    ...years.map((y) => ({ id: `year-${y.year}`, label: String(y.year) })),
    { id: 'today', label: t('journey.chapterRail.todayLabel') },
  ]

  const currentLabel = items.find((i) => i.id === activeId)?.label ?? t('journey.chapterRail.fallbackLabel')

  return (
    <>
      {/* Masaüstü: İnce dikey liste */}
      <nav className={styles.desktopRail} aria-label={t('journey.chapterRail.navAriaLabel')}>
        {items.map((item) => {
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.railItem} ${isActive ? styles.railItemActive : ''}`}
              onClick={() => scrollToId(item.id)}
              aria-current={isActive ? 'true' : undefined}
            >
              <span>{item.label}</span>
              <span className={styles.activeDot} aria-hidden />
            </button>
          )
        })}
      </nav>

      {/* Mobil: Sticky minimal yıl göstergesi */}
      <div className={styles.mobileRail} role="status" aria-label={t('journey.chapterRail.currentAriaLabel')}>
        <span className={styles.mobileActiveLabel}>{currentLabel}</span>
        <select
          aria-label={t('journey.chapterRail.jumpAriaLabel')}
          className={styles.mobileYearSelect}
          value={activeId}
          onChange={(e) => scrollToId(e.target.value)}
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
})
