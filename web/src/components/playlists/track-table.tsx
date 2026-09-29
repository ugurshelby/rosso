'use client'

import { IntentLink } from '@/components/ui/intent-link'
import { AnimatePresence, motion } from 'motion/react'
import { Clock, Play } from 'lucide-react'
import { TrackThumb } from './track-thumb'
import { TrackRowMenu } from './track-row-menu'
import { TrackReorderButtons } from './track-reorder-buttons'
import { SPRING_UI } from '@/lib/motion/apple-spring'
import { useT } from '@/lib/i18n/provider'
import styles from './playlist-detail.module.css'

interface Track {
  id: string
  title: string
  artist_name: string | string[]
  isrc: string | null
  duration_ms: number | null
  album: string | null
  album_image_url?: string | null
  spotify_id?: string | null
}

interface TrackRow {
  position: number
  tracks: Track | null
  /**
   * A1 — bu şarkının listeye eklendiği tarih (Faz 4).
   * ⚠ Çoğu listede NULL: Spotify export'unda playlist URI'si yok, eşleştirme
   * ad üzerinden yapılıyor (ölçüm: 112 listenin ~30'u). Null ise sütun
   * boş kalır — "bilinmiyor" yazmayız (boş etiket gürültüdür).
   */
  addedAt?: string | null
}

