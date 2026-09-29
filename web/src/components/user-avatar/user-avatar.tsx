'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'

export interface UserAvatarProps {
  src?: string | null
  name: string
  alt?: string
  className?: string
  imgClassName?: string
  initialClassName?: string
}

/**
 * Profil fotoğrafı — düz <img> + referrerPolicy (Google OAuth hotlink koruması)
 * ve yükleme hatasında baş harf fallback.
 */
export function UserAvatar({
  src,
  name,
  alt,
  className,
  imgClassName,
  initialClassName,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false)
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const showImage = Boolean(src) && !failed

  if (!showImage) {
    return (
      <span className={cn(className, initialClassName)} aria-hidden>
        {initial}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- harici profil URL'leri (Supabase, Google)
    <img
      src={src!}
      alt={alt ?? `${name} profil fotoğrafı`}
      className={imgClassName ?? className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
