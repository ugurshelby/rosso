'use client'

import React from 'react'
import { IntentLink } from '@/components/ui/intent-link'
import {
  Play,
  Clock,
  Calendar,
  Sparkles,
  Flame,
  Award,
  Disc3,
  Compass,
  Star,
  ShieldCheck,
  Headphones,
} from 'lucide-react'
import styles from './catalog-detail.module.css'
import { sizedUrl } from '@/lib/images/sized-url'
import type { AlbumTrackItem, ArtistAlbumItem } from '@/lib/catalog/read'
import { useT } from '@/lib/i18n/provider'

import { formatDate, formatMinutes } from '@/lib/catalog/format'
export { formatDate, formatMinutes }

interface Stat {
  label: string
  value: string
  icon?: 'play' | 'clock' | 'calendar' | 'sparkles' | 'flame' | 'award' | 'disc' | 'star'
}

const STAT_ICONS = {
  play: Play,
  clock: Clock,
  calendar: Calendar,
  sparkles: Sparkles,
  flame: Flame,
  award: Award,
  disc: Disc3,
  star: Star,
}

/**
 * "Senin bu müzikle hikâyen" — Apple HIG cam kartlar.
 */
export function ListeningStats({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null

  return (
    <div className={styles.statGrid}>
      {stats.map((s) => {
        const IconComponent = s.icon ? STAT_ICONS[s.icon] : Sparkles
        return (
          <div className={styles.statCard} key={s.label}>
            <div className={styles.statIconRow}>
              <IconComponent size={18} strokeWidth={1.8} aria-hidden />
            </div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        )
      })}
    </div>
  )
}

interface RelationshipBannerProps {
  kind: 'artist' | 'album' | 'track'
  title: string
  description: string
  badgeLabel?: string
  badgeTone?: 'gold' | 'purple' | 'cyan'
}

export function RelationshipBanner({
  kind,
  title,
  description,
  badgeLabel,
  badgeTone = 'gold',
}: RelationshipBannerProps) {
  const Icon =
    kind === 'artist' ? Award : kind === 'album' ? Disc3 : ShieldCheck

  return (
    <div className={styles.relationshipBanner}>
      <div className={styles.relationshipHeader}>
        <div
          className={styles.relationshipIconPill}
          style={
            badgeTone === 'purple'
              ? {
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(126, 34, 206, 0.1) 100%)',
                  borderColor: 'rgba(168, 85, 247, 0.35)',
                  color: '#c084fc',
                }
              : badgeTone === 'cyan'
                ? {
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(14, 116, 144, 0.1) 100%)',
                    borderColor: 'rgba(6, 182, 212, 0.35)',
                    color: '#22d3ee',
                  }
                : undefined
          }
        >
          <Icon size={22} strokeWidth={1.8} />
        </div>
        <div className={styles.relationshipInfo}>
          <h3 className={styles.relationshipTitle}>{title}</h3>
          <p className={styles.relationshipDescription}>{description}</p>
        </div>
      </div>
      {badgeLabel && (
        <span
          className={styles.relationshipArchetypePill}
          style={
            badgeTone === 'gold'
              ? {
                  background: 'rgba(234, 179, 8, 0.14)',
                  borderColor: 'rgba(234, 179, 8, 0.35)',
                  color: '#facc15',
                }
              : undefined
          }
        >
          <Sparkles size={13} strokeWidth={2} />
          {badgeLabel}
        </span>
      )}
    </div>
  )
}

type TimelineBucket = 'day' | 'week' | 'month' | 'quarter'

interface TimelineProps {
  points: { month: string; plays: number; bucket_type?: TimelineBucket }[]
}

