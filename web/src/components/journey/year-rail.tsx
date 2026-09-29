'use client'

import { memo, useEffect, useState, useTransition } from 'react'
import type { JourneyYear } from '@/lib/journey/types'
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
  const [activeId, setActiveId] = useState<string>('origin')
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
    { id: 'origin', label: 'İlk Ses' },
    ...years.map((y) => ({ id: `year-${y.year}`, label: String(y.year) })),
    { id: 'today', label: 'Bugün' },
  ]

  const currentLabel = items.find((i) => i.id === activeId)?.label ?? 'Yolculuk'

  return (
    <>
      {/* Masaüstü: İnce dikey liste */}
      <nav className={styles.desktopRail} aria-label="Yıl gezintisi">
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
      <div className={styles.mobileRail} role="status" aria-label="Mevcut bölüm">
        <span className={styles.mobileActiveLabel}>{currentLabel}</span>
        <select
          aria-label="Yıla atla"
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
