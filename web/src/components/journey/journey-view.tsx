'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  getJourneyYearColors,
  applyYearCharacter,
} from '@/lib/journey/palette'
import {
  yilSahnesi,
  yolculukUclari,
} from '@/lib/journey/yil-sahnesi'
import { displayTrackTitle } from '@/lib/journey/display-title'
import {
  getYearPalette,
  type JourneyArc,
  type JourneyCover,
  type JourneyYear,
  type YearPalette,
} from '@/lib/journey/types'
import type { VibeCardId } from '@/lib/vibe-cards/data'
import type { JourneyKapanisi, JourneyYilHikayesi } from '@/lib/analytics/editorial-read'
import { useT } from '@/lib/i18n/provider'
import { TectonicSplit } from './tectonic-split'
import { JourneyHero } from './journey-hero'
import { JourneyOrigin } from './journey-origin'
import { YearRail } from './year-rail'
import { JourneyArtwork } from './journey-artwork'
import { YearScene } from './scenes/year-scene'
import { JourneyFinale } from './journey-finale'
import styles from './journey-view.module.css'

interface JourneyViewProps {
  arc: JourneyArc
  years: JourneyYear[]
  covers: Record<number, JourneyCover[]>
  vibeCardId: VibeCardId
  userId: string
  hasL3: boolean
  carSessionsNode?: React.ReactNode
  /** Editoryal yıl notu + hikâye satırları (Katman D). Boş = AI üretmedi; yedek/gizleme devreye girer. */
  yearNotes?: Record<number, JourneyYilHikayesi>
  /** "Yolculuk devam ediyor" kapanış metni (Katman D). Yoksa eski iki satır. */
  closing?: JourneyKapanisi | null
}

