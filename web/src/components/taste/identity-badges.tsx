'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { getIdentityWordMeaning, displayIdentityWord } from '@/lib/taste/identity-word-meanings'
import { Compass, Infinity as InfinityIcon, Sparkles, ChevronRight, Layers } from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import type { Translator } from '@/lib/i18n/translate'
import styles from './identity-badges.module.css'

interface IdentityBadgesProps {
  words: string[]
  blurb?: string | null
  coveragePct?: number
  isMature?: boolean
  /**
   * Kişiye özel yorumlar (Katman D, AI): kimlik kelimesi → kullanıcının kendi sinyallerine
   * dayanan 1-2 cümle. Kelime için yorum yoksa elle küratlı `SHORT_ESSENCE` yedeği çizilir.
   */
  comments?: Record<string, string> | null
}

// Görünen özet metinler `messages/{en,tr}/taste.ts` → `identityBadges.essence`'te.
// Bu harita yalnız ham kimlik kelimesini (`identity-word-meanings`'ten gelir)
// sözlük anahtarına çevirir — GÖSTERİLMEZ.
const ESSENCE_KEY_MAP: Record<string, string> = {
  Deep: 'deep',
  Explorer: 'explorer',
  Patient: 'patient',
  Skipper: 'skipper',
  'In the Flow': 'inTheFlow',
  'In Control': 'inControl',
  Loyal: 'loyal',
  'Come and Go': 'comeAndGo',
  'Always Forward': 'alwaysForward',
  Dawn: 'dawn',
  Midday: 'midday',
  Twilight: 'twilight',
  'Night Owl': 'nightOwl',
  Constant: 'constant',
}

function getShortEssence(word: string, t: Translator['t']): string | null {
  const key = ESSENCE_KEY_MAP[word]
  return key ? t(`taste.identityBadges.essence.${key}` as Parameters<typeof t>[0]) : null
}

function getAxisIcon(axis?: string) {
  switch (axis) {
    case 'Behavior':
      return <Compass size={13} className={styles.axisIcon} aria-hidden />
    case 'Bond':
      return <InfinityIcon size={13} className={styles.axisIcon} aria-hidden />
    case 'Ritual':
      return <Sparkles size={13} className={styles.axisIcon} aria-hidden />
    default:
      return <Layers size={13} className={styles.axisIcon} aria-hidden />
  }
}

function getAxisLabel(axis: string | undefined, t: Translator['t']) {
  switch (axis) {
    case 'Behavior':
      return t('taste.identityBadges.axis.behavior')
    case 'Bond':
      return t('taste.identityBadges.axis.bond')
    case 'Ritual':
      return t('taste.identityBadges.axis.ritual')
    default:
      return axis ?? t('taste.identityBadges.axis.identity')
  }
}

export function IdentityBadges({ words, blurb, coveragePct, isMature, comments }: IdentityBadgesProps) {
  const { t } = useT()
  const [openWord, setOpenWord] = useState<string | null>(null)

  if (!words || words.length === 0) return null

  const growing = isMature === false && (coveragePct ?? 0) < 90

  return (
    <section className={styles.section} aria-label={t('taste.identityBadges.ariaLabel')}>
      <header className={styles.header}>
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrow}>{t('taste.identityBadges.eyebrow')}</span>
          <span className={styles.eyebrowTag}>{t('taste.identityBadges.eyebrowTag')}</span>
        </div>
        <h3 className={styles.title}>{t('taste.identityBadges.title')}</h3>
        <p className={styles.hint}>
          {t('taste.identityBadges.hint')}
        </p>
      </header>

      <ul className={styles.badges}>
        {words.map((word) => {
          const meaning = getIdentityWordMeaning(word)
          const essence =
            comments?.[word] ?? getShortEssence(word, t) ?? meaning?.meaning ?? t('taste.identityBadges.defaultEssence')

          return (
            <li key={word} className={styles.badgeItem}>
              <button
                type="button"
                className={styles.badge}
                onClick={() => setOpenWord(word)}
                aria-label={t('taste.identityBadges.detailAria', { word: displayIdentityWord(word) })}
              >
                <span className={styles.badgeGlow} aria-hidden />
                
                {/* Top Row: Axis Label + Glyphs */}
                <div className={styles.badgeTopRow}>
                  <div className={styles.badgeAxisWrap}>
                    {getAxisIcon(meaning?.axis)}
                    <span className={styles.badgeAxis}>{getAxisLabel(meaning?.axis, t)}</span>
                  </div>
                  <div className={styles.badgeArrowWrap} aria-hidden>
                    <ChevronRight size={14} className={styles.badgeArrow} />
                  </div>
                </div>

                {/* Center: Luminous Word */}
                <div className={styles.badgeBody}>
                  <span className={styles.badgeWord}>{displayIdentityWord(word)}</span>
                  <p className={styles.badgeEssence}>{essence}</p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {blurb && <p className={styles.blurb}>{blurb}</p>}
      {growing && (
        <p className={styles.growing} role="status">
          {t('taste.identityBadges.growing')}
        </p>
      )}

      <Modal open={openWord !== null} onClose={() => setOpenWord(null)} title={openWord ?? ''} hideTitleText>
        {openWord && (() => {
          const meaning = getIdentityWordMeaning(openWord)
          return (
            <div className={styles.wordPanel}>
              <div className={styles.modalAxisBadge}>
                {getAxisIcon(meaning?.axis)}
                <span className={styles.modalAxisText}>{getAxisLabel(meaning?.axis, t)}</span>
              </div>
              <h4 className={styles.modalWordTitle}>{displayIdentityWord(openWord)}</h4>
              {comments?.[openWord] ? <p className={styles.wordPersonal}>{comments[openWord]}</p> : null}
              <p className={styles.wordMeaning}>
                {meaning?.meaning ?? t('taste.identityBadges.defaultMeaning')}
              </p>
              <div className={styles.modalFooterNote}>
                <span>{t('taste.identityBadges.footerNote')}</span>
              </div>
            </div>
          )
        })()}
      </Modal>
    </section>
  )
}
