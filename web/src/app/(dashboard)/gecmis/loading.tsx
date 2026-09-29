import { Skeleton } from '@/components/ui/skeleton'
import styles from './gecmis-loading.module.css'

/** /gecmis — HistoryClient düzenini taklit eder; yükleme bitince zıplama olmaz. */
export default function HistoryLoading() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Skeleton height="0.75rem" width="8rem" radius="4px" />
          <Skeleton height="2.25rem" width="min(100%, 16rem)" radius="6px" />
        </div>
        <Skeleton height="2.5rem" width="9.5rem" radius="8px" />
      </header>

      <div className={styles.tabs}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="1rem" width={`${4 + i}rem`} radius="4px" />
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.periodRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="2rem" width={`${3.5 + (i % 2)}rem`} radius="20px" />
          ))}
        </div>
        <Skeleton height="2rem" width="5.5rem" radius="8px" />
      </div>

      <div className={styles.grid}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={styles.card}>
            <Skeleton height="140px" width="100%" radius="8px" />
            <div className={styles.cardMeta}>
              <Skeleton height="0.85rem" width={`${55 + (i % 4) * 5}%`} radius="4px" />
              <Skeleton height="0.65rem" width="40%" radius="4px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
