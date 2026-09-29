'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Disc3, Mic2 } from 'lucide-react'
import { motion } from 'motion/react'
import { CoverArt } from '@/components/media/cover-art'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useT } from '@/lib/i18n/provider'
import { cleanTrackTitle } from '@/lib/recap/clean-title'
import styles from '@/app/(dashboard)/recap/recap.module.css'

interface TrackItem {
  track_id?: string | null
  raw_track_name: string | null
  raw_artist_name: string | null
  play_count: number
  total_ms: number
  album_image_url?: string | null
  /**
   * Paketten gelen kapak (plan 08 / migration 0214). Doluysa `CoverArt src=`
   * yolu: observer kurulmaz, `/api/images/…` isteği ATILMAZ, kapak ilk
   * render'da basılır. `null` ise eski lazy yol çalışır.
   */
  image_url?: string | null
}

interface ArtistItem {
  artist_name: string
  play_count: number
  total_ms: number
  /** Sanatçı görseli — paketten (bkz. TrackItem.image_url). */
  image_url?: string | null
}

interface TopListProps {
  tracks: TrackItem[]
  artists?: ArtistItem[]
}

function formatRank(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export function TopList({ tracks, artists }: TopListProps) {
  const [mode, setMode] = useState<'tracks' | 'artists'>('tracks')
  const showToggle = artists && artists.length > 0
  const { t, tp } = useT()

  return (
    <section className={styles.section} aria-label={t('recap.topList.ariaLabel')}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionEyebrow}>{t('recap.topList.eyebrow')}</p>
        {showToggle && (
          <SegmentedControl
            layoutId="dashboard-toplist-pill"
            ariaLabel={t('recap.topList.viewAriaLabel')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'tracks', label: t('recap.topList.trackTab'), icon: <Disc3 size={12} strokeWidth={1.5} aria-hidden /> },
              { value: 'artists', label: t('recap.topList.artistTab'), icon: <Mic2 size={12} strokeWidth={1.5} aria-hidden /> },
            ]}
          />
        )}
      </div>

      {mode === 'tracks' ? (
        <motion.div
          key="tracks-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ol className={styles.trackList}>
            {tracks.map((track, i) => {
              const trackName = track.raw_track_name ? cleanTrackTitle(track.raw_track_name) : track.raw_track_name
              return (
              <li
                key={track.track_id ?? `${track.raw_track_name}-${i}`}
                className={styles.trackRow}
              >
                <span className={styles.trackRank} role="img" aria-label={t('recap.topList.rankAriaLabel', { rank: formatRank(i) })}>
                  {formatRank(i)}
                </span>
                {track.track_id ? (
                  <CoverArt
                    kind="track"
                    id={track.track_id}
                    size={40}
                    className={styles.trackCoverFrame}
                    alt={trackName ?? t('recap.topList.trackCoverAlt')}
                    src={track.image_url ?? null}
                    fallbackTitle={trackName ?? undefined}
                    fallbackSubtitle={track.raw_artist_name ?? undefined}
                    fallback={<Disc3 size={16} strokeWidth={1.5} />}
                  />
                ) : (
                  <div className={styles.trackCoverPlaceholder} aria-hidden="true" />
                )}
                <div className={styles.trackInfo}>
                  {track.track_id ? (
                    <Link href={`/track/${track.track_id}`} prefetch={false} className={`${styles.trackName} entity-link`}>
                      {trackName ?? '---'}
                    </Link>
                  ) : (
                    <span className={styles.trackName}>{trackName ?? '---'}</span>
                  )}
                  {track.raw_artist_name ? (
                    <Link
                      href={`/artist/${encodeURIComponent(track.raw_artist_name)}`}
                      prefetch={false}
                      className={`${styles.trackArtist} entity-link`}
                    >
                      {track.raw_artist_name}
                    </Link>
                  ) : (
                    <span className={styles.trackArtist}>---</span>
                  )}
                </div>
                <span className={styles.trackDuration}>
                  {tp('recap.topList.playsCount', track.play_count)}
                </span>
              </li>
              )
            })}
          </ol>
        </motion.div>
      ) : (
        <motion.div
          key="artists-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ol className={styles.trackList}>
            {(artists ?? []).map((artist, i) => (
              <li
                key={artist.artist_name}
                className={styles.trackRow}
              >
                <span className={styles.trackRank} role="img" aria-label={t('recap.topList.rankAriaLabel', { rank: formatRank(i) })}>
                  {formatRank(i)}
                </span>
                <CoverArt
                  kind="artist"
                  id={artist.artist_name}
                  size={40}
                  rounded
                  className={styles.trackCoverFrame}
                  alt={t('recap.topList.artistAlt', { name: artist.artist_name })}
                  src={artist.image_url ?? null}
                  fallbackTitle={artist.artist_name}
                  fallback={<Mic2 size={16} strokeWidth={1.5} />}
                />
                <div className={styles.trackInfo}>
                  <Link
                    href={`/artist/${encodeURIComponent(artist.artist_name)}`}
                    prefetch={false}
                    className={`${styles.trackName} entity-link`}
                  >
                    {artist.artist_name}
                  </Link>
                </div>
                <span className={styles.trackDuration}>
                  {tp('recap.topList.playsCount', artist.play_count)}
                </span>
              </li>
            ))}
          </ol>
        </motion.div>
      )}
    </section>
  )
}
