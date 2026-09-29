'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'

/**
 * useStoryDeck — story-deck'in TEK gezinme beyni (Plan 01 Aksiyon Maddesi #1,
 * 2026-07-25).
 *
 * ── Plan 01 ile design.md'nin uzlaştırılması ──
 * Plan 01 (eski, 2020 fikri) "cihaza göre iki AYRI DOM: MobileStoryDeck +
 * DesktopStoryDeck, masaüstünde 4/5 aspect-ratio kart" istiyordu. Ama
 * recap-journey-design.md §1 (2026-07-19 mimari kararı, Sahip: "Journey
 * ekranına bak, kart mı? Hayır, TÜM viewport") sabit aspect-ratio kartı ve iki
 * ayrı DOM'u AÇIKÇA reddediyor — sahne hem mobilde hem masaüstünde çerçevesiz
 * tam viewport. Otorite sırası: kod > design.md > eski plan. Bu yüzden planın
 * ÖZÜNÜ (ortak state + swipe + timer) alıp tek sahneye uyguladık; ayrık DOM'u
 * DEĞİL (o design.md ihlali olurdu, ve zaten üç turda scroll bug'ı yaratan
 * "responsive mucize"nin farklı bir biçimiydi).
 *
 * Hook ne yönetir:
 *   · index / total ve sınırlı ileri-geri gezinme
 *   · klavye ← →
 *   · dokunmatik SWIPE (native "kaydır" hissi — plan §1 mobil hedefi)
 *   · otomatik ilerleme TIMER'ı (Instagram Stories ritmi, design.md §1)
 *     — prefers-reduced-motion'da timer KAPANIR (design.md §8)
 *
 * Görsel/height kararı burada YOK — o RecapStage'in kontratı (design.md §1).
 */

export interface UseStoryDeckOptions {
  total: number
  /** Otomatik ilerleme aralığı (ms). 0 → timer kapalı. */
  autoAdvanceMs?: number
  /** Son karttan ileri geçişte (sağ tap, →, swipe) çağrılır — genelde arşive dönüş. */
  onExitForward?: () => void
}

export interface StoryDeckApi {
  index: number
  go: (next: number) => void
  next: () => void
  prev: () => void
  /** Dokunmatik swipe için sahne köküne bağlanır. */
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
  /** reduced-motion aktifse otomatik ilerleme durdurulmuştur. */
  autoPlaying: boolean
}

/** Yatay swipe eşiği (px) — dikey kaydırmayla karışmaması için makul. */
const SWIPE_THRESHOLD = 48

export function useStoryDeck({
  total,
  autoAdvanceMs = 0,
  onExitForward,
}: UseStoryDeckOptions): StoryDeckApi {
  const [index, setIndex] = useState(0)

  // reduced-motion → otomatik ilerleme kapalı (design.md §8). Ortak hook
  // (perf turundan) — kendi matchMedia bloğunu tekrarlamayız.
  const reduced = usePrefersReducedMotion()

  const go = useCallback(
    (next: number) => {
      if (next >= total) {
        onExitForward?.()
        return
      }
      setIndex((i) => Math.min(Math.max(next, 0), Math.max(total - 1, 0)))
    },
    [total, onExitForward],
  )
  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])

  // Klavye ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1)
      if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, go])

  // Dokunmatik swipe — başlangıç X/Y kaydedilir, bitişte yatay hâkimse geçiş.
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (t) touchStart.current = { x: t.clientX, y: t.clientY }
  }, [])
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current
      touchStart.current = null
      if (!start) return
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      // Dikey hareket baskınsa yok say (sayfa scroll'uyla çakışmasın).
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) next()
      else prev()
    },
    [next, prev],
  )

  // Otomatik ilerleme timer'ı — Instagram Stories ritmi. Son kartta durur;
  // reduced-motion'da hiç başlamaz. index değişince sıfırlanır (kullanıcı
  // elle geçtiyse sayaç yeniden başlar, ani atlama olmaz).
  const autoPlaying = autoAdvanceMs > 0 && !reduced && index < total - 1
  useEffect(() => {
    if (!autoPlaying) return
    const id = window.setTimeout(() => go(index + 1), autoAdvanceMs)
    return () => window.clearTimeout(id)
  }, [autoPlaying, autoAdvanceMs, index, go])

  return {
    index,
    go,
    next,
    prev,
    touchHandlers: { onTouchStart, onTouchEnd },
    autoPlaying,
  }
}
