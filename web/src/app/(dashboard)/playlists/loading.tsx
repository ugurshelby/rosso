import { Skeleton } from '@/components/ui/skeleton'
import styles from './playlists-loading.module.css'

export default function PlaylistsLoading() {
  return (
    <div className={styles.page}>
      {/* Hero (FAZ UI-4) — iskelet GERÇEK düzeni taklit etmeli, yoksa yükleme
          bitince sayfa zıplar. Eskiden küçük başlık + ayrı istatistik çubuğu
          çiziyordu; artık dev başlık + yanında sayı şeridi. */}
      <div className={styles.heroSkeleton}>
        <div className={styles.heroTitleBlock}>
          <Skeleton height="4.5rem" width="min(18rem, 80%)" radius="8px" />
          <Skeleton height="0.85rem" width="14rem" radius="4px" style={{ marginTop: '0.6rem' }} />
        </div>

        <div className={styles.heroStats}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.statItem}>
              <Skeleton height="1.5rem" width="3rem" radius="4px" />
              <Skeleton height="0.65rem" width="3.5rem" radius="4px" style={{ marginTop: '0.3rem' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.card}>
            <Skeleton height="120px" width="100%" radius="8px" />
            <Skeleton height="0.9rem" width="70%" radius="4px" style={{ marginTop: '0.5rem' }} />
            <Skeleton height="0.7rem" width="45%" radius="4px" />
          </div>
        ))}
      </div>
    </div>
  )
}
