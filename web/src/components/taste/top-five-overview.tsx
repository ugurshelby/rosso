'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import { Music, Mic2, Disc, Sparkles } from 'lucide-react'
import { CoverArt } from '@/components/media/cover-art'
import { springFor, SPRING_UI } from '@/lib/motion/apple-spring'
import { useT } from '@/lib/i18n/provider'
import styles from './top-five-overview.module.css'

export type TopFiveTab = 'tracks' | 'artists' | 'albums'

export interface TopFiveTrack {
  trackId: string | null
  title: string | null
  artist: string | null
}

export interface TopFiveArtist {
  name: string
  imageUrl: string | null
}

export interface TopFiveAlbum {
  name: string
  artist: string | null
  imageUrl: string | null
  playCount?: number
}

export interface TopFiveOverviewProps {
  tracks?: TopFiveTrack[]
  artists?: TopFiveArtist[]
  albums?: TopFiveAlbum[]
  className?: string
}

function formatRank(index: number): string {
  const rank = index + 1
  return rank < 10 ? `0${rank}` : `${rank}`
}

/**
 * Top 5 — Tracks / Artists / Albums sekmeli özet (Taste sayfası).
 * Veri kullanıcının kendi dinleme geçmişinden gelir (history_top_* RPC'leri).
 * Apple Design: akışkan yay göstergesi, tabular rakamlar, anında basma yanıtı,
 * eksik veride dirençli yedekler.
 */
