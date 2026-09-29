'use client'

import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import { useCountUp } from '@/lib/hooks/use-count-up'
import { useT } from '@/lib/i18n/provider'
import type { Translator } from '@/lib/i18n/translate'
import styles from './discovery-score-card.module.css'

interface DiscoveryScoreCardProps {
  score: number
  genreCount: number
  /** Bu ay dinlenen benzersiz track sayısı — somut anlatı için (2026-07-17,
   *  Sahip: "6 kapak görüyorum ama bana ne anlattığını anlamıyorum"). */
  vaultTracks: number
}

type ScoreKey = 'explorer' | 'curious' | 'selective' | 'loyal' | 'focused'

function getScoreKey(score: number): ScoreKey {
  if (score >= 80) return 'explorer'
  if (score >= 60) return 'curious'
  if (score >= 40) return 'selective'
  if (score >= 20) return 'loyal'
  return 'focused'
}

/**
 * Keşif skoru TEK bir metriktir — kategori değil. Tek renkli grafikler
 * mor yoğunluk rampasını kullanır (dashboard-design.md §3.6); kategori
 * renkleri (§3.6 tablosu) yalnız tür ayrımı içindir.
 *
 * Skor yükseldikçe halka doygunlaşır: düşük skor sönük, yüksek skor parlak.
 * Eski sürüm yeşil/mavi/amber/mor karışımı veriyordu — dört ayrı renk ailesi,
 * tek renkli arayüz diliyle çelişiyordu (2026-08-01 müfettiş denetimi).
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--v1)'
  if (score >= 60) return 'var(--v2)'
  if (score >= 40) return 'var(--v3)'
  return 'var(--v4)'
}

function getScoreLabel(key: ScoreKey, t: Translator['t']): string {
  return t(`taste.discoveryScore.scoreLabels.${key}` as Parameters<typeof t>[0])
}

function getScoreStory(key: ScoreKey, t: Translator['t']): string {
  return t(`taste.discoveryScore.stories.${key}` as Parameters<typeof t>[0])
}

export function DiscoveryScoreCard({ score, genreCount, vaultTracks }: DiscoveryScoreCardProps) {
  const { t } = useT()
  const reduced = usePrefersReducedMotion()
  const scoreKey = getScoreKey(score)
  const label = getScoreLabel(scoreKey, t)
  const color = getScoreColor(score)
  const circumference = 2 * Math.PI * 22
  const dash = (score / 100) * circumference
  const story = getScoreStory(scoreKey, t)
  const scoreCount = useCountUp(score)
  const genreCount_ = useCountUp(genreCount)
  const vaultTracksCount = useCountUp(vaultTracks)

  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{t('taste.discoveryScore.label')}</span>

      <div className={styles.body}>
        {/* Ring */}
        <div className={styles.ringWrap} aria-hidden>
          <svg viewBox="0 0 52 52" className={styles.ringSvg} aria-hidden>
            {/* Track */}
            <circle
              cx="26" cy="26" r="22"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="3.5"
            />
            {/* Progress */}
            <circle
              cx="26" cy="26" r="22"
              fill="none"
              stroke={color}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={circumference * 0.25}
              style={{
                // ⚠ `${color}88` alfa eki CSS değişkeniyle çalışmaz
                // (var(--v1)88 geçersiz) — glow rampanın kendi alfasından gelir.
                filter: 'drop-shadow(0 0 4px var(--glow))',
                transition: reduced ? 'none' : 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </svg>
          {/* İstatistik sayısı accent/renk almaz (§3.1) — veri olarak okunur. */}
          <span className={styles.ringScore}>{scoreCount}</span>
        </div>

        <div className={styles.info}>
          <p className={styles.scoreLabel} style={{ color }}>{label}</p>
          <p className={styles.genreCount}>
            <span className={styles.genreNum}>{genreCount_}</span>
            <span className={styles.genreSub}>{t('taste.discoveryScore.genre')}</span>
          </p>
        </div>
      </div>

      {/* Somut anlatı — sayısal halka tek başına ne anlama geldiğini
          söylemiyordu (2026-07-17, Sahibin gözlemi). */}
      {story && <p className={styles.story}>{story}</p>}
      <p className={styles.factRow}>
        {t('taste.discoveryScore.factRowPrefix')} <strong>{vaultTracksCount}</strong> {t('taste.discoveryScore.factRowSongs')}, <strong>{genreCount_}</strong> {t('taste.discoveryScore.factRowGenres')}.
      </p>
    </div>
  )
}
