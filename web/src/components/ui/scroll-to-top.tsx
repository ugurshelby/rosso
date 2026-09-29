'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Sayfa (route) değiştiğinde viewport'u en üste sıfırlar.
 *
 * Sahip 2026-07-17: "Ana sayfa en üste gidiyor ama Taste sayfası ortaya
 * gidiyor." Next.js App Router her segment değişiminde scroll'u SIFIRLAMAZ —
 * yalnızca ilk mount'ta üstte başlatır; Suspense/loading.tsx akışında içerik
 * yüklendikçe yükseklik değiştiğinde tarayıcı önceki piksel konumunu korur,
 * bu da "yeni sayfa ortadan başlıyor" hissi verir. Kesin çözüm: her pathname
 * değişiminde elle en üste sar (tüm sayfalar için tek noktadan, route bazlı
 * özel kod gerekmez).
 */
export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
