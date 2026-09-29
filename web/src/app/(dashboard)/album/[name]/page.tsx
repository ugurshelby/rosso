import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { Disc3, ExternalLink, Disc, Sparkles } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getAlbumDetail } from '@/lib/catalog/read'
import {
  ListeningStats,
  RelationshipBanner,
  AlbumTracklistTable,
} from '@/components/catalog/listening-stats'
import { formatDate, formatMinutes } from '@/lib/catalog/format'
import styles from '@/components/catalog/catalog-detail.module.css'
import { sizedUrl } from '@/lib/images/sized-url'
import { getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Album',
}

const NF = new Intl.NumberFormat('en-US')
const MAX_NAME_LENGTH = 200

interface PageProps {
  params: Promise<{ name: string }>
  searchParams?: Promise<{ artist?: string }>
}

export default async function AlbumDetailPage({ params, searchParams }: PageProps) {
  const { name: rawName } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawArtist = resolvedSearchParams?.artist

  let name = rawName
  try {
    name = decodeURIComponent(rawName)
  } catch {
    name = rawName
  }
  name = name.trim()

  let artistName: string | undefined = rawArtist
  if (rawArtist) {
    try {
      artistName = decodeURIComponent(rawArtist).trim()
    } catch {
      artistName = rawArtist.trim()
    }
  }

  if (!name || name.length > MAX_NAME_LENGTH) notFound()

  const user = await requireAuth()
  const album = await getAlbumDetail(user.id, name, artistName)

  if (!album) notFound()

  const { t, tp, locale } = await getT()

  const firstPlayed = formatDate(album.firstPlayed, locale)

  const stats: {
    label: string
    value: string
    icon: 'play' | 'clock' | 'award' | 'calendar'
  }[] = [
    { label: t('catalog.stats.playCount'), value: NF.format(album.playCount), icon: 'play' },
    { label: t('catalog.stats.totalTime'), value: formatMinutes(album.totalMinutes, locale), icon: 'clock' },
    {
      label: t('catalog.stats.completionRate'),
      value: t('catalog.album.completionValue', { rate: album.completionRate }),
      icon: 'award',
    },
  ]
  if (firstPlayed) {
    stats.push({ label: t('catalog.stats.firstDiscovered'), value: firstPlayed, icon: 'calendar' })
  }

  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${album.name} ${album.artist}`)}`

  // Relationship description
  let relTitle = t('catalog.album.connectionTitle')
  let relDesc = t('catalog.album.connectionDescDefault', {
    date: firstPlayed ?? t('catalog.album.longTermFallback'),
    count: NF.format(album.playCount),
  })
  let badgeLabel = t('catalog.album.discoveredBadge', { percent: album.completionRate })
  let badgeTone: 'gold' | 'purple' | 'cyan' = 'purple'

  if (album.completionRate >= 80) {
    relTitle = t('catalog.album.completeStoryTitle')
    relDesc = t('catalog.album.completeStoryDesc', { percent: album.completionRate })
    badgeLabel = t('catalog.album.fullAlbumBadge')
    badgeTone = 'gold'
  } else if (album.dominantTrack) {
    relTitle = t('catalog.album.standoutTitle')
    relDesc = t('catalog.album.standoutDesc', {
      track: album.dominantTrack.title,
      count: NF.format(album.dominantTrack.playCount),
    })
    badgeLabel = album.dominantTrack.title
    badgeTone = 'cyan'
  }

  return (
    <div className={styles.page}>
      {/* Ambient background bloom */}
      <div className={styles.ambientBloom} aria-hidden />

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.artContainer}>
          {album.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sizedUrl(album.imageUrl, 240)} // hero en fazla 240 px (2026-09-24 perf)
              alt={album.name}
              className={styles.heroArt}
            />
          ) : (
            <div
              className={styles.heroArt}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #38203f 0%, #150918 100%)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Disc size={64} strokeWidth={1.2} />
            </div>
          )}
        </div>
        <div className={styles.heroText}>
          <span className={styles.heroKindBadge}>{t('catalog.album.kindBadge')}</span>
          <h1 className={styles.heroTitle}>{album.name}</h1>
          <p className={styles.heroSub}>
            <Link
              href={`/artist/${encodeURIComponent(album.artist)}`}
              className={styles.heroSubLink}
            >
              {album.artist}
            </Link>
            {album.releaseYear && (
              <>
                <span>·</span>
                <span>{album.releaseYear}</span>
              </>
            )}
            <span>·</span>
            <span>{tp('catalog.album.trackCount', album.trackCount)}</span>
            <span>·</span>
            <span>{formatMinutes(album.totalMinutes, locale)}</span>
          </p>
        </div>
      </header>

      {/* Actions */}
      <div className={styles.actions}>
        <a
          href={spotifySearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.actionPrimary}
        >
          <ExternalLink size={16} strokeWidth={2} aria-hidden />
          {t('catalog.actions.listenOnSpotify')}
        </a>
        {album.genres.length > 0 && (
          <div className={styles.genreRow}>
            {album.genres.slice(0, 6).map((g) => (
              <span className={styles.genreChip} key={g}>
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Relationship Banner */}
      <RelationshipBanner
        kind="album"
        title={relTitle}
        description={relDesc}
        badgeLabel={badgeLabel}
        badgeTone={badgeTone}
      />

      {/* Listening Stats */}
      <ListeningStats stats={stats} />

      {/* Tracklist & Personal Plays */}
      {album.tracks.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionEyebrow}>{t('catalog.album.tracklistEyebrow')}</span>
            {t('catalog.album.tracklistTitle')}
          </h2>
          <AlbumTracklistTable tracks={album.tracks} albumImageUrl={album.imageUrl} />
        </>
      )}

      <BackButton
        className={styles.backLink}
        fallbackHref="/dashboard"
        label={t('shared.backButton.label')}
      />
    </div>
  )
}
