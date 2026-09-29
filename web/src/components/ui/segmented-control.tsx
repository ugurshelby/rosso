'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SPRING_SEGMENT } from '@/lib/motion/apple-spring'
import styles from './segmented-control.module.css'

/**
 * Apple-style kayan pill segmented control — Rosso'nun tek kanonik
 * sekme/toggle sistemi (2026-09-17, Apple Design + Glassmorphism turu).
 *
 * ★ Neden bu şekil: proje içinde 4-5 birbirinden kopuk sekme/toggle
 * implementasyonu vardı (history'nin üç ayrı düz-renkli grubu, recap'in
 * `PeriodSelector`'ı — o da kendi CSS'inde bu deseni elle yazmıştı).
 * `PeriodSelector`'ın deseni (framer-motion `layoutId` ile kayan pill +
 * `--material-*` cam token'ları) zaten kanonik Apple hissini veriyordu —
 * buraya çıkarılıp tek kaynak yapıldı, `PeriodSelector` artık bunu SARAR.
 *
 * `--material-*` (chrome/kontrol yüzeyleri) kullanır, `--glass-fill`
 * DEĞİL — o içerik panelleri için (bkz. docs/design/stiller/glassmorphism.md).
 */

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  /**
   * `layoutId` framer-motion'ın kayan pill'i eşlemesi için — aynı sayfada
   * BİRDEN FAZLA segmented control varsa (ör. history'de sekme + period +
   * sort + grid, dördü de aynı anda) her biri kendi benzersiz kimliğini
   * almalı, yoksa pill yanlış control'e "sıçrar".
   */
  layoutId: string
  /** İkon-only kompakt mod (history'nin sort/grid gruplarında) — etiket
   * yalnızca `aria-label`/`title` olarak kalır, görsel olarak gizlenir. */
  iconOnly?: boolean
  /** Veri yeniden yükleniyor — şerit hafifçe soluklaşıp nabız atar. */
  pending?: boolean
  /** Dar ekranda şerit tam genişliğe yayılır, sekmeler eşit paylaşır
   * (recap'in eski `.periodStrip` mobil davranışı — birebir taşındı). */
  fullWidthOnMobile?: boolean
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  layoutId,
  iconOnly = false,
  pending = false,
  fullWidthOnMobile = false,
  className,
}: SegmentedControlProps<T>) {
  const reduced = useReducedMotion()

  return (
    <nav
      className={`${styles.strip} ${iconOnly ? styles.stripCompact : ''} ${className ?? ''}`}
      aria-label={ariaLabel}
      data-pending={pending && !reduced ? 'true' : undefined}
      data-full-width={fullWidthOnMobile ? 'true' : undefined}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            aria-pressed={iconOnly ? active : undefined}
            aria-current={!iconOnly && active ? 'true' : undefined}
            aria-label={iconOnly ? opt.label : undefined}
            title={iconOnly ? opt.label : undefined}
            onClick={() => onChange(opt.value)}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={styles.indicator}
                transition={reduced ? { duration: 0 } : SPRING_SEGMENT}
                aria-hidden
              />
            )}
            <span className={styles.content}>
              {opt.icon}
              {!iconOnly && <span className={styles.label}>{opt.label}</span>}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
