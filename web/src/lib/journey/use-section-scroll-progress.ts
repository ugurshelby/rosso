'use client'

import { useEffect, useState, type RefObject } from 'react'

/** Bölüm viewport'tan çıkarken 0→1 — scroll-linked animasyonlar için tek kaynak. */
export function useSectionScrollProgress(
  ref: RefObject<HTMLElement | null>,
  disabled: boolean,
): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return

    let raf = 0
    const sync = () => {
      raf = 0
      const height = el.offsetHeight || 1
      const raw = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / height))
      setProgress(raw * (2 - raw))
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sync)
    }

    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref, disabled])

  return progress
}
