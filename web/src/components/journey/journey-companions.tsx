'use client'

import { memo } from 'react'
import type { JourneyEslikcileri } from '@/lib/journey/eslikciler'
import { displayTrackTitle } from '@/lib/journey/display-title'
import { formatNumber } from '@/lib/i18n/format'
import { useT } from '@/lib/i18n/provider'
import { JourneyArtwork } from './journey-artwork'
import styles from './journey-companions.module.css'

interface JourneyCompanionsProps {
  lifetime: JourneyEslikcileri['lifetime']
  firstYear: number | null
  onBegin: () => void
}

/**
 * Prolog — "Yanında kimler vardı". Eski "ilk dinlenen şarkı" sahnesinin yerine
 * (2026-10-04): tesadüfi bir ilk tıklama kişiyi anlatmıyordu. Burada yıllar boyu
 * kalan sanatçılar ve farklı yıllarda geri dönülen şarkılar durur — hepsi ölçüm,
 * yorum cümlesi yok (recap-journey-design.md §1).
 */
export const JourneyCompanions = memo(function JourneyCompanions({
  lifetime,
  firstYear,
  onBegin,
}: JourneyCompanionsProps) {
  const { t, tp, locale } = useT()
  const sanatcilar = lifetime.artists.slice(0, 5)
  const sarkilar = lifetime.enduring.slice(0, 6)

  return (
    <section id="companions" data-journey-section className={styles.section} aria-labelledby="companions-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>{t('journey.companions.eyebrow')}</p>
          <h2 id="companions-title" className={styles.title}>
            {t('journey.companions.title')}
          </h2>
        </header>

        {sanatcilar.length > 0 ? (
          <div className={styles.block}>
            <p className={styles.label}>{t('journey.companions.artistsLabel')}</p>
            <ol className={styles.artists}>
              {sanatcilar.map((a, i) => (
                <li key={a.name} className={styles.artist} data-lead={i === 0 ? 'true' : undefined}>
                  <div className={styles.artistArt}>
                    <JourneyArtwork kind="artist" id={a.name} src={a.imageUrl} size={i === 0 ? 360 : 200} priority={i === 0} alt={a.name} />
                  </div>
                  <span className={styles.artistName} title={a.name}>{a.name}</span>
                  <span className={styles.artistSpan}>
                    {t('journey.companions.yearsSpan', { from: a.firstYear, to: a.lastYear, count: a.yearsActive })}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {sarkilar.length > 0 ? (
          <div className={styles.block}>
            <p className={styles.label}>{t('journey.companions.songsLabel')}</p>
            <ol className={styles.songs}>
              {sarkilar.map((s) => (
                <li key={s.trackId} className={styles.song}>
                  <div className={styles.songArt}>
                    <JourneyArtwork id={s.trackId} src={s.imageUrl} size={96} alt={`${s.artist} — ${s.title}`} />
                  </div>
                  <div className={styles.songText}>
                    <span className={styles.songTitle} title={s.title}>{displayTrackTitle(s.title)}</span>
                    <span className={styles.songMeta}>
                      {s.artist} · {tp('journey.companions.inYears', s.years.length, { count: formatNumber(s.years.length, locale) })}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {firstYear ? (
          <button type="button" className={styles.begin} onClick={onBegin}>
            <span>{t('journey.companions.begin', { year: firstYear })}</span>
            <span aria-hidden>↓</span>
          </button>
        ) : null}
      </div>
    </section>
  )
})
