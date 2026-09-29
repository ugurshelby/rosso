import { Skeleton } from '@/components/ui/skeleton'
import styles from './settings-loading.module.css'

export default function SettingsLoading() {
  return (
    <div className={styles.page}>
      {/* Profil kartı */}
      <div className={styles.card}>
        <div className={styles.avatarRow}>
          <Skeleton width="64px" height="64px" radius="50%" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <Skeleton height="1.1rem" width="9rem" radius="6px" />
            <Skeleton height="0.75rem" width="12rem" radius="4px" />
          </div>
        </div>
      </div>

      {/* Platform bağlantıları */}
      <div className={styles.card}>
        <Skeleton height="0.85rem" width="8rem" radius="4px" />
        <div className={styles.platformList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.platformRow}>
              <Skeleton width="32px" height="32px" radius="8px" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton height="0.85rem" width="6rem" radius="4px" />
                <Skeleton height="0.65rem" width="4rem" radius="4px" />
              </div>
              <Skeleton height="1.75rem" width="5rem" radius="20px" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Aksiyon listesi */}
      <div className={styles.card}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.actionRow}>
            <Skeleton height="0.85rem" width={`${8 + i * 2}rem`} radius="4px" />
            <Skeleton height="0.75rem" width="1rem" radius="4px" />
          </div>
        ))}
      </div>

      {/* Tehlike bölgesi */}
      <div className={`${styles.card} ${styles.cardDanger}`}>
        <Skeleton height="0.85rem" width="7rem" radius="4px" />
        <Skeleton height="0.75rem" width="18rem" radius="4px" />
        <Skeleton height="2rem" width="8rem" radius="6px" style={{ marginTop: '0.25rem' }} />
      </div>
    </div>
  )
}
