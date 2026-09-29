import { Skeleton } from '@/components/ui/skeleton'
// Sayfanın kendi modülü — ayrı iskelet CSS chunk'ı üretmesin (preload israfı, 2026-09-24).
import styles from '@/components/playlists/liked-songs-hero.module.css'

/** /playlists/liked — hero + sekme şeridi + şarkı listesi iskeleti. */
export default function LikedSongsLoading() {
  return (
    <div className={styles.loadingPage}>
      <div className={styles.loadingHero}>
        <Skeleton className={styles.loadingCover} width="160px" height="160px" radius="8px" />
        <div className={styles.loadingInfo}>
          <Skeleton height="0.75rem" width="7rem" radius="4px" />
          <Skeleton height="3rem" width="min(100%, 18rem)" radius="8px" />
          <Skeleton height="0.85rem" width="min(100%, 14rem)" radius="4px" />
        </div>
      </div>

      <div className={styles.loadingTabs}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="2rem" width={`${5 + i}rem`} radius="20px" />
        ))}
      </div>

      <div className={styles.loadingList}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={styles.loadingRow}>
            <Skeleton width="48px" height="48px" radius="6px" style={{ flexShrink: 0 }} />
            <div className={styles.loadingRowBody}>
              <Skeleton height="0.85rem" width={`${50 + (i % 5) * 6}%`} radius="4px" />
              <Skeleton height="0.65rem" width="35%" radius="4px" />
            </div>
            <Skeleton width="2rem" height="2rem" radius="50%" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
