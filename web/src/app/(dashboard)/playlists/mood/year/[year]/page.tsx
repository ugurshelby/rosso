import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getYearPackage, getYearSummaries } from '@/lib/analytics/year-pkg'
import { TrackTable } from '@/components/playlists/track-table'
import { YearExportButton } from '@/components/mood/year-export-button'
import { getT } from '@/lib/i18n/server'
import { formatNumber } from '@/lib/i18n'
import playlistDetailStyles from '@/components/playlists/playlist-detail.module.css'
import styles from '@/components/mood/mood.module.css'

interface PageProps {
  params: Promise<{ year: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params
  return { title: `${year} — Rosso` }
}

/**
 * Your Years detay — SALT-OKUNUR (migration 0310, Sahibin kararı
 * 2026-09-18). `[key]/page.tsx`'ten (mood detayı) farklı: gizleme/workspace
 * YOK, yalnız donmuş `year_pkg.payload`'ı gösterir + tek seferlik export.
 */
export default async function YearDetailPage({ params }: PageProps) {
  const { year: yearParam } = await params
  const year = Number(yearParam)
  if (!Number.isInteger(year)) notFound()

  const user = await requireAuth()
  const [tracks, summaries, { t, locale }] = await Promise.all([
    getYearPackage(user.id, year),
    getYearSummaries(user.id),
    getT(),
  ])
  if (tracks === null) notFound()

  const coverUrl = summaries.find((s) => s.year === year)?.coverUrl ?? null

  const trackRows = tracks.map((t, i) => ({
    position: i,
    tracks: t.trackId
      ? {
          id: t.trackId,
          title: t.title,
          artist_name: t.artistName ?? '',
          isrc: null,
          duration_ms: null,
          album: null,
          album_image_url: t.imageUrl,
          spotify_id: t.spotifyId,
        }
      : null,
  }))

  return (
    <div className={styles.detailPage}>
      <Link href="/playlists/mood" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Anlar
      </Link>

      <header className={styles.yearHero}>
        {coverUrl && (
          <div className={styles.yearHeroCoverWrap}>
            <Image src={coverUrl} alt={String(year)} fill sizes="200px" className={styles.yearCoverImg} />
          </div>
        )}
        <div>
          <p className={styles.eyebrow}>{t('playlists.yearDetail.eyebrow')}</p>
          <h1 className={styles.title}>{year}</h1>
          <p className={styles.subtitle}>
            {t('playlists.yearDetail.subtitle', { count: formatNumber(tracks.length, locale), year })}
          </p>
          <YearExportButton year={year} />
        </div>
      </header>

      <section
        className={playlistDetailStyles.trackSection}
        aria-label={t('playlists.yearDetail.tracksAriaLabel')}
      >
        <TrackTable rows={trackRows} />
      </section>
    </div>
  )
}
