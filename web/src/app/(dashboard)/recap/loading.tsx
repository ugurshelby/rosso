import { Skeleton } from '@/components/ui/skeleton'
import styles from './recap-loading.module.css'

export default function RecapLoading() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Skeleton height="0.75rem" width="5rem" radius="4px" />
        <Skeleton height="2rem" width="12rem" radius="6px" style={{ marginTop: '0.5rem' }} />
        <Skeleton height="0.85rem" width="20rem" radius="4px" style={{ marginTop: '0.75rem' }} />
      </div>

      {/* Son recap çifti */}
      <div className={styles.latestGrid}>
        <div className={styles.recapCard}>
          <Skeleton height="0.7rem" width="4rem" radius="4px" />
          <Skeleton height="1.5rem" width="8rem" radius="6px" style={{ marginTop: '0.75rem' }} />
        </div>
        <div className={styles.recapCard}>
          <Skeleton height="0.7rem" width="4rem" radius="4px" />
          <Skeleton height="1.5rem" width="8rem" radius="6px" style={{ marginTop: '0.75rem' }} />
        </div>
      </div>

      {/* Arşiv — yıl bölümü: yıl başlığı + yıllık kart + aylık grid */}
      <div className={styles.section}>
        <Skeleton height="0.75rem" width="3rem" radius="4px" />
        <Skeleton height="1.5rem" width="4.5rem" radius="6px" />
        <div className={styles.recapCard} style={{ minHeight: '5.5rem' }}>
          <Skeleton height="0.7rem" width="5rem" radius="4px" />
          <Skeleton height="1.5rem" width="6rem" radius="6px" style={{ marginTop: '0.75rem' }} />
        </div>
        <div className={styles.bento}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.bentoCard}>
              <Skeleton height="0.8rem" width="5rem" radius="4px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
