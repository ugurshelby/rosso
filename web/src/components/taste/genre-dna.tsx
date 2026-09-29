'use client'

import { useState } from 'react'
import type { GenreDistribution } from '@/lib/analytics/identity'
import { getGenreColor } from '@/lib/genre-colors'
import { LockedPreview } from '@/components/ui/locked-preview'
import { useT } from '@/lib/i18n/provider'
import styles from './genre-dna.module.css'

interface GenreDNAProps {
  data: GenreDistribution
  /**
   * Kademeli açılım (§1.14-C): ağırlıklı tür kapsama yüzdesi. `< 90` ise
   * "hesaplanıyor" rozeti + o ana kadar bulunan kısmi türler gösterilir
   * (tam kilit yerine). `user_taste_profile.genre_coverage_pct` — aynı
   * kaynak `IdentityBadges`'in "büyüyen kimlik" ipucunda da kullanılıyor,
   * iki bileşen ayrışmasın diye tek RPC/kolon paylaşılıyor.
   */
  coveragePct?: number
  isMature?: boolean
}

// Boş durum önizlemesi (kilitli/blur sistemi, Sahip madde 9) — temsili türler.
const PREVIEW_GENRES: GenreDistribution['genres'] = [
  { genre: 'pop', percentage: 34.2, track_count: 512 },
  { genre: 'hip-hop', percentage: 22.8, track_count: 341 },
  { genre: 'alternative', percentage: 16.5, track_count: 247 },
  { genre: 'rock', percentage: 12.1, track_count: 181 },
  { genre: 'electronic', percentage: 9.4, track_count: 141 },
  { genre: 'r&b', percentage: 5.0, track_count: 75 },
]

export function GenreDNA({ data, coveragePct, isMature }: GenreDNAProps) {
  const { t } = useT()
  const [openGenre, setOpenGenre] = useState<string | null>(null)

  function toggle(genre: string) {
    setOpenGenre((prev) => (prev === genre ? null : genre))
  }

  if (!data.available || data.genres.length === 0) {
    return (
      <section className={styles.section} aria-label={t('taste.genreDna.ariaLabel')}>
        <span className={styles.eyebrow}>{t('taste.genreDna.eyebrow')}</span>
        <LockedPreview label={t('taste.genreDna.locked')}>
          <div className={styles.grid} role="list">
            {PREVIEW_GENRES.map(({ genre, percentage }, index) => {
              const color = getGenreColor(genre)
              return (
                <div
                  key={genre}
                  className={styles.tile}
                  style={{ '--genre-color': color } as React.CSSProperties}
                >
                  <div className={styles.tileContent}>
                    <div className={styles.tileTop}>
                      <span className={styles.tileTopLeft}>
                        <span className={styles.genreDot} aria-hidden />
                        <span className={styles.genreRank}>#{index + 1}</span>
                        <span className={styles.genreName}>{genre}</span>
                      </span>
                      <span className={styles.genrePercent}>{percentage.toFixed(1)}%</span>
                    </div>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${Math.min(100, percentage * 2)}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </LockedPreview>
      </section>
    )
  }

  const totalPlays = data.genres.reduce((sum, g) => sum + g.track_count, 0)
  // §1.14-C: coverage < %90 ise "hesaplanıyor" — o ana kadarki türler zaten
  // görünür (kısmi gösterim), tam kilit değil. isMature undefined ise (prop
  // hiç verilmediyse) rozet gösterilmez — geriye dönük uyumluluk.
  const isGrowing = isMature === false && (coveragePct ?? 100) < 90

  return (
    <section className={styles.section} aria-label={t('taste.genreDna.ariaLabel')}>
      <span className={styles.eyebrow}>{t('taste.genreDna.eyebrow')}</span>
      <p className={isGrowing ? styles.hintTight : styles.hint}>
        {t('taste.genreDna.hint', { count: data.genres.length })}
      </p>
      {isGrowing && (
        <p className={styles.growing} role="status">
          {t('taste.genreDna.growing', { pct: Math.round(coveragePct ?? 0) })}
        </p>
      )}
      <div className={styles.grid} role="list">
        {data.genres.map(({ genre, percentage, track_count }, index) => {
          const color = getGenreColor(genre)
          const isOpen = openGenre === genre
          const rank = index + 1
          return (
            /* Erişilebilirlik (C-FAZ 1): eskiden `role="listitem"` üzerinde
               `aria-expanded` + `tabIndex` + `onClick` vardı — listitem bu
               nitelikleri desteklemez (lint uyarısı) ve klavye/ekran okuyucu
               için gerçek bir düğme değildi. Artık listitem yalnız sarmalayıcı;
               açma işini içindeki gerçek `<button>` yapar. */
            <div
              key={genre}
              className={[styles.tile, isOpen ? styles.tileActive : ''].filter(Boolean).join(' ')}
              style={{ '--genre-color': color } as React.CSSProperties}
              role="listitem"
            >
              <button
                type="button"
                className={styles.tileButton}
                aria-expanded={isOpen}
                aria-controls={`genre-panel-${rank}`}
                onClick={() => toggle(genre)}
              >
                <span className={styles.tileTop}>
                  <span className={styles.tileTopLeft}>
                    <span className={styles.genreDot} aria-hidden />
                    <span className={styles.genreRank}>#{rank}</span>
                    <span className={styles.genreName}>{genre}</span>
                  </span>
                  <span className={styles.genrePercent}>{percentage.toFixed(1)}%</span>
                </span>
                <span
                  className={styles.progressBar}
                  style={{ width: `${Math.min(100, percentage * 2)}%` }}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div
                  id={`genre-panel-${rank}`}
                  className={styles.accordionPanel}
                  aria-label={t('taste.genreDna.detailAria', { genre })}
                >
                  <div className={styles.accordionRow}>
                    <span className={styles.accordionKey}>{t('taste.genreDna.playCount')}</span>
                    <span className={styles.accordionVal}>{track_count.toLocaleString('en-US')}</span>
                  </div>
                  <div className={styles.accordionRow}>
                    <span className={styles.accordionKey}>{t('taste.genreDna.shareOfTotal')}</span>
                    <span className={styles.accordionVal}>%{percentage.toFixed(1)}</span>
                  </div>
                  <div className={styles.accordionRow}>
                    <span className={styles.accordionKey}>{t('taste.genreDna.yourRank')}</span>
                    <span className={styles.accordionVal}>#{rank}{totalPlays > 0 ? ` / ${data.genres.length}` : ''}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
