import type { Transition } from 'motion/react'

/**
 * Rosso motion otoritesi — apple-design skill §4.
 * Varsayılan: kritik sönümlü (bounce 0). Overshoot yalnız momentum taşıyan
 * jestlerde (flick, sürükle-bırak).
 */

/** Segment kontrolü — iOS sliding pill (dashboard-redesign §5) */
export const SPRING_SEGMENT: Transition = { type: 'spring', bounce: 0.15, duration: 0.35 }

/** UI geçişleri — sekme, kart girişi, layout değişimi */
export const SPRING_UI: Transition = { type: 'spring', bounce: 0, duration: 0.35 }

/** Momentum sonrası — flick, carousel, throw */
export const SPRING_MOMENTUM: Transition = { type: 'spring', bounce: 0.2, duration: 0.4 }

/** Drawer / sheet — alttan panel */
export const SPRING_SHEET: Transition = { type: 'spring', bounce: 0.2, duration: 0.3 }

/** Yavaş açılış — kapak sanatı, hero görsel (kritik sönümlü) */
export const SPRING_REVEAL: Transition = { type: 'spring', bounce: 0, duration: 0.55 }

/** Hareket kapalı — prefers-reduced-motion karşılığı */
export const MOTION_NONE: Transition = { duration: 0 }

export function springFor(
  reduced: boolean,
  preset: Transition = SPRING_UI,
): Transition {
  return reduced ? MOTION_NONE : preset
}
