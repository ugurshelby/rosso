'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { recapCoverArtSrc, type RecapCoverArtId } from '@/lib/recap/cover-art'
import { springFor, SPRING_UI } from '@/lib/motion/apple-spring'
import { useT } from '@/lib/i18n/provider'
import styles from './placard-card.module.css'

export interface PlacardData {
  volumeLabel: string
  /**
   * "ANNUAL ARCHIVE" | "MONTHLY ISSUE" — Kart 1 (kapak) ile AYNI kaynaktan
   * (donmuş payload `cover.issue_label`, worker `period_type`'a göre yazar).
   * Eskiden bu satırda "ANNUAL ARCHIVE" sabit yazılıydı: aylık recap'in kapağı
   * "MONTHLY ISSUE" derken final kartı "ANNUAL ARCHIVE" diyordu — deste kendi
   * içinde çelişiyordu (2026-08-14 kullanıcı testi, K-2).
   */
  issueLabel: string
  minutes: number
  tracks: number
  artists: number
  coverArtId: RecapCoverArtId
  /**
   * Editoryal karakter (Katman D, §6.1) — "Night Owl · Monolithic · Dystopian" + tek
   * beklenmedik gözlem. AI üretemediyse YOK; kart aynen eskisi gibi çizilir.
   */
  character?: { words: string[]; stat: string | null } | null
}

const nf = new Intl.NumberFormat('en-US')

/**
 * Kart 13 — Kapanış. YENİDEN BAŞTAN (2026-08-11).
 *
 * Sahip: "son ekranımız olan placard'da daha heroic ve the end havasında
 * olsun." Eski hâl sakin bir "künye" gibiydi (küçük kapak + istatistik
 * listesi). Yeni fikir: kapak sanatı hem arka plana devasa bir ambient
 * olarak yayılıyor hem önplanda net kalıyor (obsession-card'ın §9 tek
 * katman deseni), "ROSSO {yıl/dönem}" bir final jeneriği gibi devasa
 * tipografiyle kapanıyor, istatistikler sessiz bir alt bant.
 */
export function PlacardCard({ data }: { data: PlacardData }) {
  const reduced = useReducedMotion()
  const { t } = useT()
  const src = recapCoverArtSrc(data.coverArtId)

  return (
    <div className={styles.frame}>
      <div
        className={styles.ambient}
        style={{ backgroundImage: `url(${src})` }}
        aria-hidden
      />
      <div className={styles.scrim} aria-hidden />

      <motion.div
        className={styles.layout}
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springFor(!!reduced, SPRING_UI)}
      >
        <figure className={styles.artStage}>
          <Image
            src={src}
            alt={t('recap.placard.coverAlt')}
            fill
            className={styles.art}
            sizes="(min-width: 768px) 320px, 62vw"
            style={{ objectFit: 'contain' }}
          />
        </figure>

        <div className={styles.finale}>
          <span className={styles.eyebrow}>ROSSO {data.issueLabel} · {data.volumeLabel}</span>
          <h2 className={styles.theEnd}>ON THE RECORD</h2>
          {data.character ? (
            <div className={styles.character}>
              <p className={styles.characterWords}>{data.character.words.join(' · ')}</p>
              {data.character.stat ? <p className={styles.characterStat}>{data.character.stat}</p> : null}
            </div>
          ) : null}
        </div>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            {nf.format(data.minutes)}
            <span className={styles.metaLabel}>minutes</span>
          </span>
          <span className={styles.metaDot} aria-hidden>
            ·
          </span>
          <span className={styles.metaItem}>
            {nf.format(data.tracks)}
            <span className={styles.metaLabel}>tracks</span>
          </span>
          <span className={styles.metaDot} aria-hidden>
            ·
          </span>
          <span className={styles.metaItem}>
            {nf.format(data.artists)}
            <span className={styles.metaLabel}>artists</span>
          </span>
        </div>
      </motion.div>

      <Link href="/recap" className={styles.exportTag}>
        {t('recap.placard.backToArchive')}
      </Link>
    </div>
  )
}
