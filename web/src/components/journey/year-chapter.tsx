'use client'

import { memo, useMemo, type CSSProperties } from 'react'
import type { JourneyYear, YearPalette } from '@/lib/journey/types'
import type { YilSahnesi } from '@/lib/journey/yil-sahnesi'
import { ayAdi, donemEtiketi, donemler, type EslikciYil } from '@/lib/journey/eslikciler'
import { displayTrackTitle } from '@/lib/journey/display-title'
import { formatNumber } from '@/lib/i18n/format'
import type { JourneyYilHikayesi } from '@/lib/analytics/editorial-read'
import { useT } from '@/lib/i18n/provider'
import { JourneyArtwork } from './journey-artwork'
import styles from './year-chapter.module.css'

export interface YearChapterProps {
  index: number
  year: JourneyYear
  eslikci: EslikciYil
  sahne: YilSahnesi
  palette: YearPalette
  hikaye?: JourneyYilHikayesi
  isBreak?: boolean
  isFirst?: boolean
}

const METRIK: Record<string, 'plays' | 'discovery' | 'genres' | 'repeats'> = {
  plays: 'plays',
  discovery: 'discovery',
  genres: 'genres',
  'repeats per song': 'repeats',
}

/**
 * Yıl bölümü — her yıl KENDİ eşlikçileriyle anlatılır (2026-10-04, Sahip:
 * "her yılın dolu olması şart; o yılı o yılla anlatmalı; açılır kapanır yok").
 *
 * Bir bölüm: yıl + (varsa) AI notu → üçlü (yılın şarkısı · sanatçısı · albümü) →
 * yılın akışı (ardışık aylarda aynı sanatçı tek dönem) → en yoğun ay olgusu.
 * Kompozisyon `sahne.tur`'dan gelir (hangi eşlikçi kahraman olur), içerik her yıl dolu.
 * Hareket yalnız kaydırmaya bağlı (`animation-timeline: view()`), kesilebilir ve
 * `prefers-reduced-motion`'da kapalı. Görseller 1:1, kırpılmadan (JourneyArtwork).
 */