export function TopFiveOverview({
  tracks = [],
  artists = [],
  albums = [],
  className,
}: TopFiveOverviewProps) {
  const [activeTab, setActiveTab] = useState<TopFiveTab>('tracks')
  const { t } = useT()
  const trackList = tracks
  const artistList = artists
  const albumList = albums
  const reducedMotion = useReducedMotion()

  return (
    <section className={`${styles.card} ${className ?? ''}`} aria-label={t('taste.topFive.ariaLabel')}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Sparkles size={16} className={styles.titleIcon} aria-hidden />
          <h2 className={styles.title}>{t('taste.topFive.title')}</h2>
        </div>

        {/* Segmented Control */}
        <div className={styles.segmentedControl} role="tablist" aria-label={t('taste.topFive.categoryAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tracks'}
            className={`${styles.segmentBtn} ${activeTab === 'tracks' ? styles.segmentBtnActive : ''}`}
            onClick={() => setActiveTab('tracks')}
          >
            {activeTab === 'tracks' && (
              <motion.span
                layoutId="top-five-pill"
                className={styles.segmentPill}
                transition={springFor(!!reducedMotion, SPRING_UI)}
                aria-hidden
              />
            )}
            {t('taste.topFive.tracks')}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'artists'}
            className={`${styles.segmentBtn} ${activeTab === 'artists' ? styles.segmentBtnActive : ''}`}
            onClick={() => setActiveTab('artists')}
          >
            {activeTab === 'artists' && (
              <motion.span
                layoutId="top-five-pill"
                className={styles.segmentPill}
                transition={springFor(!!reducedMotion, SPRING_UI)}
                aria-hidden
              />
            )}
            {t('taste.topFive.artists')}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'albums'}
            className={`${styles.segmentBtn} ${activeTab === 'albums' ? styles.segmentBtnActive : ''}`}
            onClick={() => setActiveTab('albums')}
          >
            {activeTab === 'albums' && (
              <motion.span
                layoutId="top-five-pill"
                className={styles.segmentPill}
                transition={springFor(!!reducedMotion, SPRING_UI)}
                aria-hidden
              />
            )}
            {t('taste.topFive.albums')}
          </button>
        </div>
      </div>

      {/* Content for active tab */}
      {activeTab === 'tracks' && (
        <div className={styles.list} role="tabpanel" aria-label={t('taste.topFive.tracksPanelAria')}>
          {trackList.length > 0 ? (
            trackList.slice(0, 5).map((track, idx) => (
              <div key={track.trackId ?? `${track.title}-${idx}`} className={styles.item}>
                <span className={styles.rank}>{formatRank(idx)}</span>

                <div className={styles.thumbWrap}>
                  {track.trackId ? (
                    <CoverArt
                      kind="track"
                      id={track.trackId}
                      size={40}
                      alt=""
                      className={styles.thumbImg}
                      fallback={<Music size={16} strokeWidth={1.5} />}
                    />
                  ) : (
                    <div className={styles.thumbFallback}>
                      <Music size={16} strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                <div className={styles.meta}>
                  <p className={styles.name}>
                    {track.trackId ? (
                      <Link href={`/track/${track.trackId}`} prefetch={false} className="entity-link">
                        {track.title ?? t('taste.topFive.unknownTrack')}
                      </Link>
                    ) : (
                      track.title ?? t('taste.topFive.unknownTrack')
                    )}
                  </p>
                  <p className={styles.sub}>
                    {track.artist ? (
                      <Link
                        href={`/artist/${encodeURIComponent(track.artist)}`}
                        prefetch={false}
                        className="entity-link"
                      >
                        {track.artist}
                      </Link>
                    ) : (
                      t('taste.topFive.unknownArtist')
                    )}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Music size={18} strokeWidth={1.5} aria-hidden />
              <p>{t('taste.topFive.noTracks')}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'artists' && (
        <div className={styles.list} role="tabpanel" aria-label={t('taste.topFive.artistsPanelAria')}>
          {artistList.length > 0 ? (
            artistList.slice(0, 5).map((artistItem, idx) => {
              const artist = artistItem.name
              const imgUrl = artistItem.imageUrl
              return (
                <div key={`${artist}-${idx}`} className={styles.item}>
                  <span className={styles.rank}>{formatRank(idx)}</span>

                  <div className={`${styles.thumbWrap} ${styles.thumbRounded}`}>
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt=""
                        width={40}
                        height={40}
                        className={styles.thumbImg}
                      />
                    ) : (
                      <CoverArt
                        kind="artist"
                        id={artist}
                        size={40}
                        rounded
                        alt=""
                        className={styles.thumbImg}
                        fallback={<Mic2 size={16} strokeWidth={1.5} />}
                      />
                    )}
                  </div>

                  <div className={styles.meta}>
                    <p className={styles.name}>
                      <Link
                        href={`/artist/${encodeURIComponent(artist)}`}
                        prefetch={false}
                        className="entity-link"
                      >
                        {artist}
                      </Link>
                    </p>
                    <p className={styles.sub}>{t('taste.topFive.artist')}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className={styles.emptyState}>
              <Mic2 size={18} strokeWidth={1.5} aria-hidden />
              <p>{t('taste.topFive.noArtists')}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'albums' && (
        <div className={styles.list} role="tabpanel" aria-label={t('taste.topFive.albumsPanelAria')}>
          {albumList.length > 0 ? (
            albumList.slice(0, 5).map((album, idx) => (
              <div key={`${album.name}-${idx}`} className={styles.item}>
                <span className={styles.rank}>{formatRank(idx)}</span>

                <div className={styles.thumbWrap}>
                  {album.imageUrl ? (
                    <Image
                      src={album.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      className={styles.thumbImg}
                    />
                  ) : (
                    <div className={styles.thumbFallback}>
                      <Disc size={16} strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                <div className={styles.meta}>
                  <p className={styles.name}>{album.name}</p>
                  <p className={styles.sub}>
                    {album.artist ? (
                      <Link
                        href={`/artist/${encodeURIComponent(album.artist)}`}
                        prefetch={false}
                        className="entity-link"
                      >
                        {album.artist}
                      </Link>
                    ) : (
                      t('taste.topFive.album')
                    )}
                    {album.playCount ? ` · ${t('taste.topFive.plays', { count: album.playCount })}` : null}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Disc size={18} strokeWidth={1.5} aria-hidden />
              <p>{t('taste.topFive.noAlbums')}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
