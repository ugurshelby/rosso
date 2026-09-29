'use client'

import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import type { Streak } from '@/lib/profile/queries'
import { useT } from '@/lib/i18n/provider'
import styles from './streak-card.module.css'

interface StreakCardProps {
  streak: Streak
}

/** Dinleme serisi. Tür dengesi Taste'teki Tür DNA bölümünde zaten var, taşınmadı. */
export function StreakCard({ streak }: StreakCardProps) {
  const reduced = usePrefersReducedMotion()
  const { t } = useT()

  return (
    <div className={styles.grid}>
      {/* ── Streak — flame glassmorphism ── */}
      <div className={`${styles.card} ${styles.streakCard}`}>
        {/* Flame glow background */}
        <div className={styles.flameGlow} aria-hidden />

        {/* Animated flame icon */}
        <div className={`${styles.flameWrap} ${reduced ? styles.flameStatic : ''}`} aria-hidden>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={styles.flameSvg}
            aria-hidden
          >
            {/* Dış alev */}
            <path
              d="M12 2C12 2 7 8 7 13a5 5 0 0 0 10 0c0-3-2-5-2-5s1 3-1 5c-1.5 0-3-1.5-3-3 0-2 1-4 1-4z"
              fill="url(#flameOuter)"
              className={styles.flamePathOuter}
            />
            {/* İç alev — daha parlak */}
            <path
              d="M12 8c0 0-2 3-2 5.5a2 2 0 0 0 4 0C14 11 12 8 12 8z"
              fill="url(#flameInner)"
              className={styles.flamePathInner}
            />
            <defs>
              {/* Alev artık amber/kırmızı DEĞİL — tek renkli arayüz dili
                  (dashboard-design.md §3.6). Rampa dıştan içe doygunlaşır;
                  "yanan" hissi renk sıcaklığından değil parlaklık farkından
                  gelir. (2026-08-01 müfettiş denetimi: 5 hardcoded hex.) */}
              <linearGradient id="flameOuter" x1="12" y1="2" x2="12" y2="18" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="var(--accent-hover)" />
                <stop offset="50%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--v3)" />
              </linearGradient>
              <linearGradient id="flameInner" x1="12" y1="8" x2="12" y2="15" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="var(--text)" />
                <stop offset="100%" stopColor="var(--accent-hover)" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {streak.currentDays > 0 ? (
          <>
            <span className={styles.streakValue}>{streak.currentDays}</span>
            <span className={styles.streakLabel}>{t('taste.streak.ongoingNow')}</span>
            <span className={styles.streakSubValue}>{t('taste.streak.record', { days: streak.longestDays })}</span>
          </>
        ) : (
          <>
            <span className={styles.streakValue}>{streak.longestDays}</span>
            <span className={styles.streakLabel}>{t('taste.streak.longestStreak')}</span>
          </>
        )}
      </div>
    </div>
  )
}
