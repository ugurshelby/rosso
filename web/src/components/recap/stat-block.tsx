import styles from '@/app/(dashboard)/recap/recap.module.css'

interface StatBlockProps {
  totalMs: number
  totalTracks: number
  totalArtists: number
}

function formatMs(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  if (hours === 0) {
    const minutes = Math.floor(ms / 60000)
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`
  }
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

export function StatBlock({
  totalMs,
  totalTracks,
  totalArtists,
}: StatBlockProps) {
  const timeLabel = formatMs(totalMs)

  return (
    <section className={styles.heroBlock} aria-label="Toplam dinleme suresi">
      <p
        className={styles.heroDisplay}
        aria-label={`Toplam dinleme suresi: ${timeLabel}`}
      >
        {timeLabel}
      </p>
      <p className={styles.heroLabel}>Total listening time</p>

      <div className={styles.heroSecondaryRow} role="list">
        <div className={styles.heroSecondaryStat} role="listitem">
          <span className={styles.heroSecondaryValue}>{totalTracks.toLocaleString('en-US')}</span>
          <span className={styles.heroSecondaryLabel}>Track</span>
        </div>
        <div className={styles.heroSecondaryStat} role="listitem">
          <span className={styles.heroSecondaryValue}>{totalArtists.toLocaleString('en-US')}</span>
          <span className={styles.heroSecondaryLabel}>Artist</span>
        </div>
      </div>
    </section>
  )
}
