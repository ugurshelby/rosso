'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import type { JourneyKapanisi } from '@/lib/analytics/editorial-read'
import { useT } from '@/lib/i18n/provider'
import styles from './journey-finale.module.css'

interface JourneyFinaleProps {
  /** AI kapanış metni. Yoksa eski iki satırlık kapanış çizilir. */
  closing?: JourneyKapanisi | null
  startYear?: number
  endYear?: number
  onRestart: () => void
}

/**
 * Journey kapanış sahnesi — "Yolculuk devam ediyor".
 *
 * Sahip: "tıpkı bir final bölümü, kapanış sahnesi gibi" — kısa bir slogan değil,
 * kullanıcının müzik geçmişini ona anlatan bir metin. Tasarım da buna göre: metin
 * paragraf paragraf, sırayla "belirerek" (opacity + blur + hafif kayma, tek yumuşak
 * eğri) okunur; son cümle ayrı, büyük ve sessiz bir kapanış vuruşu olur.
 *
 * Kapanış metni YOKSA (AI kapalı/üretilmedi) eski sahne aynen çizilir — ekran eksiksiz.
 * Hareket yalnız opacity/transform/filter; `prefers-reduced-motion`'da hiç hareket yok,
 * metin doğrudan görünür.
 */
export function JourneyFinale({ closing, startYear, endYear, onRestart }: JourneyFinaleProps) {
  const reduced = usePrefersReducedMotion()
  const kokRef = useRef<HTMLDivElement>(null)
  const [gorundu, setGorundu] = useState(false)
  const { t } = useT()

  useEffect(() => {
    const el = kokRef.current
    if (!el || reduced) return
    if (typeof IntersectionObserver === 'undefined') {
      // Gözlemci yoksa metin gizli kalmasın; state güncellemesi efektin dışına (bir sonraki kareye) alınır.
      const kare = requestAnimationFrame(() => setGorundu(true))
      return () => cancelAnimationFrame(kare)
    }
    const io = new IntersectionObserver(
      (kayitlar) => {
        if (kayitlar.some((k) => k.isIntersecting)) {
          setGorundu(true)
          io.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  const metin = closing?.tr ?? null
  const gorunur = reduced || gorundu

  return (
    <section className={styles.finale} aria-label={t('journey.finale.ariaLabel')}>
      <div className={styles.horizon} aria-hidden />
      <div className={styles.body}>
        <span className={styles.eyebrow}>Yolculuk devam ediyor</span>
        {startYear && endYear && startYear !== endYear ? (
          <span className={styles.span} aria-label={`${startYear} ile ${endYear} arası`}>
            {startYear} <span aria-hidden>—</span> {endYear}
          </span>
        ) : null}

        {metin ? (
          <div ref={kokRef} className={styles.story} data-visible={gorunur ? 'true' : 'false'}>
            {metin.paragraphs.map((p, i) => (
              <p key={i} className={styles.paragraph} style={{ ['--i' as string]: i }}>
                {p}
              </p>
            ))}
            <p className={styles.lastLine} style={{ ['--i' as string]: metin.paragraphs.length + 1 }}>
              {metin.last_line}
            </p>
          </div>
        ) : (
          <p className={styles.fallbackLine}>
            Every listen is a new line —
            <br />
            the story doesn’t end here.
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.restart} onClick={onRestart} aria-label={t('journey.finale.restartAriaLabel')}>
            <span aria-hidden>↑</span>
            <span>{t('journey.finale.restartLabel')}</span>
          </button>
          <Link href="/recap" className={styles.cta}>
            {t('journey.finale.backToArchive')}
          </Link>
        </div>
      </div>
    </section>
  )
}
