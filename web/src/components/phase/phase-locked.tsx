'use client'

import type { Phase } from '@/lib/phase/read'
import { LockedShell } from './locked-shell'
import type { KilitOzelligi } from '@/lib/quick-start/kilit-katalogu'
import styles from './phase-locked.module.css'

interface PhaseLockedProps {
  title: string
  /** Bu sayfanın açılması için gereken faz (2/3/4). */
  requiredPhase: Phase
  /** Kullanıcının bulunduğu faz. */
  currentPhase: Phase
  /** Faz 4'e bir dosya kaldıysa mesaj değişir. */
  partialPhase4?: boolean
  /** Katalog anahtarı */
  featureKey?: KilitOzelligi
}

export function PhaseLocked({
  title,
  requiredPhase,
  partialPhase4 = false,
  featureKey = 'gecmis',
}: PhaseLockedProps) {
  const actionAdim = requiredPhase <= 2 ? 'spotify' : 'zip'
  const missingZips = requiredPhase >= 4 ? (['account', 'technical'] as const) : (['streaming'] as const)

  let desc = 'This feature requires your Spotify Streaming History file to be uploaded.'
  if (requiredPhase <= 2) {
    desc = 'Connect your Spotify account to unlock your playlists, recent listening, and live stats.'
  } else if (requiredPhase >= 4) {
    desc = partialPhase4
      ? 'Almost there — upload your second export file to unlock deep lifetime analytics.'
      : 'Upload Account Data and Technical Log ZIP files to unlock deep lifetime analytics.'
  }

  return (
    <div className={styles.pageShell}>
      <LockedShell
        featureKey={featureKey}
        isLocked={true}
        actionAdim={actionAdim}
        missingZips={missingZips}
        title={title}
        description={desc}
      >
        <div className={styles.skeletonHero}>
          <div className={styles.skeletonLineSm} />
          <div className={styles.skeletonLineLg} />
          <div className={styles.skeletonLineMd} />
        </div>

        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>

        <div className={styles.skeletonList}>
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      </LockedShell>
    </div>
  )
}
