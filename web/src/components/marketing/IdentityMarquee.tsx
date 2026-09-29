'use client'

import { useEffect, useRef, useState } from 'react'
import type { Dil } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import styles from '@/app/(marketing)/marketing.module.css'

// Kelimeler (`SOZLUK[dil].kimlikSeridi`) rosso-recap-module.md §4'teki
// "Persona Motoru & Karakterizasyon Matrisi" tablosundan geliyor — jenerik bir
// "features" şeridi değil, Rosso'nun persona motorunun gerçek çıktıları. Yeni
// sinyal kombinasyonu eklendikçe (§4 tablosu genişledikçe) İKİ dile de
// eklenmeli; tek doğru kaynak §4'tür.

const MARQUEE_TONES = ['rose', 'violet', 'wine', 'silver'] as const

export function IdentityMarquee({ dil = 'tr' }: { dil?: Dil }) {
  const { kelimeler, ekranOkuyucu } = SOZLUK[dil].kimlikSeridi
  // İki kopya art arda — CSS animasyonu -50% kaydığında dikişsiz döngüye giriyor.
  const LOOP = [...kelimeler, ...kelimeler]
  const wrapRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setPaused(!entry?.isIntersecting),
      { threshold: 0.05, rootMargin: '40px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapRef} className={styles.marqueeWrap}>
      <span className="sr-only">
        {ekranOkuyucu}
        {kelimeler.join(', ')}.
      </span>
      <div
        className={`${styles.marqueeTrack} ${paused ? styles.marqueeTrackPaused : ''}`}
        aria-hidden="true"
      >
        {LOOP.map((word, i) => {
          const tone = MARQUEE_TONES[i % MARQUEE_TONES.length]
          return (
            <span
              key={`${word}-${i}`}
              className={`${styles.marqueeItem} ${styles[`marqueeTone${tone}`]}`}
            >
              {word}
              <span className={styles.marqueeDot} aria-hidden />
            </span>
          )
        })}
      </div>
    </div>
  )
}
