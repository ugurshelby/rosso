import { Skeleton } from '@/components/ui/skeleton'
import styles from './dashboard.module.css'
import skeletonStyles from './dashboard-loading.module.css'

export default function DashboardLoading() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Skeleton height="0.75rem" width="5rem" radius="4px" />
        <Skeleton height="2rem" width="16rem" radius="6px" style={{ marginTop: '0.5rem' }} />
      </header>

      {/* StatBar */}
      <div className={skeletonStyles.statBar}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={skeletonStyles.statItem}>
            <Skeleton height="2rem" width="4rem" radius="4px" />
            <Skeleton height="0.7rem" width="3rem" radius="4px" style={{ marginTop: '0.4rem' }} />
          </div>
        ))}
      </div>

      {/* Period selector */}
      <div className={skeletonStyles.periodRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="2rem" width="5rem" radius="20px" />
        ))}
      </div>

      {/* Content grid */}
      <div className={skeletonStyles.grid}>
        {/* Sol: top tracks */}
        <div className={skeletonStyles.card}>
          <Skeleton height="1rem" width="8rem" radius="4px" />
          <div className={skeletonStyles.trackList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={skeletonStyles.trackRow}>
                <Skeleton width="36px" height="36px" radius="8px" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton height="0.8rem" width={`${55 - i * 5}%`} radius="4px" />
                  <Skeleton height="0.65rem" width="40%" radius="4px" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ: top artists */}
        <div className={skeletonStyles.card}>
          <Skeleton height="1rem" width="7rem" radius="4px" />
          <div className={skeletonStyles.trackList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={skeletonStyles.trackRow}>
                <Skeleton width="36px" height="36px" radius="50%" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton height="0.8rem" width={`${60 - i * 4}%`} radius="4px" />
                  <Skeleton height="0.65rem" width="35%" radius="4px" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart kartı */}
        <div className={skeletonStyles.card}>
          <Skeleton height="1rem" width="10rem" radius="4px" />
          <Skeleton height="8rem" width="100%" radius="8px" style={{ marginTop: '1rem' }} />
        </div>

        {/* Donut chart kartı */}
        <div className={skeletonStyles.card}>
          <Skeleton height="1rem" width="8rem" radius="4px" />
          <div className={skeletonStyles.donutWrap}>
            <Skeleton width="120px" height="120px" radius="50%" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height="0.75rem" width={`${70 - i * 12}%`} radius="4px" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
