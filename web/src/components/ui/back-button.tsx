'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

/**
 * KATMAN 5 (2026-07-25): /track/[id] ve /artist/[name] sabit "← Çalma listelerine
 * dön" gösterip hep /playlists'e gidiyordu — kullanıcı oraya playlist'ten
 * gelmemişse yanlış. Artık router.back() ile GELDIĞI yere döner. Geçmiş yoksa
 * (doğrudan giriş / yeni sekme) fallback href'e gider.
 */
interface BackButtonProps {
  className?: string
  /** Geçmiş yoksa gidilecek yer (doğrudan giriş fallback'i). */
  fallbackHref?: string
  label?: string
}

export function BackButton({ className, fallbackHref = '/dashboard', label = 'Go back' }: BackButtonProps) {
  const router = useRouter()

  function handleBack() {
    // history.length > 1 → bu sekmede gezinme geçmişi var, geri gidebiliriz.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  // SSR/no-JS güvenliği: <a> fallback'i href taşır; JS varsa onClick devralır.
  return (
    <Link
      href={fallbackHref}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        handleBack()
      }}
    >
      ← {label}
    </Link>
  )
}
