import { Skeleton } from '@/components/ui/skeleton'
import styles from './taste-loading.module.css'

export default function TasteLoading() {
  return (
    <div className={styles.page}>
      {/* Identity hero — 2026-07-30: gerçek sahne artık başlık + kimlik kartı
          birleşik tek plaket (bkz. taste.module.css .identityPlate); iskelet
          de aynı geometriyi (metin sütunu + kare kart) yansıtır, aksi halde
          yükleme bitince sayfa zıplar. */}
      <div className={styles.hero}>
        <div className={styles.heroTextCol}>
          <Skeleton height="0.75rem" width="6rem" radius="4px" />
          <Skeleton height="2.5rem" width="14rem" radius="6px" style={{ marginTop: '0.75rem' }} />
          <Skeleton height="1rem" width="10rem" radius="4px" style={{ marginTop: '0.5rem' }} />
          <div className={styles.tagRow}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height="1.5rem" width={`${4 + i}rem`} radius="20px" />
            ))}
          </div>
        </div>
        <Skeleton radius="12px" className={styles.heroCardArt} />
      </div>

      {/* Heatmap */}
      <div className={styles.card}>
        <Skeleton height="0.9rem" width="10rem" radius="4px" />
        <div className={styles.heatmapGrid}>
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} height="3rem" width="100%" radius="4px" style={{ opacity: 0.4 + (i % 6) * 0.1 }} />
          ))}
        </div>
      </div>

      {/* Genre DNA */}
      <div className={styles.card}>
        <Skeleton height="0.9rem" width="7rem" radius="4px" />
        <div className={styles.genreGrid}>
          <Skeleton height="7rem" radius="8px" style={{ gridColumn: 'span 2' }} />
          <Skeleton height="7rem" radius="8px" />
          <Skeleton height="7rem" radius="8px" />
        </div>
      </div>

      {/* Era timeline */}
      <div className={styles.card}>
        <Skeleton height="0.9rem" width="9rem" radius="4px" />
        <div className={styles.pillRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="2rem" width={`${4 + (i % 3)}rem`} radius="20px" />
          ))}
        </div>
      </div>

      {/* Loyal artists */}
      <div className={styles.card}>
        <Skeleton height="0.9rem" width="8rem" radius="4px" />
        <div className={styles.artistList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.artistRow}>
              <Skeleton width="40px" height="40px" radius="50%" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton height="0.85rem" width={`${60 - i * 6}%`} radius="4px" />
                <Skeleton height="0.65rem" width="40%" radius="4px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