/** "Nis 2024" — gün gereksiz, listeye ekleme bir ANI değil bir DÖNEM. */
function formatAdded(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface TrackTableProps {
  rows: TrackRow[]
  /** Verilirse her satıra yukarı/aşağı sıralama düğmesi eklenir — yalnız
   * gerçek Spotify playlist detayında (mood workspace'te reorder yok,
   * mood'un `playlists` tablosunda kaydı yok, taşınacak bir Spotify
   * playlist'i olarak var değil). */
  playlistId?: string
  /**
   * Satır çıkışlarını (ör. mood çalışma alanında "çıkar" tıklaması)
   * animasyonla göster — `AnimatePresence` + kayma/solma. Varsayılan false:
   * playlist detay/albüm gibi satır sayısı değişmeyen yerlerde gereksiz
   * render maliyeti eklenmez (2026-09-16, Sahip: "çıkarma deneyimi
   * arttırılmalı").
   */
  animated?: boolean
}

/** Birincil sanatçı — detay sayfası bununla açılır (RPC tracks.artists[1] kullanır). */
function primaryArtist(artist: string | string[]): string | null {
  if (Array.isArray(artist)) return artist[0] ?? null
  return artist || null
}

/** 3:42 — Spotify süre biçimi. Bilinmiyorsa boş (uydurma "0:00" yazmayız). */
function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function artistLabel(artist: string | string[]): string {
  if (Array.isArray(artist)) return artist.join(', ')
  return artist
}

export function TrackTable({ rows, playlistId, animated = false }: TrackTableProps) {
  const { t } = useT()

  if (rows.length === 0) {
    return (
      <p className={styles.trackEmpty}>
        {t('playlists.trackTable.empty')}
      </p>
    )
  }

  const lastIndex = rows.length - 1
  // Sütunlar yalnız veri VARSA açılır: tracks.album canlıda neredeyse boş,
  // `addedAt` çoğu listede null — boş sütun Spotify'da olmaz, gürültüdür.
  const hasAlbum = rows.some((r) => r.tracks?.album)
  const hasAdded = rows.some((r) => r.addedAt)

  // Yalnız `animated` iken exit/layout animasyonu uygulanır; kapalıyken
  // motion.div sıradan bir div gibi davranır (fazladan görsel davranış yok).
  const rowMotionProps = animated
    ? {
        layout: true,
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, x: -24, height: 0, transition: { ...SPRING_UI, duration: 0.22 } },
        transition: SPRING_UI,
      }
    : {}

  const rowElements = rows.map((row, index) => {
          if (!row.tracks) return null
          const track = row.tracks
          const artist = primaryArtist(track.artist_name)

          return (
            <motion.div
              key={`${row.position}-${track.id}`}
              className={styles.trackRow}
              role="listitem"
              {...rowMotionProps}
            >
              {/* Spotify indeks/çal takası: sayı hover'da çal ikonuna döner (Spotify'da açar). */}
              <div className={styles.trackIndex}>
                <span className={styles.trackIndexNum}>{index + 1}</span>
                {track.spotify_id ? (
                  <a
                    href={`https://open.spotify.com/track/${track.spotify_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.trackIndexPlay}
                    aria-label={t('playlists.trackTable.playOnSpotify', { title: track.title })}
                  >
                    <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden />
                  </a>
                ) : null}
              </div>

              <div className={styles.trackThumbWrap}>
                <TrackThumb trackId={track.id} title={track.title} artist={artistLabel(track.artist_name)} />
              </div>

              <div className={styles.trackInfo}>
                {/* Şarkı ve sanatçı adları artık detay sayfalarına götürür.
                    Albüm adı LINK DEĞİL — tracks.album canlıda 0/11679 dolu,
                    albüm sayfası boş çıkardı. */}
                <IntentLink href={`/track/${track.id}`} className={styles.trackTitleLink}>
                  {track.title}
                </IntentLink>
                {artist ? (
                  <IntentLink
                    href={`/artist/${encodeURIComponent(artist)}`}
                    className={styles.trackArtistLink}
                  >
                    {artistLabel(track.artist_name)}
                  </IntentLink>
                ) : (
                  <span className={styles.trackArtist}>{artistLabel(track.artist_name)}</span>
                )}
              </div>

              {hasAlbum && (
                <span className={styles.trackAlbum} title={track.album ?? undefined}>
                  {track.album ?? ''}
                </span>
              )}

              {/* A1 — eklenme tarihi. Satırda yoksa hücre boş kalır (grid şekli bozulmasın). */}
              {hasAdded && (
                <span className={styles.trackAddedAt} title={t('playlists.trackTable.addedTooltip')}>
                  {row.addedAt ? formatAdded(row.addedAt) : ''}
                </span>
              )}

              <span className={styles.trackDuration}>{formatDuration(track.duration_ms)}</span>

              {playlistId && (
                <TrackReorderButtons
                  playlistId={playlistId}
                  position={index}
                  trackTitle={track.title}
                  isFirst={index === 0}
                  isLast={index === lastIndex}
                />
              )}

              <TrackRowMenu
                trackId={track.id}
                title={track.title}
                artist={artist}
                spotifyId={track.spotify_id ?? null}
              />
            </motion.div>
          )
        })

  return (
    <div className={styles.trackTableWrap}>
      <div
        className={`${styles.trackTableBody} ${playlistId ? styles.trackTableBodyReorderable : ''}`}
        data-album={hasAlbum ? '1' : undefined}
        data-added={hasAdded ? '1' : undefined}
      >
        <div className={styles.trackHeadRow} aria-hidden>
          <span className={styles.trackHeadIndex}>#</span>
          <span className={styles.trackHeadTitle}>{t('playlists.trackTable.headerTitle')}</span>
          {hasAlbum && <span>{t('playlists.trackTable.headerAlbum')}</span>}
          {hasAdded && (
            <span className={styles.trackHeadAdded}>{t('playlists.trackTable.headerAdded')}</span>
          )}
          <span className={styles.trackHeadDuration}>
            <Clock size={14} strokeWidth={1.75} />
          </span>
          {playlistId && <span />}
          <span />
        </div>
      <div
        className={styles.trackRows}
        role="list"
        aria-label={t('playlists.trackTable.tracksAriaLabel')}
      >
        {animated ? <AnimatePresence initial={false}>{rowElements}</AnimatePresence> : rowElements}
      </div>
      </div>
    </div>
  )
}
