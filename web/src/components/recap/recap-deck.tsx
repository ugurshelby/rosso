'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { RecapStage } from './recap-stage'
import { useStoryDeck } from './use-story-deck'
import { CoverCard } from './cards/cover-card'
import { ManifestoCard, type ManifestoData } from './cards/manifesto-card'
import { TopArtistsCard, type TopArtist } from './cards/top-artists-card'
import { TopTracksCard, type TopTrack } from './cards/top-tracks-card'
import { DiscoveryCard, type DiscoveryData } from './cards/discovery-card'
import { StreakCard, type StreakData } from './cards/streak-card'
import { PeakDayCard, type PeakDayData } from './cards/peak-day-card'
import { ObsessionCard, type ObsessionData } from './cards/obsession-card'
import { NumberOneCard, type NumberOneData } from './cards/number-one-card'
import { PlacardCard, type PlacardData } from './cards/placard-card'
import type { RecapCoverArtId } from '@/lib/recap/cover-art'
import { useT } from '@/lib/i18n/provider'
import styles from './recap-deck.module.css'

/**
 * RecapDeck — kart gezinme orkestratörü (FAZ R1, 2026-07-20).
 *
 * design.md §5: sol/sağ tap-zone ile gezinilir, **yan ok butonu YOK**.
 * Story-bar üstte tıklanabilir segmentler taşır. Klavye ← → de çalışır.
 *
 * Kartlar RecapStage'in içine girer — yükseklik/scroll kontratı orada,
 * burada YOK (kart ve deck kendi height kararını almaz).
 */
export interface RecapDeckData {
  title: string
  coverArtId: RecapCoverArtId
  issueLabel: string
  manifesto: ManifestoData | null
  topArtists: TopArtist[]
  topTracks: TopTrack[]
  discovery: DiscoveryData | null
  streak: StreakData | null
  peakDay: PeakDayData | null
  /** A13.5 — takıntı. Yoğunlaşma eşiği altındaysa null. */
  obsession: ObsessionData | null
  /** A13.3 — #1 sanatçı/şarkıya ayrılan saat (top-5 çalma listesinden ayrı). */
  numberOne: NumberOneData | null
  /** Kapanış plaketi. */
  placard: PlacardData | null
  /** Kapak etiketleri (Katman D, AI havuzdan seçer). Yoksa kapak etiketsiz. */
  coverTags?: Array<{ slug: string; en: string; tr: string }>
}

