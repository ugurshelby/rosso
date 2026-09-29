'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Bir media query'nin canlı sonucu.
 *
 * `useSyncExternalStore` ile: matchMedia bir DIŞ kaynak, React'in bunu okumak
 * için önerdiği yol bu. Eski desen (`useEffect` içinde `setState(mq.matches)`)
 * her mount'ta fazladan bir render tetikliyordu ve
 * `react-hooks/set-state-in-effect` onu hata sayıyor.
 *
 * SSR'da ve hydration'da `false` — sunucu ekranı bilemez; mismatch olmaz.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
