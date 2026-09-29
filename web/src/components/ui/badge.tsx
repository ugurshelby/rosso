import { cn } from '@/lib/cn'
import { platformConfig } from '@/lib/platforms'
import type { Platform } from '@rosso/shared-types'
import styles from './badge.module.css'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'error'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[tone], className)} {...props}>
      {children}
    </span>
  )
}

/** Platform rozeti — renkli nokta + ad (design.md §5). */
export function PlatformBadge({ platform }: { platform: Platform }) {
  const { color, label } = platformConfig[platform]
  return (
    <span className={cn(styles.badge, styles.platform)}>
      <span className={styles.dot} style={{ background: color }} aria-hidden />
      {label}
    </span>
  )
}
