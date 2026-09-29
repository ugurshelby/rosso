'use client'

import { memo, type CSSProperties, type ReactNode } from 'react'
import { Music } from 'lucide-react'
import { CoverArt } from '@/components/media/cover-art'
import { sizedUrl } from '@/lib/images/sized-url'
import styles from './journey-artwork.module.css'

export interface JourneyArtworkProps {
  id: string
  src?: string | null
  size?: number
  priority?: boolean
  alt?: string
  className?: string
  style?: CSSProperties
  fallback?: ReactNode
  fallbackTitle?: string
  fallbackSubtitle?: string
  children?: ReactNode
}

/**
 * 1:1 Kırpılmayan Kapak Bileşeni — recap-journey-design.md §0.4 invaryantı.
 * Kare kutu (aspect-ratio: 1 / 1) içinde contain ile kırpılmadan gösterilir.
 */
export const JourneyArtwork = memo(function JourneyArtwork({
  id,
  src,
  size = 640,
  priority = false,
  alt = 'Albüm kapağı',
  className = '',
  style,
  fallback,
  fallbackTitle,
  fallbackSubtitle,
  children,
}: JourneyArtworkProps) {
  const resolvedSrc = src ? sizedUrl(src, size) : null

  return (
    <div
      className={`${styles.journeyArtworkWrap} ${className}`}
      style={style}
      role="img"
      aria-label={alt}
    >
      <CoverArt
        kind="track"
        id={id}
        src={resolvedSrc}
        size={size}
        responsive
        priority={priority}
        alt={alt}
        className={styles.artworkContent}
        fallback={fallback ?? <Music size={Math.min(48, Math.max(20, Math.round(size / 8)))} aria-hidden />}
        fallbackTitle={fallbackTitle}
        fallbackSubtitle={fallbackSubtitle}
      />
      <span className={styles.artworkRim} aria-hidden />
      {children}
    </div>
  )
})
