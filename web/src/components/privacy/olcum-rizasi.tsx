'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { CEREZ_OLAYI, cerezKarariniOku } from '@/lib/privacy/cerez-onay'

/**
 * Vercel Web Analytics'i YALNIZCA açık rıza varsa yükler (2026-09-22).
 *
 * Öncesinde kök layout'ta `{process.env.VERCEL && <Analytics />}` vardı:
 * banner'daki "Reddet" düğmesine basan kullanıcıda da ölçüm çalışıyordu.
 * Artık script yalnız `kabul` kararında DOM'a girer.
 *
 * ⚠ İlk render'da her koşulda `null` döner (sunucuda karar okunamaz) ve
 * karar `useEffect` içinde okunur — hydration uyuşmazlığı olmaz.
 *
 * Kullanıcı banner'da "Kabul et"e bastığında `CEREZ_OLAYI` yayınlanır ve
 * ölçüm SAYFA YENİLENMEDEN devreye girer; "Reddet"te hiç yüklenmez.
 */
export function OlcumRizasi() {
  const [izinli, setIzinli] = useState(false)

  useEffect(() => {
    const uygula = () => setIzinli(cerezKarariniOku() === 'kabul')
    uygula()
    window.addEventListener(CEREZ_OLAYI, uygula)
    // Başka sekmede verilen karar da geçerlidir.
    window.addEventListener('storage', uygula)
    return () => {
      window.removeEventListener(CEREZ_OLAYI, uygula)
      window.removeEventListener('storage', uygula)
    }
  }, [])

  if (!izinli) return null
  return <Analytics />
}
