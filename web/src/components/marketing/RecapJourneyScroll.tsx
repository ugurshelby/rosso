'use client'

import { useState } from 'react'
import {
  VIBE_SECTION_COPY,
  VIBE_SHOWCASE_CARDS,
  type VibeCardKey,
} from '@/lib/marketing/product-showcase'
import type { Dil } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import { ShowcaseMockup } from '@/components/marketing/showcase-mockups'
import styles from './recap-journey-scroll.module.css'

/**
 * Vibe kartları vitrini — sol yelpaze ile sağ panel senkronize, sinematik geçiş.
 */
export function RecapJourneyScroll({ dil = 'tr' }: { dil?: Dil }) {
  const [activeVibeId, setActiveVibeId] = useState<VibeCardKey>('synthwave-romantic')
  const kopya = VIBE_SECTION_COPY[dil]

  const activeCard =
    VIBE_SHOWCASE_CARDS.find((card) => card.id === activeVibeId) ??
    VIBE_SHOWCASE_CARDS[1]

  return (
    <section className={styles.staticShowcase} aria-label={SOZLUK[dil].vibe.bolumEtiketi}>
      <header className={styles.bridgeHead}>
        <span className={styles.sectionTag}>{kopya.sectionTag}</span>
        <h2 className={styles.sectionTitle}>{kopya.title}</h2>
        <p className={styles.sectionLead}>{kopya.lead}</p>
      </header>

      <div
        className={styles.featuredStage}
        style={{ ['--scene-accent' as string]: activeCard.accent }}
      >
        <div className={styles.featuredAtmosphere} aria-hidden>
          <div className={styles.featuredSpot} />
          <div className={styles.featuredFloorGlow} />
        </div>
        <div className={styles.featuredMockup}>
          <ShowcaseMockup
            sceneKey="vibe"
            accent={activeCard.accent}
            activeVibeId={activeVibeId}
            onSelectVibe={(id) => setActiveVibeId(id as VibeCardKey)}
            dil={dil}
          />
        </div>
        <div className={styles.featuredCopy}>
          <div key={activeCard.id} className={styles.copyContent}>
            <span className={styles.eyebrow}>{activeCard.label}</span>
            <h3 className={styles.vibeTitle}>{activeCard.name}</h3>
            <p className={styles.sceneHook}>
              {dil === 'tr' ? activeCard.descriptionTr : activeCard.descriptionEn}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
