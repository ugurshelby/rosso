'use client'

import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/**
 * useCountUp — "Number ticker" (`animation-vocabulary`, 2026-09-18 turu).
 *
 * 🔴 NEDEN VAR: Dashboard'un `StatBar.tsx` bunu ZATEN yerelinde tanımlıyordu
 *    (`useCountUp`, satır içi) ama yalnız dashboard'a hapsolmuştu — Profil
 *    sayfasındaki Discovery Score halkası ve Followers/Following sayaçları
 *    hâlâ ANINDA sıçrıyordu. Aynı reçete (cubic ease-out, rAF) burada paylaşılır
 *    hâle getirildi; mobil `NumberTicker`in web ikizi.
 *
 * ⚠ `StatBar.tsx` kendi yerel kopyasını KORUR — mevcut, çalışan bir yüzeyi
 *   bu turun kapsamı dışında yeniden bağlamak riski gereksiz; yeni çağıranlar
 *   bu paylaşılan hook'u kullanır.
 */
export function useCountUp(target: number, enabled = true, duration = 900): number {
  const reduced = usePrefersReducedMotion()
  const [current, setCurrent] = useState(target)
  const raf = useRef<number>(0)
  const oncekiHedef = useRef(target)

  useEffect(() => {
    const baslangic = oncekiHedef.current
    oncekiHedef.current = target

    if (!enabled || reduced || baslangic === target) {
      setCurrent(target)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(baslangic + (target - baslangic) * eased))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, enabled, duration, reduced])

  return current
}
