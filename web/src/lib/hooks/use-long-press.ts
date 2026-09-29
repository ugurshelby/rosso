'use client'

import { useCallback, useRef } from 'react'

type Options = {
  enabled?: boolean
  delayMs?: number
  onLongPress: () => void
}

/** Dokunmatik long-press (≥500ms) — mobil action sheet tetikleyicisi. */
export function useLongPress({ enabled = true, delayMs = 500, onLongPress }: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(false)

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    activeRef.current = false
  }, [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled || event.pointerType === 'mouse') return
      activeRef.current = true
      timerRef.current = setTimeout(() => {
        if (activeRef.current) {
          onLongPress()
          activeRef.current = false
        }
      }, delayMs)
    },
    [enabled, delayMs, onLongPress],
  )

  return {
    onPointerDown,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  }
}
