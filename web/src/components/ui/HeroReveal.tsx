'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { springFor, SPRING_REVEAL } from '@/lib/motion/apple-spring'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'

/**
 * HeroReveal — detay sayfası kapak sanatının "büyüyerek" belirmesi
 * (`animation-vocabulary`: "Shared element transition"in en yakın
 * karşılığı — 2026-09-18 animasyon turu, mobil `HeroEntrance`in web ikizi).
 *
 * 🔴 NEDEN "YAKLAŞIK": Sayfa geçişi Next.js App Router ile olur — kart
 *    küçük kapaktan bu büyük kapağa gerçek bir FLIP ile büyümüyor (bu,
 *    View Transitions API gerektirirdi ve tarayıcı desteği + mevcut route
 *    yapısıyla ayrı bir mimari karar olurdu). Bunun yerine `SPRING_REVEAL`
 *    (`apple-spring.ts`: *"kapak sanatı, hero görsel"* için tanımlı ama
 *    playlist/track/artist detay sayfalarında HİÇ KULLANILMIYORDU) sayfa
 *    yüklendiğinde kapağı 0.96→1 ölçekle + fade ile getirir.
 *
 * ⚠ Reduce-motion: `springFor` zaten `duration:0`'a düşürür (§14).
 */
export function HeroReveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springFor(reduced, SPRING_REVEAL)}
    >
      {children}
    </motion.div>
  )
}