function formatPlayedAt(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * JourneyView — Bağımsız Sinematik Ritüel (recap-journey-design.md §0)
 * Dikey zaman nehrinde her yıl veriye dayalı 5 kompozisyondan biriyle açılır.
 * Scroll hijacking ve kesintisiz döngü animasyonları yasaktır.
 */
export function JourneyView({
  arc,
  years,
  covers,
  vibeCardId,
  userId,
  hasL3: _hasL3,
  carSessionsNode,
  yearNotes: _yearNotes,
  closing,
}: JourneyViewProps) {
  const { t } = useT()

  const uclar = useMemo(() => yolculukUclari(years), [years])

  const sahneler = useMemo(() => {
    const m = new Map<number, ReturnType<typeof yilSahnesi>>()
    years.forEach((y) => m.set(y.year, yilSahnesi(y, uclar)))
    return m
  }, [years, uclar])

  const palette = useMemo(() => {
    const m = new Map<number, ReturnType<typeof getJourneyYearColors>>()
    years.forEach((y, i) => {
      const temel = getJourneyYearColors(i, years.length)
      m.set(
        y.year,
        applyYearCharacter(temel, {
          intensity: uclar.enYuksekCalma > 0 ? y.playCount / uclar.enYuksekCalma : 0.5,
          discovery: y.discoveryRate,
          spread: uclar.enYuksekCesitlilik > 0 ? y.genreVariety / uclar.enYuksekCesitlilik : 0.5,
        }),
      )
    })
    return m
  }, [years, uclar])

  const totalPlays = years.reduce((s, y) => s + y.playCount, 0)
  const parsedFirstListenYear = new Date(arc.firstTrack.playedAt).getFullYear()
  const journeyStartYear = Number.isFinite(parsedFirstListenYear)
    ? parsedFirstListenYear
    : (years[0]?.year ?? new Date().getFullYear())
  const journeyEndYear = years[years.length - 1]?.year ?? new Date().getFullYear()

  const originArc = useMemo(() => {
    if (arc.firstTrack.trackId) return arc
    const norm = (value: string) => value.trim().toLowerCase()
    const match =
      Object.values(covers)
        .flat()
        .find(
          (cover) =>
            norm(cover.title) === norm(arc.firstTrack.title) &&
            norm(cover.artist) === norm(arc.firstTrack.artist),
        ) ?? null

    if (!match) return arc
    return {
      ...arc,
      firstTrack: {
        ...arc.firstTrack,
        trackId: match.trackId,
        imageUrl: match.imageUrl,
      },
    }
  }, [arc, covers])

  const handleScrollToId = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className={styles.odysseyRoot}>
      {/* Sabit Minimal Çıkış Butonu */}
      <div className={styles.deckExitFixed}>
        <Link href="/recap" className={styles.deckExit} aria-label={t('journey.view.exitAriaLabel')}>
          <span className={styles.deckExitArrow} aria-hidden>←</span>
          <span className={styles.deckExitLabel}>Recap</span>
        </Link>
      </div>

      {/* Sessiz Yıl Göstergesi (Re-render korumalı bağımsız gözlemci) */}
      <YearRail years={years} />

      <main className={styles.odysseyStream}>
        {/* ══ Bölüm 0: Başlangıç (Hero) ══════════════════════════ */}
        <section id="hero" data-journey-section className={styles.heroSection}>
          <JourneyHero
            vibeCardId={vibeCardId}
            userSeed={userId}
            hideExit
            hideScrollCue={false}
          />
        </section>

        {/* ══ İlk Dinlenen Şarkı (Origin) ════════════════════════ */}
        <section id="origin" data-journey-section className={styles.originSection}>
          <div className={styles.originContainer}>
            <JourneyOrigin
              arc={originArc}
              totalPlays={totalPlays}
              journeyStartYear={journeyStartYear}
              journeyEndYear={journeyEndYear}
            />
            <div className={styles.originActionRow}>
              <button
                type="button"
                className={styles.startJourneyCta}
                onClick={() => handleScrollToId(`year-${years[0]?.year}`)}
                aria-label={t('journey.view.beginJourney')}
              >
                <span className={styles.startJourneyText}>{t('journey.view.beginJourney')}</span>
                <span className={styles.startJourneyArrow} aria-hidden>↓</span>
              </button>
            </div>
          </div>
        </section>

        {/* ══ Yıllar Arşivi (Veri-güdümlü 5 Kompozisyon) ═════════ */}
        {years.map((y, yearIdx) => {
          const sahne = sahneler.get(y.year)!
          const yearCovers = covers[y.year] ?? []
          const isBreak = y.isBreakpoint
          const prevYearObj = isBreak && yearIdx > 0 ? years[yearIdx - 1] ?? null : null

          // Karakter-güdümlü zengin renk türetimi
          const charColor = palette.get(y.year)
          const basePal = getYearPalette(y)
          const yearPalette: YearPalette = (basePal.primary && basePal.primary !== '#1e1b4b')
            ? basePal
            : charColor
            ? {
                primary: charColor.from,
                deep: charColor.to,
                accent: charColor.accent,
                glow: charColor.accent,
              }
            : basePal

          return (
            <div key={`wrap-${y.year}`} className={styles.yearWrapper}>
              {/* Kırılma yılıysa Tektonik Kanyon köprüsü */}
              {isBreak && prevYearObj && (
                <div className={styles.tectonicRift}>
                  <TectonicSplit
                    prevYear={prevYearObj}
                    breakpointYear={y}
                    prevPalette={getYearPalette(prevYearObj)}
                    breakPalette={yearPalette}
                  />
                </div>
              )}

              {/* 5 Farklı Veri Kompozisyonundan Biri */}
              <YearScene
                year={y}
                sahne={sahne}
                covers={yearCovers}
                palette={yearPalette}
                isBreak={isBreak}
                isFirstYear={yearIdx === 0}
              />
            </div>
          )
        })}

        {/* ══ Kapanış: Bugün & Yolculuk Devam Ediyor ══════════════ */}
        <section id="today" data-journey-section className={styles.odysseySection}>
          <div className={styles.todayStage}>
            <div className={styles.todayTopRow}>
              {arc.lastTrack.trackId ? (
                <div className={styles.todayCoverFrame}>
                  <JourneyArtwork
                    id={arc.lastTrack.trackId}
                    src={arc.lastTrack.imageUrl}
                    size={160}
                    priority={false}
                    alt={`${arc.lastTrack.artist} — ${arc.lastTrack.title}`}
                  />
                  <span className={styles.todayCoverGlow} aria-hidden />
                </div>
              ) : null}

              <div className={styles.todayPlaque}>
                <span className={styles.todayEyebrow}>{t('journey.view.latestListen')}</span>
                <p className={styles.todayArtist}>{arc.lastTrack.artist}</p>
                <p className={styles.todayTrack} title={arc.lastTrack.title}>
                  {displayTrackTitle(arc.lastTrack.title)}
                </p>
                {arc.lastTrack.playedAt ? (
                  <span className={styles.todayStamp}>{formatPlayedAt(arc.lastTrack.playedAt)}</span>
                ) : null}
              </div>
            </div>

            {carSessionsNode && (
              <div className={styles.carBentoContainer}>
                {carSessionsNode}
              </div>
            )}

            <JourneyFinale
              closing={closing}
              startYear={journeyStartYear}
              endYear={journeyEndYear}
              onRestart={() => handleScrollToId('hero')}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