export function RecapDeck({ data }: { data: RecapDeckData }) {
  const router = useRouter()
  const { t } = useT()
  const exitToArchive = useCallback(() => router.push('/recap'), [router])
  // Yalnız verisi olan kartlar deck'e girer — boş kart basılmaz.
  const cards: Array<{ key: string; node: React.ReactNode }> = [
    {
      key: 'cover',
      node: (
        <CoverCard
          title={data.title}
          coverArtId={data.coverArtId}
          issueLabel={data.issueLabel}
          tags={data.coverTags}
        />
      ),
    },
  ]
  if (data.manifesto) {
    cards.push({
      key: 'manifesto',
      node: <ManifestoCard data={data.manifesto} periodLabel={data.title} />,
    })
  }
  if (data.topArtists.length > 0) {
    cards.push({
      key: 'artists',
      node: <TopArtistsCard artists={data.topArtists} periodLabel={data.title} />,
    })
  }
  if (data.topTracks.length > 0) {
    cards.push({
      key: 'tracks',
      node: <TopTracksCard tracks={data.topTracks} periodLabel={data.title} />,
    })
  }
  if (data.discovery) {
    cards.push({
      key: 'discovery',
      node: <DiscoveryCard data={data.discovery} periodLabel={data.title} />,
    })
  }
  if (data.streak) {
    cards.push({ key: 'streak', node: <StreakCard data={data.streak} /> })
  }
  if (data.peakDay) {
    cards.push({ key: 'peak-day', node: <PeakDayCard data={data.peakDay} /> })
  }
  // Kart 8 (soundscape) ve Kart 9 (mood) 2026-08-11'de kaldırıldı —
  // Sahip: "bu ekranları görmek bile istemiyorum, hem web hem app
  // heryerden silinsin." A13.5 — takıntı: peakDay'den sonra, genel
  // resimden tek bir ana iner.
  if (data.obsession) {
    cards.push({ key: 'obsession', node: <ObsessionCard data={data.obsession} /> })
  }
  // A13.3 — #1'e ayrılan saat. Takıntıdan sonra; çalma sayısı listeleriyle çakışmaz.
  if (data.numberOne) {
    cards.push({ key: 'number-one', node: <NumberOneCard data={data.numberOne} /> })
  }
  // Yıl özeti poster (Kart 12) 2026-08-11'de kaldırıldı — Sahip:
  // Manifesto (Kart 2) ile aynı rakamı ikinci kez gösteriyordu, mantıksız.
  // Kapanış plaketi her zaman son kart (kapak → … → plaket).
  if (data.placard) {
    cards.push({ key: 'placard', node: <PlacardCard data={data.placard} /> })
  }

  const total = cards.length

  // Tüm gezinme (index/klavye/swipe/otomatik ilerleme) tek beyinde: useStoryDeck.
  // Otomatik ilerleme Instagram Stories ritmi (design.md §1); reduced-motion'da
  // hook otomatik durdurur.
  const { index, go, touchHandlers } = useStoryDeck({
    total,
    autoAdvanceMs: 6500,
    onExitForward: exitToArchive,
  })

  const current = cards[index] ?? cards[0]!
  const isLastCard = index >= total - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitToArchive()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exitToArchive])

  return (
    <RecapStage cardKey={current.key} touchHandlers={touchHandlers}>
      {current.node}

      {/* Kapat — her zaman erişilebilir (sidebar gizliyken tek güvenli çıkış). */}
      <button
        type="button"
        className={styles.closeBtn}
        onClick={exitToArchive}
        aria-label={t('recap.deck.closeLabel')}
      >
        <X size={20} strokeWidth={2} aria-hidden />
      </button>

      {/* Story-bar — tıklanabilir segmentler (§5 hızlı gezinme) */}
      {total > 1 ? (
        <div className={styles.storyBar}>
          {cards.map((card, i) => (
            <button
              key={card.key}
              type="button"
              className={`${styles.segment} ${
                i === index ? styles.segmentActive : i < index ? styles.segmentSeen : ''
              }`}
              aria-label={t('recap.deck.segmentLabel', { n: i + 1 })}
              aria-current={i === index}
              onClick={() => go(i)}
            />
          ))}
        </div>
      ) : null}

      {/* Sol/sağ tap-zone — yan ok butonu YOK (§5); son kartta sağ = arşive dön. */}
      {total > 1 ? (
        <div className={styles.navZones}>
          <button
            type="button"
            className={styles.zone}
            aria-label={t('recap.deck.prevLabel')}
            onClick={() => go(index - 1)}
            disabled={index === 0}
          />
          <button
            type="button"
            className={styles.zone}
            aria-label={isLastCard ? t('recap.deck.closeLabel') : t('recap.deck.nextLabel')}
            onClick={() => go(index + 1)}
          />
        </div>
      ) : null}

      {/* Alt şerit — künye + sayaç */}
      <div className={styles.footer}>
        <Link href="/recap" className={styles.footerLink}>
          ROSSO
        </Link>
        <span className={styles.footerHint}>
          {isLastCard ? (
            <>
              {index + 1} / {total}
              <span className={styles.footerExitCue}> · {t('recap.deck.footerExitCue')}</span>
            </>
          ) : (
            <>
              {index + 1} / {total}
            </>
          )}
        </span>
      </div>
    </RecapStage>
  )
}
