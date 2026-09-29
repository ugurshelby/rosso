'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/provider'
import styles from './journey-card.module.css'

// FAZ D (2026-07-19, big-changes.md): kilit sistemi kaldırıldı — Journey
// artık anket tamamlanmasına bağlı değil, recap verisi oldukça açık.
// Kart tek durumlu: her zaman "yolculuğa git".
export function JourneyCard() {
  const { t } = useT()
  return (
    <Link
      href="/journey"
      className={`${styles.card} ${styles.cardUnlocked}`}
      aria-label={t('journey.card.ariaLabel')}
    >
      {/* Üç katmanlı atmosfer — hepsi dekoratif, hiçbiri DOM'a içerik eklemiyor.
          Sıra önemli: ışık altta, ızgara üstünde, metin en üstte. */}
      <div className={styles.unlockedGlow} aria-hidden />
      <div className={styles.horizon} aria-hidden />
      <div className={styles.content}>
        <span className={styles.eyebrow}>{t('journey.card.eyebrow')}</span>
        <span className={styles.title}>{t('journey.card.title')}</span>
        <p className={styles.body}>{t('journey.card.body')}</p>
        <span className={styles.cta}>
          {t('journey.card.cta')} <span className={styles.ctaArrow} aria-hidden>→</span>
        </span>
      </div>
    </Link>
  )
}
