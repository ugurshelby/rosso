'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { getJourneyYearColors, applyYearCharacter } from '@/lib/journey/palette'
import { yilSahnesi, yolculukUclari } from '@/lib/journey/yil-sahnesi'
import {
  doluYilMi,
  DOLU_YIL_EN_AZ_DINLEME,
  type EslikciYil,
  type JourneyEslikcileri,
} from '@/lib/journey/eslikciler'
import {
  getYearPalette,
  type JourneyCover,
  type JourneyYear,
  type YearPalette,
} from '@/lib/journey/types'
import type { VibeCardId } from '@/lib/vibe-cards/data'
import type { JourneyKapanisi, JourneyYilHikayesi } from '@/lib/analytics/editorial-read'
import { useT } from '@/lib/i18n/provider'
import { TectonicSplit } from './tectonic-split'
import { JourneyHero } from './journey-hero'
import { JourneyCompanions } from './journey-companions'
import { YearRail } from './year-rail'
import { YearChapter } from './year-chapter'
import { JourneyFinale } from './journey-finale'
import styles from './journey-view.module.css'

interface JourneyViewProps {
  years: JourneyYear[]
  covers: Record<number, JourneyCover[]>
  /** Eşlikçiler paketi (0362). Yoksa yıllar kapaklardan kurulan sade eşlikçilerle çizilir. */
  eslikci: JourneyEslikcileri | null
  vibeCardId: VibeCardId
  userId: string
  carSessionsNode?: React.ReactNode
  /** Seçili dildeki AI yıl notları. Boş = AI üretmedi; bölüm notsuz da tamdır. */
  yearNotes?: Record<number, JourneyYilHikayesi>
  /** AI kapanış metni (iki dil). Yoksa sade kapanış. */
  closing?: JourneyKapanisi | null
}

/** Paket yoksa yılın eşlikçilerini kapaklardan kur (ay akışı olmadan). */
function kapaktanEslikci(y: JourneyYear, covers: JourneyCover[]): EslikciYil {
  return {
    year: y.year,
    plays: y.playCount,
    minutes: y.totalMinutes,
    activeMonths: 12,
    topArtists: [],
    topAlbums: [],
    topTracks: covers.slice(0, 5).map((c) => ({
      trackId: c.trackId,
      title: c.title,
      artist: c.artist,
      imageUrl: c.imageUrl,
      plays: c.plays,
    })),
    months: [],
    yogunAy: null,
  }
}

/**
 * JourneyView — Bağımsız Sinematik Ritüel (recap-journey-design.md §0).
 *
 * 2026-10-04 yeniden kurgu (Sahip): ilk/son dinlenen şarkı kaldırıldı; akış
 * Hero → "Yanında kimler vardı" (ömür boyu eşlikçiler) → her DOLU yıl için bir
 * bölüm (o yılın şarkısı, sanatçısı, albümü, ay ay akışı) → kapanış.
 * Kullanımdan önceki kırıntı yıllar (ör. 10 dinlemelik bir yıl) bölüm olmaz.
 * Açılır-kapanır öğe yok; scroll hijacking ve sürekli döngü animasyonu yok.
 */
export function JourneyView({
  years,
  covers,
  eslikci,
  vibeCardId,
  userId,
  carSessionsNode,
  yearNotes,
  closing,
}: JourneyViewProps) {
  const { t } = useT()

  const eslikciYil = useMemo(() => new Map((eslikci?.years ?? []).map((y) => [y.year, y])), [eslikci])

  const doluYillar = useMemo(
    () =>
      years.filter((y) => {
        const e = eslikciYil.get(y.year)
        return e ? doluYilMi(e) : y.playCount >= DOLU_YIL_EN_AZ_DINLEME
      }),
    [years, eslikciYil],
  )

  const uclar = useMemo(() => yolculukUclari(doluYillar), [doluYillar])

  const bolumler = useMemo(
    () =>
      doluYillar.map((y, i) => {
        const temel = getJourneyYearColors(i, doluYillar.length)
        const karakter = applyYearCharacter(temel, {
          intensity: uclar.enYuksekCalma > 0 ? y.playCount / uclar.enYuksekCalma : 0.5,
          discovery: y.discoveryRate,
          spread: uclar.enYuksekCesitlilik > 0 ? y.genreVariety / uclar.enYuksekCesitlilik : 0.5,
        })
        const paket = getYearPalette(y)
        const palette: YearPalette =
          y.palette && paket.primary !== '#1e1b4b'
            ? paket
            : { primary: karakter.from, deep: karakter.to, accent: karakter.accent, glow: karakter.accent }
        return {
          y,
          palette,
          sahne: yilSahnesi(y, uclar),
          eslikci: eslikciYil.get(y.year) ?? kapaktanEslikci(y, covers[y.year] ?? []),
        }
      }),
    [doluYillar, uclar, eslikciYil, covers],
  )

  const ilkYil = doluYillar[0]?.year ?? null
  const sonYil = doluYillar[doluYillar.length - 1]?.year ?? null

  const handleScrollToId = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className={styles.odysseyRoot}>
      <div className={styles.deckExitFixed}>
        <Link href="/recap" className={styles.deckExit} aria-label={t('journey.view.exitAriaLabel')}>
          <span className={styles.deckExitArrow} aria-hidden>←</span>
          <span className={styles.deckExitLabel}>Recap</span>
        </Link>
      </div>

      <YearRail years={doluYillar} />

      <main className={styles.odysseyStream}>
        <section id="hero" data-journey-section className={styles.heroSection}>
          <JourneyHero vibeCardId={vibeCardId} userSeed={userId} hideExit hideScrollCue={false} />
        </section>

        {eslikci && (eslikci.lifetime.artists.length > 0 || eslikci.lifetime.enduring.length > 0) ? (
          <JourneyCompanions
            lifetime={eslikci.lifetime}
            firstYear={ilkYil}
            onBegin={() => ilkYil && handleScrollToId(`year-${ilkYil}`)}
          />
        ) : (
          <span id="companions" data-journey-section aria-hidden />
        )}

        {bolumler.map(({ y, palette, sahne, eslikci: e }, i) => {
          const onceki = i > 0 ? bolumler[i - 1] : null
          return (
            <div key={y.year} className={styles.yearWrapper}>
              {y.isBreakpoint && onceki ? (
                <div className={styles.tectonicRift}>
                  <TectonicSplit
                    prevYear={onceki.y}
                    breakpointYear={y}
                    prevPalette={onceki.palette}
                    breakPalette={palette}
                  />
                </div>
              ) : null}
              <YearChapter
                index={i + 1}
                year={y}
                eslikci={e}
                sahne={sahne}
                palette={palette}
                hikaye={yearNotes?.[y.year]}
                isBreak={y.isBreakpoint}
                isFirst={i === 0}
              />
            </div>
          )
        })}

        <section id="today" data-journey-section className={styles.odysseySection}>
          <div className={styles.todayStage}>
            {carSessionsNode ? <div className={styles.carBentoContainer}>{carSessionsNode}</div> : null}
            <JourneyFinale
              closing={closing}
              startYear={ilkYil ?? undefined}
              endYear={sonYil ?? undefined}
              onRestart={() => handleScrollToId('hero')}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
