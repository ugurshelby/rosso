import type { Metadata } from 'next'
import { IntentLink } from '@/components/ui/intent-link'
import { BackButton } from '@/components/ui/back-button'
import { notFound } from 'next/navigation'
import { Mic2, Disc3, ExternalLink } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import {
  getArtistDetail,
  getArtistTopTracks,
  getArtistAlbums,
} from '@/lib/catalog/read'
import { getArtistSpotifySearchUrl } from '@/lib/platforms'
import { CoverArt } from '@/components/media/cover-art'
import { HeroReveal } from '@/components/ui/HeroReveal'
import {
  ListeningStats,
  RelationshipBanner,
  DiscoveredAlbumsGrid,
} from '@/components/catalog/listening-stats'
import { formatDate, formatMinutes } from '@/lib/catalog/format'
import styles from '@/components/catalog/catalog-detail.module.css'
import { getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Artist',
}

const NF = new Intl.NumberFormat('en-US')
const MAX_NAME_LENGTH = 200

interface PageProps {
  params: Promise<{ name: string }>
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { name: rawName } = await params
  let name = rawName
  try {
    name = decodeURIComponent(rawName)
  } catch {
    name = rawName
  }
  name = name.trim()

  if (!name || name.length > MAX_NAME_LENGTH) notFound()

  const user = await requireAuth()

  const [artist, topTracks, albums] = await Promise.all([
    getArtistDetail(user.id, name),
    getArtistTopTracks(user.id, name, 10),
    getArtistAlbums(user.id, name),
  ])

  if (!artist) notFound()

  const { t, tp, locale } = await getT()

  const firstPlayed = formatDate(artist.firstPlayed, locale)

  const stats: {
    label: string
    value: string
    icon: 'play' | 'clock' | 'disc' | 'calendar'
  }[] = [
    { label: t('catalog.stats.playCount'), value: NF.format(artist.playCount), icon: 'play' },
    { label: t('catalog.stats.totalTime'), value: formatMinutes(artist.totalMinutes, locale), icon: 'clock' },
    { label: t('catalog.stats.uniqueTracks'), value: NF.format(artist.trackCount), icon: 'disc' },
  ]
  if (firstPlayed) {
    stats.push({ label: t('catalog.stats.firstDiscovered'), value: firstPlayed, icon: 'calendar' })
  }

  const relationshipDescription =
    artist.activeMonths >= 12
      ? t('catalog.artist.longTermDesc', {
          months: artist.activeMonths,
          duration: formatMinutes(artist.totalMinutes, locale),
        })
      : artist.activeMonths <= 3
        ? t('catalog.artist.recentDesc', { count: NF.format(artist.playCount) })
        : t('catalog.artist.steadyDesc', {
            date: firstPlayed ?? t('catalog.artist.inRecordsFallback'),
          })

  return (
    <div className={styles.page}>
      {/* Ambient background bloom */}
      <div className={styles.ambientBloom} aria-hidden />

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.artContainer}>
          <HeroReveal>
            <CoverArt
              kind="artist"
              id={artist.name}
              size={400}
              alt={artist.name}
              className={`${styles.heroArt} ${styles.heroArtRound}`}
              fallback={<Mic2 size={56} strokeWidth={1.5} />}
            />
          </HeroReveal>
        </div>
        <div className={styles.heroText}>
          <span className={styles.heroKindBadge}>{t('catalog.artist.kindBadge')}</span>
          <h1 className={styles.heroTitle}>{artist.name}</h1>
          <p className={styles.heroSub}>
            <span>{tp('catalog.artist.plays', artist.playCount)}</span>
            <span>·</span>
            <span>{tp('catalog.artist.tracks', artist.trackCount)}</span>
            {artist.activeMonths > 0 && (
              <>
                <span>·</span>
                <span>{tp('catalog.artist.activeMonths', artist.activeMonths)}</span>
              </>
            )}
          </p>
        </div>
      </header>

      {/* Actions */}
      <div className={styles.actions}>
        <a
          href={getArtistSpotifySearchUrl(artist.name)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.actionPrimary}
        >
          <ExternalLink size={16} strokeWidth={2} aria-hidden />
          {t('catalog.actions.listenOnSpotify')}
        </a>
        {artist.genres.length > 0 && (
          <div className={styles.genreRow}>
            {artist.genres.slice(0, 6).map((g) => (
              <span className={styles.genreChip} key={g}>
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Relationship Banner */}
      <RelationshipBanner
        kind="artist"
        title={t('catalog.artist.connectionTitle')}
        description={relationshipDescription}
        badgeLabel={artist.archetypeLabel}
        badgeTone="gold"
      />

      {/* Listening Stats */}
      <ListeningStats stats={stats} />

      {/* Most Played Top 10 */}
      {topTracks.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionEyebrow}>{t('catalog.artist.peakEyebrow')}</span>
            {t('catalog.artist.mostPlayedTitle')}
          </h2>
          <div className={styles.insetGroupContainer}>
            <div className={styles.trackList}>
              {topTracks.map((t, i) => (
                <IntentLink
                  href={`/track/${t.trackId}`}
                  className={styles.trackRow}
                  key={t.trackId}
                >
                  <span className={styles.trackRank}>{String(i + 1).padStart(2, '0')}</span>
                  <CoverArt
                    kind="track"
                    id={t.trackId}
                    size={88}
                    alt=""
                    className={styles.trackThumb}
                    fallback={<Disc3 size={18} strokeWidth={1.5} />}
                  />
                  <div className={styles.trackMetaCol}>
                    <span className={styles.trackName}>{t.title}</span>
                    <span className={styles.trackSubDetails}>
                      {formatMinutes(t.minutes, locale)}
                    </span>
                  </div>
                  <div className={styles.trackPlaysCol}>
                    <span className={styles.trackPlays}>{tp('catalog.artist.playsShort', t.playCount)}</span>
                  </div>
                </IntentLink>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Discovered Albums */}
      {albums.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionEyebrow}>{t('catalog.artist.discographyEyebrow')}</span>
            {t('catalog.artist.discoveredAlbumsTitle')}
          </h2>
          <DiscoveredAlbumsGrid albums={albums} />
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
