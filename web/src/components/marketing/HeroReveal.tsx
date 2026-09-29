import type { ReactNode } from 'react'
import styles from './hero-reveal.module.css'

/**
 * 🔴 2026-08-11 (LCP turu) — `motion/react`'ten SAF CSS'e çevrildi.
 *
 * Kimlikli Lighthouse ölçümünde landing'in JS bundle'ı **357 KB / 19 dosya**
 * çıkmıştı; `HeroReveal` hero'nun İÇİNDEKİ her parçayı (başlık, CTA, görsel)
 * sarmalıyordu ve `motion/react` çekiyordu — dashboard'da uygulanan
 * "next/dynamic ile ertele" deseni burada UYGULANAMAZ: hero LCP elemanını
 * içeriyor, `ssr:false` ile ertelenirse ilk boyamada hero TAMAMEN boş kalır.
 *
 * Çözüm: animasyon zaten basit bir fade+slide-in (opacity 0→1, y 18→0,
 * spring benzeri easing) — `motion/react`'siz CSS `@keyframes` ile birebir
 * aynı his verilir. Artık Server Component: sunucu HTML'i hero'yu doğrudan
 * basar, JS hiç gerekmez. `prefers-reduced-motion` CSS media query'de.
 *
 * `delay` artık inline `animation-delay` — sıralı beliriş korunuyor.
 */
interface HeroRevealProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function HeroReveal({ children, delay = 0, className }: HeroRevealProps) {
  return (
    <div
      className={[styles.reveal, className].filter(Boolean).join(' ')}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  )
}
