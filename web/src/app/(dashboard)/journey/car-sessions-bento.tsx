import { getCarSessionsSummary } from '@/lib/journey/car-sessions'
import { LockedPreview } from '@/components/ui/locked-preview'
import { getT } from '@/lib/i18n/server'
import styles from '@/components/journey/journey-view.module.css'

export async function CarSessionsBento({
  userId,
  hasL3,
}: {
  userId: string
  hasL3: boolean
}) {
  const { t } = await getT()

  if (!hasL3) {
    return (
      <LockedPreview
        badgeLabel={t('journey.carSessions.lockedBadge')}
        title={t('journey.carSessions.title')}
        description={t('journey.carSessions.lockedDescription')}
        ctaText={t('journey.carSessions.lockedCta')}
        href="/data"
      >
        {/* Kilitliyken arkada duran, aria-hidden dekoratif önizleme —
            gerçek veri değil, örnek istatistikler. Bilinçli olarak
            çevrilmedi (bkz. journey-preview-backdrop.tsx ile aynı desen). */}
        <div
          className={styles.carBentoCard}
          style={{ opacity: 0.45, pointerEvents: 'none' }}
          aria-hidden
        >
          <div className={styles.carBentoHeader}>
            <h3 className={styles.carBentoTitle}>{t('journey.carSessions.title')}</h3>
            <span className={styles.carBentoStat}>42.8 hours / 86 sessions</span>
          </div>
          <div className={styles.carBentoTracks}>
            <div className={styles.carBentoTrackItem}>
              <div className={styles.carBentoTrackInfo}>
                <span className={styles.carBentoTrackTitle}>Nightcall</span>
                <span className={styles.carBentoTrackArtist}>Kavinsky</span>
              </div>
              <span className={styles.carBentoTrackPlays}>34 plays</span>
            </div>
          </div>
        </div>
      </LockedPreview>
    )
  }

  const carSessions = await getCarSessionsSummary(userId)
  if (!carSessions) return null

  const nf = new Intl.NumberFormat('en-US')

  return (
    <div className={styles.carBentoCard}>
      <div className={styles.carBentoHeader}>
        <h3 className={styles.carBentoTitle}>{t('journey.carSessions.title')}</h3>
        <span className={styles.carBentoStat}>
          {t('journey.carSessions.statLine', { hours: nf.format(carSessions.hours), sessions: carSessions.sessions })}
        </span>
      </div>
      <div className={styles.carBentoTracks}>
        {carSessions.topTracks.length > 0 ? (
          carSessions.topTracks.map((track, idx) => (
            <div key={idx} className={styles.carBentoTrackItem}>
              <div className={styles.carBentoTrackInfo}>
                <span className={styles.carBentoTrackTitle}>{track.title}</span>
                <span className={styles.carBentoTrackArtist}>{track.artist}</span>
              </div>
              <span className={styles.carBentoTrackPlays}>
                {t('journey.carSessions.playsUnit', { count: track.plays })}
              </span>
            </div>
          ))
        ) : (
          <div className={styles.carBentoEmpty}>{t('journey.carSessions.empty')}</div>
        )}
      </div>
    </div>
  )
}
