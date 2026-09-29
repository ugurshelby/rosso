import { Skeleton } from '@/components/ui/skeleton'
import styles from './mood-loading.module.css'

/** /mood — 5 mood kartı ızgarası; gerçek sayfa DB sorgusu atmaz, iskelet de hafif kalır. */
export default function MoodLoading() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Skeleton height="0.75rem" width="4rem" radius="4px" />
        <Skeleton height="2.25rem" width="min(100%, 18rem)" radius="6px" />
        <Skeleton height="1rem" width="min(100%, 28rem)" radius="4px" />
      </header>

      <div className={styles.grid} aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.card}>
            <Skeleton height="120px" width="100%" radius="8px" />
            <Skeleton height="0.9rem" width="70%" radius="4px" />
            <Skeleton height="0.7rem" width="85%" radius="4px" />
          </div>
        ))}
      </div>
    </div>
  )
}