export const YearChapter = memo(function YearChapter({
  index,
  year,
  eslikci,
  sahne,
  palette,
  hikaye,
  isBreak = false,
  isFirst = false,
}: YearChapterProps) {
  const { t, tp, locale } = useT()
  const donem = useMemo(() => donemler(eslikci.months), [eslikci.months])

  const sarki = eslikci.topTracks[0] ?? null
  const sanatci = eslikci.topArtists[0] ?? null
  const album = eslikci.topAlbums[0] ?? null
  const yogun = eslikci.yogunAy

  const metrikAnahtari = METRIK[sahne.mansetEtiket] ?? 'plays'
  // Sayılar seçili dilin biçiminde (TR "24.800", EN "24,800"; yüzde TR "%68", EN "68%").
  const mansetDeger =
    metrikAnahtari === 'discovery'
      ? formatNumber(year.discoveryRate, locale, { style: 'percent', maximumFractionDigits: 0 })
      : metrikAnahtari === 'plays'
        ? formatNumber(year.playCount, locale)
        : sahne.mansetDeger

  const saat = Math.round(eslikci.minutes / 60)
  // Sahnenin kahramanı: keşif yılı sanatçıyla, sakin yıl albümle, diğerleri şarkıyla açılır.
  const kahraman = sahne.tur === 'kesif' ? 'artist' : sahne.tur === 'sakin' ? 'album' : sahne.tur === 'dagilma' ? null : 'song'

  return (
    <section
      id={`year-${year.year}`}
      data-journey-section
      data-tur={sahne.tur}
      className={styles.chapter}
      aria-labelledby={`year-${year.year}-title`}
      style={
        {
          '--y-accent': palette.accent,
          '--y-from': palette.primary,
          '--y-to': palette.deep,
          '--y-glow': palette.glow,
        } as CSSProperties
      }
    >
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>{t('journey.chapter.eyebrow', { index, year: year.year })}</p>
          <div className={styles.titleRow}>
            <h2 id={`year-${year.year}-title`} className={styles.year}>
              {year.year}
            </h2>
            {isBreak && (
              <span className={styles.breakBadge} title={t('journey.view.breakYearTitle')}>
                {t('journey.view.breakYearBadge')}
              </span>
            )}
          </div>
          <p className={styles.manset}>
            <span className={styles.mansetDeger}>{mansetDeger}</span>
            <span className={styles.mansetEtiket}>{t(`journey.chapter.metric.${metrikAnahtari}`)}</span>
            <span className={styles.mansetYan}>{tp('journey.chapter.hours', saat, { count: formatNumber(saat, locale) })}</span>
          </p>
          {hikaye?.note ? <p className={styles.note}>{hikaye.note}</p> : null}
        </header>

        <div className={styles.trio}>
          {sarki ? (
            <figure className={`${styles.card} ${styles.cardSong}`} data-hero={kahraman === 'song' || undefined}>
              <div className={styles.art}>
                <JourneyArtwork
                  id={sarki.trackId || `sarki-${year.year}`}
                  src={sarki.imageUrl}
                  size={480}
                  priority={isFirst}
                  alt={`${sarki.artist} — ${sarki.title}`}
                />
              </div>
              <figcaption className={styles.caption}>
                <span className={styles.label}>{t('journey.chapter.songOfYear')}</span>
                <span className={styles.name} title={sarki.title}>{displayTrackTitle(sarki.title)}</span>
                <span className={styles.sub}>
                  {sarki.artist} · {tp('journey.chapter.plays', sarki.plays, { count: formatNumber(sarki.plays, locale) })}
                </span>
              </figcaption>
            </figure>
          ) : null}

          {sanatci ? (
            <figure className={`${styles.card} ${styles.cardArtist}`} data-hero={kahraman === 'artist' || undefined}>
              <div className={styles.art}>
                <JourneyArtwork
                  kind="artist"
                  id={sanatci.name}
                  src={sanatci.imageUrl}
                  size={360}
                  alt={sanatci.name}
                />
              </div>
              <figcaption className={styles.caption}>
                <span className={styles.label}>{t('journey.chapter.artistOfYear')}</span>
                <span className={styles.name}>{sanatci.name}</span>
                <span className={styles.sub}>
                  {tp('journey.chapter.plays', sanatci.plays, { count: formatNumber(sanatci.plays, locale) })}
                </span>
              </figcaption>
            </figure>
          ) : null}

          {album ? (
            <figure className={`${styles.card} ${styles.cardAlbum}`} data-hero={kahraman === 'album' || undefined}>
              <div className={styles.art}>
                <JourneyArtwork
                  id={`album-${year.year}-${album.album}`}
                  src={album.imageUrl}
                  size={360}
                  alt={`${album.artist} — ${album.album}`}
                />
              </div>
              <figcaption className={styles.caption}>
                <span className={styles.label}>{t('journey.chapter.albumOfYear')}</span>
                <span className={styles.name} title={album.album}>{album.album}</span>
                <span className={styles.sub}>{album.artist}</span>
              </figcaption>
            </figure>
          ) : null}
        </div>

        {hikaye?.story ? <p className={styles.story}>{hikaye.story}</p> : null}

        {donem.length > 0 ? (
          <div className={styles.seasons}>
            <p className={styles.seasonsLabel}>{t('journey.chapter.seasonsLabel')}</p>
            <ol className={styles.seasonList}>
              {donem.map((d) => (
                <li key={`${d.from}-${d.artist}`} className={styles.season}>
                  <div className={styles.seasonArt}>
                    <JourneyArtwork
                      id={d.track.trackId || `donem-${year.year}-${d.from}`}
                      src={d.track.imageUrl}
                      size={96}
                      alt={`${d.track.artist} — ${d.track.title}`}
                    />
                  </div>
                  <div className={styles.seasonText}>
                    <span className={styles.seasonWhen}>{donemEtiketi(d, locale)}</span>
                    <span className={styles.seasonArtist} title={d.artist}>{d.artist}</span>
                    <span className={styles.seasonSong} title={d.track.title}>{displayTrackTitle(d.track.title)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {yogun ? (
          <p className={styles.densest}>
            {t('journey.chapter.densestMonth', {
              month: ayAdi(yogun.month, locale, 'long'),
              title: displayTrackTitle(yogun.title),
              plays: formatNumber(yogun.plays, locale),
            })}
          </p>
        ) : null}
      </div>
    </section>
  )
})
