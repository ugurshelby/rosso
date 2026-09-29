import type { CSSProperties } from 'react'
import { Music } from 'lucide-react'
import { platformConfig } from '@/lib/platforms'
import type { Platform } from '@rosso/shared-types'
import { cn } from '@/lib/cn'
import styles from './playlist-cover-fallback.module.css'

interface PlaylistCoverFallbackProps {
  platform: string
  /** Lucide icon size in px */
  iconSize?: number
  variant?: 'card' | 'hero'
  className?: string
}

export function PlaylistCoverFallback({
  platform,
  iconSize = 20,
  variant = 'card',
  className,
}: PlaylistCoverFallbackProps) {
  const config = platformConfig[platform as Platform]
  const accent = config?.color ?? 'var(--color-accent)'

  return (
    <div
      className={cn(
        styles.fallback,
        variant === 'hero' && styles.fallbackHero,
        className,
      )}
      style={{ '--cover-accent': accent } as CSSProperties}
      aria-hidden
    >
      <Music size={iconSize} strokeWidth={1.5} />
    </div>
  )
}
