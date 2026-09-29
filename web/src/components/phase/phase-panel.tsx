'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Compass,
  Sparkles,
  Disc,
  Car,
  HeartHandshake,
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PHASE_CONTENT, CONTENT_VERSION, type PhaseSlide } from '@/content/phases'
import type { Phase } from '@/lib/phase/read'
import styles from './phase-panel.module.css'

interface PhasePanelProps {
  phase: Phase
}

function renderSlideIcon(icon?: string) {
  switch (icon) {
    case 'journey':
      return <Compass size={22} className={styles.slideIcon} aria-hidden="true" />
    case 'recap':
      return <Sparkles size={22} className={styles.slideIcon} aria-hidden="true" />
    case 'genre':
      return <Disc size={22} className={styles.slideIcon} aria-hidden="true" />
    case 'car':
      return <Car size={22} className={styles.slideIcon} aria-hidden="true" />
    case 'library':
      return <HeartHandshake size={22} className={styles.slideIcon} aria-hidden="true" />
    case 'inferences':
      return <Activity size={22} className={styles.slideIcon} aria-hidden="true" />
    default:
      return <Sparkles size={22} className={styles.slideIcon} aria-hidden="true" />
  }
}

/**
 * Rosso Büyüyen Kimlik — Seviye Atlama Kutlama Paneli (Level-Up Experience).
 *
 * Apple Design prensiplerine uygun, #16141F Liquid Glass zeminli,
 * yatay kaydırılabilir carousel kartlarıyla açılan yeni özellikleri tanıtan
 * kutlama modali.
 */
export function PhasePanel({ phase }: PhasePanelProps) {
  const content = PHASE_CONTENT[phase]
  const [open, setOpen] = useState(true)
  const [index, setIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const mark = useCallback(
    async (action: 'seen' | 'snooze' | 'dismiss') => {
      try {
        const supabase = createClient()
        await (
          supabase.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<unknown>
        )('mark_phase_announcement', {
          p_phase: phase,
          p_action: action,
          p_version: CONTENT_VERSION,
        })
      } catch {
        // Panel kapanışı kullanıcıyı engellemez — sessizce geç.
      }
    },
    [phase],
  )

  const close = useCallback(
    (action: 'snooze' | 'dismiss') => {
      setOpen(false)
      void mark(action)
    },
    [mark],
  )

  // Focus trap, Esc ve ilk odak
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close('snooze')
        return
      }
      if (e.key === 'ArrowRight') {
        setIndex((i) => Math.min(i + 1, (content?.slides.length ?? 1) - 1))
      }
      if (e.key === 'ArrowLeft') {
        setIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key !== 'Tab') return

      const root = dialogRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close, content?.slides.length])

  if (!open || !content) return null

  const slides: PhaseSlide[] = content.slides
  const slide = slides[index]
  const isLast = index === slides.length - 1

  return (
    <div
      className={styles.overlay}
      onClick={() => close('snooze')}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phase-panel-heading"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapat Butonu */}
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={() => close('snooze')}
          aria-label="Kapat"
        >
          <X size={18} strokeWidth={2} />
        </button>

        {/* Seviye Atlama Rozeti */}
        <div className={styles.levelBadgeRow}>
          <span className={styles.levelBadge}>
            <Sparkles size={12} className={styles.sparkleIcon} aria-hidden="true" />
            <span>{content.levelBadge}</span>
          </span>
        </div>

        {/* Ana Başlık & Özet */}
        <h2 id="phase-panel-heading" className={styles.heading}>
          {content.heading}
        </h2>
        <p className={styles.summary}>{content.summary}</p>

        {/* ── Carousel Slide Kartı ── */}
        <div className={styles.carouselWrap}>
          <div key={index} className={styles.slideCard}>
            <div className={styles.slideTop}>
              <div className={styles.iconCircle}>
                {renderSlideIcon(slide.icon)}
              </div>
              <span className={styles.slideStep}>
                {index + 1} / {slides.length}
              </span>
            </div>

            <h3 className={styles.slideTitle}>{slide.title}</h3>
            <p className={styles.slideBody}>{slide.body}</p>

            {slide.href && slide.cta && (
              <Link
                href={slide.href}
                className={styles.slideAction}
                onClick={() => close('dismiss')}
              >
                <span>{slide.cta}</span>
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {/* ── Alt Bar (Dots & Aksiyon Butonları) ── */}
        <div className={styles.footer}>
          {/* Nokta Göstergesi */}
          {slides.length > 1 ? (
            <div className={styles.dots} aria-hidden="true">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={i === index ? styles.dotActive : styles.dot}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          ) : (
            <div />
          )}

          {/* Navigasyon / Kapatma */}
          <div className={styles.navActions}>
            {index > 0 && (
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                <span>Geri</span>
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => setIndex((i) => i + 1)}
              >
                <span>Devam</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className={styles.celebrateBtn}
                onClick={() => close('dismiss')}
              >
                <span>Keşfetmeye Başla</span>
                <Sparkles size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
