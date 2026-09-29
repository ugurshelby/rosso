import styles from './skeleton.module.css'
import { cn } from '@/lib/cn'

interface SkeletonTrackRowProps {
  className?: string
}

export function SkeletonTrackRow({ className }: SkeletonTrackRowProps) {
  return (
    <div className={cn(styles.trackRow, className)} aria-hidden>
      <div className={styles.trackThumb} />
      <div className={styles.trackMeta}>
        <div className={styles.trackName} />
        <div className={styles.trackArtist} />
      </div>
      <div className={styles.trackDuration} />
    </div>
  )
}
