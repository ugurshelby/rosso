import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { Disc3, ExternalLink, Star, Moon, Sun, Sparkles } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { isUuid } from '@/lib/security/route-params'
import { getTrackDetail, getTrackTimeline } from '@/lib/catalog/read'
import { getTrackSpotifyUrl } from '@/lib/platforms'
import { CoverArt } from '@/components/media/cover-art'
import { HeroReveal } from '@/components/ui/HeroReveal'
import {
  ListeningStats,
  ListeningTimeline,
  RelationshipBanner,
} from '@/components/catalog/listening-stats'
import { formatDate, formatMinutes } from '@/lib/catalog/format'
import styles from '@/components/catalog/catalog-detail.module.css'
import { getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Track',
}

const NF = new Intl.NumberFormat('en-US')

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TrackDetailPage({ params }: PageProps) {
  const { id } = await params
  if (!isUuid(id)) notFound()

  const user = await requireAuth()

  const [track, timeline] = await Promise.all([
    getTrackDetail(user.id, id),
    getTrackTimeline(user.id, id),
  ])

  if (!track) notFound()

  const { t, tp, locale } = await getT()

  const artist = track.artists[0] ?? null
  const spotifyUrl = getTrackSpotifyUrl(track.spotifyId)
  const firstPlayed = formatDate(track.firstPlayed, locale)

  const stats: {
    label: string
    value: string
    icon: 'play' | 'clock' | 'calendar' | 'disc' | 'star'
  }[] = []

  if (track.playCount > 0) {
    stats.push({ label: t('catalog.stats.playCount'), value: NF.format(track.playCount), icon: 'play' })
    stats.push({ label: t('catalog.stats.totalTime'), value: formatMinutes(track.totalMinutes, locale), icon: 'clock' })
  }
  if (firstPlayed) {
    stats.push({ label: t('catalog.stats.firstDiscovered'), value: firstPlayed, icon: 'calendar' })
  }
  if (track.playlistCount > 0) {
    stats.push({
      label: t('catalog.stats.inPlaylists'),
      value: tp('catalog.track.listsValue', track.playlistCount),
      icon: 'disc',
    })
  }
  if (track.isTalisman) {
    stats.push({
      label: t('catalog.stats.skipRate'),
      value: t('catalog.track.skipRateBadge', { rate: track.skipRate }),
      icon: 'star',
    })
  }

  // Relationship description
  let relTitle = t('catalog.track.connectionTitleDefault')
  let relDesc = t('catalog.track.connectionDescDefault', {
    date: firstPlayed ?? t('catalog.track.longTermFallback'),
    count: NF.format(track.playCount),
  })
  let badgeLabel = t('catalog.track.regularListeningBadge')
  let badgeTone: 'gold' | 'purple' | 'cyan' = 'purple'

  if (track.isTalisman) {
    relTitle = t('catalog.track.talismanTitle')
    relDesc = t('catalog.track.talismanDesc', { rate: track.skipRate })
    badgeLabel = t('catalog.track.talismanTrackBadge')
    badgeTone = 'gold'
  } else if (track.circadianCentroid) {
    relTitle = t('catalog.track.circadianTitle', {
      tag: track.circadianTag ?? t('catalog.track.circadianFallbackTag'),
    })
    relDesc = t('catalog.track.circadianDesc', { time: track.circadianCentroid })
    badgeLabel = t('catalog.track.circadianBadge', { time: track.circadianCentroid })
    badgeTone = 'cyan'
  }

  return (
    <div className={styles.page}>
      {/* Ambient background bloom */}
      <div className={styles.ambientBloom} aria-hidden />

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.artContainer}>
          <HeroReveal>
            <CoverArt
              kind="track"
              id={track.id}
              size={400}
              alt={track.title}
              className={styles.heroArt}
              fallback={<Disc3 size={56} strokeWidth={1.5} />}
            />
          </HeroReveal>
        </div>
        <div className={styles.heroText}>
          <span className={styles.heroKindBadge}>{t('catalog.track.kindBadge')}</span>
          <h1 className={styles.heroTitle}>{track.title}</h1>
          <p className={styles.heroSub}>
            {artist && (
              <Link
                href={`/artist/${encodeURIComponent(artist)}`}
                className={styles.heroSubLink}
              >
                {track.artists.join(', ')}
              </Link>
            )}
            {track.album && (
              <>
                <span>·</span>
                <Link
                  href={`/album/${encodeURIComponent(track.album)}${artist ? `?artist=${encodeURIComponent(artist)}` : ''}`}
                  className={styles.heroSubLink}
                >
                  {track.album}
                </Link>
              </>
            )}
          </p>
        </div>
      </header>

      {/* Actions */}
      <div className={styles.actions}>
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionPrimary}
          >
            <ExternalLink size={16} strokeWidth={2} aria-hidden />
            {t('catalog.actions.listenOnSpotify')}
          </a>
        )}
        {track.genres.length > 0 && (
          <div className={styles.genreRow}>
            {track.genres.map((g) => (
              <span className={styles.genreChip} key={g}>
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {track.playCount === 0 ? (
        <p className={styles.empty}>{t('catalog.track.emptyState')}</p>
      ) : (
        <>
          {/* Relationship Banner */}
          <RelationshipBanner
            kind="track"
            title={relTitle}
            description={relDesc}
            badgeLabel={badgeLabel}
            badgeTone={badgeTone}
          />

          {/* Listening Stats */}
          <ListeningStats stats={stats} />

          {/* Listening Timeline */}
          {timeline.length >= 1 && (
            <>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionEyebrow}>{t('catalog.track.rhythmEyebrow')}</span>
                {t('catalog.track.rhythmTitle')}
              </h2>
              <ListeningTimeline points={timeline} />
            </>
          )}
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
