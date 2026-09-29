'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { PlaylistCoverFallback } from './playlist-cover-fallback'
import { CoverArt } from '@/components/media/cover-art'
import { platformConfig } from '@/lib/platforms'
import { useT } from '@/lib/i18n/provider'
import type { Platform } from '@rosso/shared-types'
import styles from './playlists.module.css'

// FAZ PERF-P1/P3 (2026-07-24): framer-motion (`motion/react`) SÖKÜLDÜ. Kart 104
// kez render ediliyordu; her birinde 2 hook (useReducedMotion + useHoverCapable)
// + 2 motion.div çalışıyordu → hydration yükü ve framer chunk'ı. Tek gerçek efekt
// kapak `whileHover={scale:1.04}` idi — saf CSS `:hover` ile birebir. Dokunmatik
// "yapışık hover" ve reduced-motion sorunları CSS media query'leriyle karşılanır
// (bkz. playlists.module.css .cover:hover kuralı: @media (hover:hover) +
// prefers-reduced-motion guard). Dış motion.div zaten ölüydü (animasyon prop'u yok).

export interface PlaylistCardData {
  id: string
  name: string
  platform: string
  track_count: number | null
  cover_url: string | null
  synced_at: string | null
  /** Kapak yerine basılacak özel node (mood SVG kapakları). cover_url'i ezer. */
  coverNode?: React.ReactNode
  /**
   * Şarkı sayısı yerine gösterilecek kısa açıklama (2026-07-30, Bulgu 5.1-A).
   * Mood kartları için: `/mood` ızgarası artık playlist ÇEKMİYOR (5 ağır sorgu
   * yalnız bir sayı için atılıyordu), bu yüzden `track_count` null geliyor —
   * kart boş kalmasın diye mood'un tagline'ı basılır.
   * `track_count` doluysa YOK SAYILIR; playlist kartları etkilenmez.
   */
  subtitle?: string
}

function formatLastSync(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function PlatformMicroLogo({ platform }: { platform: string }) {
  const config = platformConfig[platform as Platform]
  if (!config) return null
  return (
    <span
      className={styles.platformMicro}
      style={{ background: config.color }}
      title={config.label}
      // `role="img"` şart: rol taşımayan <span>'de `aria-label` YOK SAYILIR
      // (ölçüldü 2026-08-08 — /playlists'te 113 adet sessizce kayıptı).
      role="img"
      aria-label={config.label}
    />
  )
}

interface PlaylistCardProps {
  playlist: PlaylistCardData
  /** Yoğun grid modu — daha kompakt kart */
  compact?: boolean
  /** Çoklu seçim modu açık mı? Açıkken kart NAVİGASYON YAPMAZ, seçer. */
  selecting?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
  /** Kartın gideceği rota. Verilmezse `/playlists/{id}`. Mood için `/playlists/mood/{key}`. */
  href?: string
}

export function PlaylistCard({
  playlist,
  compact,
  selecting = false,
  selected = false,
  onSelect,
  href,
}: PlaylistCardProps) {
  const { t, tp } = useT()
  const cardClass = [
    styles.card,
    compact ? styles.cardCompact : '',
    selected ? styles.cardSelected : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Kartın iç içeriği — link ve buton sarmalayıcıları arasında paylaşılır.
  // Kapak yakınlaşması artık CSS: .cover:hover .coverImg/.coverArtFill { scale }
  // (yalnız @media (hover:hover), seçim modunda kapalı, reduced-motion'da sabit).
  const body = (
    <>
      <div className={styles.cover} data-selecting={selecting || undefined}>
        {playlist.coverNode ? (
          playlist.coverNode
        ) : playlist.cover_url ? (
          // P0 (2026-07-24): lazy + async. Lighthouse'ta /playlists 3 MB görsel
          // yüklüyordu (204 kapak hepsi birden) çünkü bu düz <img>'de lazy yoktu
          // — CoverArt'ın IntersectionObserver'ı yalnız cover_url YOKken devreye
          // giriyordu. Liste öğesi (hero değil) → ekran dışı kapaklar ertelenir.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.cover_url}
            alt=""
            className={styles.coverImg}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <CoverArt
            kind="playlist"
            id={playlist.id}
            // size=300: kapak ızgarada ~180-260px'e uzuyor. Küçük boyut istemek
            // bulanık kapak demek (hero'da yaşadığımız hata).
            size={300}
            alt=""
            className={styles.coverArtFill}
            fallback={<PlaylistCoverFallback platform={playlist.platform} iconSize={28} />}
          />
        )}

        {/* Seçim işareti — yalnız seçim modunda */}
        {selecting && (
          <span
            className={`${styles.selectMark} ${selected ? styles.selectMarkOn : ''}`}
            aria-hidden
          >
            {selected && <Check size={14} strokeWidth={3} />}
          </span>
        )}

        <div className={styles.coverPlatformLogo}>
          <PlatformMicroLogo platform={playlist.platform} />
        </div>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardName}>{playlist.name}</p>
        <div className={styles.cardMeta}>
          {playlist.track_count != null ? (
            <span className={styles.cardTrackCount}>
              {tp('playlists.card.tracksCount', playlist.track_count)}
            </span>
          ) : playlist.subtitle ? (
            <span className={styles.cardTrackCount}>{playlist.subtitle}</span>
          ) : null}
          {!compact && playlist.synced_at && (
            <span className={styles.cardSyncedAt}>
              {t('playlists.card.lastUpdated', { date: formatLastSync(playlist.synced_at) })}
            </span>
          )}
        </div>
      </div>
    </>
  )

  return (
    /* Kart artık kutu değil (Spotify düzeni) → yükselme/gölge animasyonu kalktı.
       Hover geri bildirimi: kart zemini belirir (CSS) + kapak hafifçe yakınlaşır. */
    <div style={{ position: 'relative', minWidth: 0 }}>
      {/* Seçim modunda kart bir BUTON'dur — tıklayınca playlist'e gitmez, seçer.
          Link bırakıp preventDefault etmek klavye/orta-tık ile yine gezinmeye
          izin verirdi; rol değişince davranış da net değişmeli. */}
      {selecting ? (
        <button
          type="button"
          className={cardClass}
          onClick={() => onSelect?.(playlist.id)}
          aria-pressed={selected}
          aria-label={playlist.name}
        >
          {body}
        </button>
      ) : (
        <Link href={href ?? `/playlists/${playlist.id}`} prefetch={false} className={cardClass} aria-label={playlist.name}>
          {body}
        </Link>
      )}
    </div>
  )
}
