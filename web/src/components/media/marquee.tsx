import type { ReactNode } from 'react'
import styles from './marquee.module.css'

interface MarqueeProps {
  items: ReactNode[]
  /** Her item için benzersiz key üretici. */
  keyOf: (index: number) => string
  ariaLabel: string
  /** Bir tur süresi (saniye). Varsayılan 40s (Taste sayfasındaki desenle aynı). */
  durationS?: number
}

/**
 * Dikişsiz sonsuz kayan şerit (marquee) — Taste sayfasındaki `LoyalArtists`
 * deseninin genellenmiş hali (2026-07-14, plan §5.5). İki kopya art arda
 * dizilir, CSS -50% kayınca kesintisiz akar. Hover'da durur,
 * `prefers-reduced-motion` saygı görür. Dekoratif — `aria-hidden`, altında
 * her zaman gerçek bir liste bulunmalı (ekran okuyucu erişimi için).
 */
export function Marquee({ items, keyOf, ariaLabel, durationS = 40 }: MarqueeProps) {
  if (items.length === 0) return null
  const doubled = [...items, ...items]

  return (
    <div
      className={styles.wrap}
      aria-hidden="true"
      role="presentation"
      aria-label={ariaLabel}
      style={{ '--marquee-duration': `${durationS}s` } as React.CSSProperties}
    >
      <div className={styles.track}>
        {doubled.map((item, i) => (
          <span key={keyOf(i)} className={styles.item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
