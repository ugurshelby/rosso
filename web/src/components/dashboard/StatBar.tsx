'use client'

import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css'

interface Stat {
  raw: number
  display: string
  label: string
  /** Yalnız tür istatistiği kutusu: en çok dinlenen türlerden birkaçı, chip
   *  olarak sayının altında gösterilir (2026-07-17, Sahip: "favori tür tekil
   *  değeri değil, tüm tür sayımını görmek istiyorum"). */
  chips?: string[]
}

interface StatBarProps {
  stats: Stat[]
  /**
   * P0.6 — sayıların hangi zaman penceresinden geldiğini söyleyen bağlam etiketi.
   * Faz 2'de sayılar yalnız canlı API verisinden gelir (Spotify bağlantısından
   * bu yana), kullanıcı bunu tüm dinleme geçmişi sanmasın. Faz 3+'ta `null`.
   */
  windowLabel?: string | null
}

function useCountUp(target: number, enabled: boolean, duration = 900) {
  const [current, setCurrent] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (!enabled || target === 0) {
      const id = requestAnimationFrame(() => setCurrent(target))
      return () => cancelAnimationFrame(id)
    }
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      setCurrent(Math.round(eased * target))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, enabled, duration])

  return current
}

function StatItem({ raw, display, label, chips, animate }: Stat & { animate: boolean }) {
  const numeric = /^\d+$/.test(String(raw))
  const count = useCountUp(raw, animate && numeric)

  return (
    <div className={styles.statItem}>
      <span className={styles.statValue}>
        {animate && numeric ? count : display}
      </span>
      <span className={styles.statLabel}>{label}</span>
      {chips && chips.length > 0 && (
        <div className={styles.statChips}>
          {chips.map((c) => (
            <span key={c} className={styles.statChip}>{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function StatBar({ stats, windowLabel = null }: StatBarProps) {
  const reduced = usePrefersReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // trigger count-up on mount
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const animate = mounted && !reduced

  return (
    <div>
      <div className={styles.statBar}>
        {stats.map((s) => (
          <StatItem key={s.label} {...s} animate={animate} />
        ))}
      </div>
      {windowLabel && (
        <p className={styles.statWindowLabel}>{windowLabel}</p>
      )}
    </div>
  )
}