export function ListeningTimeline({ points }: TimelineProps) {
  const { tp, locale } = useT()
  if (points.length === 0) return null

  const max = Math.max(...points.map((p) => p.plays))
  if (max === 0) return null

  const bucket: TimelineBucket = points[0]?.bucket_type ?? 'month'
  const intlLocale = locale === 'tr' ? 'tr-TR' : 'en-US'

  const label = (iso: string) => {
    const d = new Date(iso)
    switch (bucket) {
      case 'day':
      case 'week':
        return d.toLocaleDateString(intlLocale, { day: 'numeric', month: 'short' })
      case 'quarter': {
        const q = Math.floor(d.getMonth() / 3) + 1
        return `Q${q} '${String(d.getFullYear()).slice(2)}`
      }
      case 'month':
      default:
        return d.toLocaleDateString(intlLocale, { month: 'short', year: '2-digit' })
    }
  }

  const first = points[0]!
  const last = points[points.length - 1]!

  return (
    <div className={styles.timeline}>
      <div className={styles.timelineBars} aria-hidden>
        {points.map((p) => (
          <div key={p.month} className={styles.timelineBarWrapper}>
            <div
              className={styles.timelineBar}
              style={{ height: `${Math.max(4, (p.plays / max) * 100)}%` }}
              title={tp('catalog.listeningStats.timelineTooltip', p.plays, { label: label(p.month) })}
            />
          </div>
        ))}
      </div>
      <div className={styles.timelineAxis}>
        <span>{label(first.month)}</span>
        {points.length > 1 && <span>{label(last.month)}</span>}
      </div>
    </div>
  )
}

export function AlbumTracklistTable({
  tracks,
  albumImageUrl,
}: {
  tracks: AlbumTrackItem[]
  albumImageUrl?: string | null
}) {
  const { t: tr, tp } = useT()
  if (!tracks || tracks.length === 0) return null

  return (
    <div className={styles.insetGroupContainer}>
      <div className={styles.trackList}>
        {tracks.map((t) => {
          const cover = t.imageUrl || albumImageUrl
          return (
            <IntentLink
              href={`/track/${t.id}`}
              className={styles.trackRow}
              key={t.id}
            >
              <span className={styles.trackRank}>{String(t.number).padStart(2, '0')}</span>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sizedUrl(cover, 44)} // 44 px satır kapağı (2026-09-24 perf)
                  alt={t.title}
                  className={styles.trackThumb}
                  loading="lazy"
                />
              ) : (
                <div
                  className={styles.trackThumb}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Disc3 size={18} strokeWidth={1.5} />
                </div>
              )}
              <div className={styles.trackMetaCol}>
                <span className={styles.trackName}>
                  {t.title}
                  {t.isTalisman && (
                    <span className={styles.trackBadgeTalisman}>
                      <Star size={10} fill="currentColor" /> {tr('catalog.listeningStats.talismanBadge')}
                    </span>
                  )}
                </span>
                <span className={styles.trackSubDetails}>
                  {t.playCount > 0
                    ? tp('catalog.listeningStats.plays', t.playCount)
                    : tr('catalog.listeningStats.unplayedInRosso')}
                </span>
              </div>
              <div className={styles.trackPlaysCol}>
                <span className={styles.trackPlays}>{t.durationFormatted}</span>
              </div>
            </IntentLink>
          )
        })}
      </div>
    </div>
  )
}

export function DiscoveredAlbumsGrid({
  albums,
}: {
  albums: ArtistAlbumItem[]
}) {
  const { t, tp } = useT()
  if (!albums || albums.length === 0) return null

  return (
    <div className={styles.albumsGrid}>
      {albums.map((alb) => (
        <IntentLink
          href={`/album/${encodeURIComponent(alb.name)}?artist=${encodeURIComponent(alb.artist)}`}
          className={styles.albumCard}
          key={alb.name}
        >
          <div className={styles.albumArtWrapper}>
            {alb.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sizedUrl(alb.imageUrl, 200)} // albüm ızgarası kartı (2026-09-24 perf)
                alt={alb.name}
                className={styles.albumArtImage}
                loading="lazy"
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                <Disc3 size={40} strokeWidth={1.2} />
              </div>
            )}
            {alb.completionRate > 0 && (
              <span className={styles.albumCompletionPill}>
                {t('catalog.listeningStats.completionPill', { rate: alb.completionRate })}
              </span>
            )}
          </div>
          <h4 className={styles.albumTitle}>{alb.name}</h4>
          <p className={styles.albumSubtitle}>
            {tp('catalog.listeningStats.trackCountShort', alb.trackCount)} ·{' '}
            {tp('catalog.listeningStats.plays', alb.userPlayCount)}
          </p>
        </IntentLink>
      ))}
    </div>
  )
}
