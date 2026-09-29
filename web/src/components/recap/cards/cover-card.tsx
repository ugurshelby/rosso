'use client'

import { motion, useReducedMotion } from 'motion/react'
import { recapCoverArtSrc, type RecapCoverArtId } from '@/lib/recap/cover-art'
import { springFor, SPRING_REVEAL } from '@/lib/motion/apple-spring'
import styles from './cover-card.module.css'

/**
 * Kart 1 — "Kitap Kapağı / Prestijli Dergi Kapağı" (FAZ R0.1, 2026-07-20).
 *
 * Sahibin tarifi ★ KABUL KRİTERİDİR — maddeler tek tek karşılanır:
 *   · "Bu kart bir veri kartı değil, bir KAPI" → tek nesne: dönem + künye
 *   · Devasa, jilet gibi net yıl (Archivo Black), sola yaslı asimetrik
 *   · Yıl sayısının HEMEN ALTINDA Geist Mono künye etiketi
 *   · Görsel ham/çiğ basılmaz: progressive blur + yoğun scrim → soyut,
 *     derin, "rengini görselden alan lüks kumaş" (CSS'te)
 *   · Motion AYRIŞIR: zemin yumuşak spring ile açılır, yıl "kağıda
 *     basılıyormuş gibi" SERT ve kararlı bir opaklıkla oturur
 *
 * Algoritmik yorum cümlesi YOK (design.md §1 kalıcı felsefe kararı).
 */
export function CoverCard({
  title,
  coverArtId,
  issueLabel,
  tags,
}: {
  /** Yıllıkta "2025", aylıkta "Aralık 2026". */
  title: string
  coverArtId: RecapCoverArtId
  /** "ANNUAL ARCHIVE" | "MONTHLY ISSUE" — donmuş payload'dan gelir. */
  issueLabel: string
  /**
   * Bu recap'e özel etiketler (Katman D): ortak, önceden hazırlanmış TR+EN havuzdan AI'ın
   * SEÇTİĞİ tür / mood / tempo / karakter / dönem etiketleri. Yoksa satır hiç çizilmez.
   * Recap ekranları İngilizce olduğu için `en` gösterilir; `tr` dil seçeneği için hazır.
   */
  tags?: Array<{ slug: string; en: string; tr: string }>
}) {
  const reduced = useReducedMotion()

  const src = recapCoverArtSrc(coverArtId)

  return (
    <div className={styles.frame}>
      {/* Arka plan aynası: aynı görselin blur'lu/doygun kopyası. Bu kopya
          kırpılır (cover) — sorun değil, çünkü zemin olarak soyut bir renk
          alanı görevi görüyor. Kullanıcının gördüğü "gerçek" görsel aşağıdaki
          contain'li olan. */}
      <div className={styles.mirror}>
        {/* eslint-disable-next-line @next/next/no-img-element -- journey-view.tsx ile aynı desen */}
        <img src={src} alt="" />
      </div>
      <div className={styles.scrim} />

      <div className={styles.content}>
        {/* Ön plan: KESİLMEYEN kare görsel (object-fit: contain). Zemin gibi
            yumuşak spring ile açılır. */}
        <motion.div
          className={styles.art}
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springFor(!!reduced, SPRING_REVEAL)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- journey-view.tsx ile aynı desen */}
          <img src={src} alt="" />
        </motion.div>

        <div className={styles.text}>
          {/* Yıl: SERT ve kararlı fade — yaylanma YOK, kağıda basılır gibi. */}
          <motion.h1
            className={styles.title}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.22, delay: 0.18, ease: [0.9, 0, 0.1, 1] }
            }
          >
            {title}
          </motion.h1>

          <motion.p
            className={styles.issueLabel}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={
              reduced ? { duration: 0 } : { duration: 0.3, delay: 0.34, ease: 'easeOut' }
            }
          >
            {issueLabel}
          </motion.p>

          {tags && tags.length > 0 ? (
            <ul className={styles.tags} aria-label="Period tags">
              {tags.map((t, i) => (
                <motion.li
                  key={t.slug}
                  className={styles.tag}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduced ? { duration: 0 } : { duration: 0.4, delay: 0.5 + i * 0.07, ease: [0.16, 1, 0.3, 1] }
                  }
                >
                  {t.en}
                </motion.li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
