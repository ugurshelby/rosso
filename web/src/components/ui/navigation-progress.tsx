'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import styles from './navigation-progress.module.css'

/**
 * Küresel gezinme çubuğu (2026-07-16 gece görevi, G2): kullanıcı bir iç linke
 * tıkladığı ANDA üstte ince amber ilerleme çizgisi başlar; rota değişince
 * tamamlanıp kaybolur. Bağımlılık yok (nprogress vb. değil).
 *
 * Neden click-dinleme: App Router'da global "navigation start" olayı yok;
 * aynı-origin <a> tıklaması pratikte gezinme başlangıcıdır. Yanlış-pozitif
 * (yeni sekme, modifier tuşu, download, #hash) elenir. loading.tsx zaten
 * içerik iskeletini verir — bu çubuk yalnız "tıklaman alındı" sinyalidir.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [state, setState] = useState<'idle' | 'active' | 'done'>('idle')
  const startedAt = useRef<string>('')

  // Tıklama → başlat
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      const current = window.location.pathname + window.location.search
      const next = url.pathname + url.search
      if (next === current) return // aynı sayfa — çubuk yok
      startedAt.current = next
      setState('active')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Rota değişti → tamamla, kısa süre sonra gizle. setState'ler setTimeout ile
  // ertelenir (React lint: effect içinde senkron setState kaskad render riski).
  useEffect(() => {
    const doneT = setTimeout(() => {
      setState((prev) => (prev === 'active' ? 'done' : prev))
    }, 0)
    const idleT = setTimeout(() => setState('idle'), 350)
    return () => {
      clearTimeout(doneT)
      clearTimeout(idleT)
    }
  }, [pathname, searchParams])

  if (state === 'idle') return null
  return (
    <div
      className={`${styles.bar} ${state === 'done' ? styles.done : styles.active}`}
      role="progressbar"
      aria-label="Page loading"
      aria-hidden={state === 'done'}
    />
  )
}
