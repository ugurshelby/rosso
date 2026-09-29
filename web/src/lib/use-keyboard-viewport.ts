'use client'

import { useEffect } from 'react'

/**
 * Mobil klavye açılınca gerçek görünür alanı CSS'e taşır.
 *
 * Sorun: `100dvh` klavye açıldığında güncellenmiyor (iOS Safari) veya
 * geç güncelleniyor (Android Chrome). Sonuç: sohbet header'ı ve mesajlar
 * ekranın dışına itiliyor, kullanıcı yalnız siyah alan görüyor.
 *
 * Çözüm: `visualViewport` gerçek görünür yüksekliği ve kaydırma ofsetini
 * verir. İkisini custom property olarak yazarız; CSS `100dvh` yerine
 * `var(--vv-height)` kullanır.
 *
 * `visualViewport` yoksa (eski tarayıcı) hiçbir property yazılmaz —
 * CSS'teki `100dvh` fallback'i devrede kalır.
 */
export function useKeyboardViewport(enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return

    const root = document.documentElement

    function apply() {
      if (!vv) return
      root.style.setProperty('--vv-height', `${Math.round(vv.height)}px`)
      root.style.setProperty('--vv-offset-top', `${Math.round(vv.offsetTop)}px`)
    }

    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      root.style.removeProperty('--vv-height')
      root.style.removeProperty('--vv-offset-top')
    }
  }, [enabled])
}
