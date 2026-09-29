'use client'

import Link from 'next/link'
import { useState, type ComponentProps } from 'react'

/**
 * Niyet-tetiklemeli prefetch'li `Link` (2026-09-24 performans denetimi).
 *
 * ─── Neden ───────────────────────────────────────────────────────────────
 * Next'in varsayılanı: `<Link>` ekrana GİRDİĞİ AN rotayı prefetch eder.
 * Dinamik rotalarda bu her link için ayrı bir sunucu isteği demek
 * (`/_tree` segment prefetch'i → middleware Auth turu + fonksiyon çağrısı).
 * HAR ölçümü: playlist detayında 87, mood detayında 63, beğenilenlerde 40,
 * sanatçı sayfasında 41 prefetch isteği — kullanıcı çoğuna hiç tıklamıyor.
 * Vercel Hobby CPU bütçesi bu isteklerle eriyordu.
 *
 * ─── Ne yapar ───────────────────────────────────────────────────────────
 * Ekrana girince prefetch ETMEZ. Kullanıcı niyet gösterince — fare üstüne
 * gelince, klavyeyle odaklanınca, parmak dokununca — varsayılan prefetch
 * davranışına döner (Next dokümantasyonundaki "Hover-triggered prefetch"
 * deseni). Tıklamadan önceki ~100-300 ms'lik hover süresi, loading
 * iskeletinin anında gelmesine genellikle yeter; algılanan hız korunur.
 *
 * ─── Ne zaman kullanılır ────────────────────────────────────────────────
 * Tekrarlanan liste satırlarında (şarkı/sanatçı/albüm/playlist listeleri,
 * ızgaralar). Tekil, yüksek olasılıklı hedefler (nav, birincil CTA) düz
 * `Link` olarak kalır. Kural: docs/reference/kural-performans.md §1.
 */
export function IntentLink({
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [intent, setIntent] = useState(false)

  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true)
        onMouseEnter?.(e)
      }}
      onFocus={(e) => {
        setIntent(true)
        onFocus?.(e)
      }}
      onTouchStart={(e) => {
        setIntent(true)
        onTouchStart?.(e)
      }}
    />
  )
}
