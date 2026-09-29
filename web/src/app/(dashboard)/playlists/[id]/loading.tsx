import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonTrackRow } from '@/components/ui/SkeletonTrackRow'
import { Card } from '@/components/ui/card'
import styles from '@/components/playlists/playlist-detail.module.css'

export default function PlaylistDetailLoading() {
  return (
    <div className={styles.loadingPage}>
      <div className={styles.loadingHero}>
        <Skeleton className={styles.loadingHeroCover} />
        <div className={styles.loadingHeroBody}>
          <Skeleton height="0.75rem" width="90px" radius="4px" />
          <Skeleton height="3rem" width="min(100%, 340px)" radius="8px" />
          <Skeleton height="0.875rem" width="min(100%, 200px)" radius="4px" />
        </div>
      </div>

      <Card className={styles.loadingTrackCard}>
        <div className={styles.loadingTrackList}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonTrackRow key={i} />
          ))}
        </div>
      </Card>
    </div>
  )
}
