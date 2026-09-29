'use client'

import { useEffect } from 'react'

/**
 * useEffect + AbortController cleanup — teknik-mimari-referansi.md §10.
 *
 * Okuma istekleri için. Yazma işlemlerinde (beğeni, export, şifre) KULLANMA —
 * yarım yazma riski.
 */
export function useAbortableEffect(
  effect: (signal: AbortSignal) => void | (() => void),
  deps: React.DependencyList,
): void {
  useEffect(() => {
    const ac = new AbortController()
    const teardown = effect(ac.signal)
    return () => {
      ac.abort()
      teardown?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  }, deps)
}
