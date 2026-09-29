'use client'

import { useEffect, useState } from 'react'

/**
 * PERF-3 (2026-07-24): motion/react'ın useReducedMotion'ı yerine hafif matchMedia
 * hook'u. Bazı bileşenler (StatBar, FreshnessBar) framer-motion'ı SADECE bu tek
 * kontrol için bundle'a çekiyordu — dashboard katmanı ilk yükünde ağır kütüphaneyi
 * gereksiz yüklüyordu. Gerçek <motion.div> kullanan bileşenler motion'da kalır.
 *
 * SSR-güvenli: ilk render'da false (motion açık varsayımı), mount sonrası gerçek
 * tercih okunur — hydration mismatch yok.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    onChange() // mount anındaki gerçek tercihi oku
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
