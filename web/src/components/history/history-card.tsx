'use client'

import Link from 'next/link'
import type { HistorySort } from '@/lib/analytics/history'
import { CoverArt } from '@/components/media/cover-art'
import { sizedUrl } from '@/lib/images/sized-url'
import { formatMinutes, formatPlays, initialOf } from './history-format'
import styles from './history.module.css'

interface HistoryCardProps {
  rank: number
  title: string
  subtitle?: string | null
  imageUrl: string | null
  shape: 'square' | 'circle'
  sort: HistorySort
  totalMs: number
  playCount: number
  /** Varsa kart tıklanınca gidilecek detay rotası (şarkı, sanatçı veya albüm). */
  href?: string
  /**
   * Sunucudan `imageUrl` boş geldiğinde CANLI çözümlemeye düşmek için —
   * artist detay sayfasıyla AYNI `CoverArt` yolu (2026-09-16, Sahip:
   * "bazı artist'lerin kapak görselleri history sayfasında gözükmüyor").
   *
   * Kök neden: history salt `artists.image_url`'i okuyor, boşsa Spotify'a
   * gidip DOLDURMUYOR — detay sayfası ise `CoverArt` ile canlı çözüp
   * `artists.image_url`'e kalıcı yazıyor. İkisi arasındaki fark buydu.
   * `kind`/`coverId` verilirse (artist: ad, track: uuid) `CoverArt` `src`
   * boşken kendi lazy-fetch + arka plan cache yoluna düşer — plain `<img>`
   * bunu hiç yapamaz.
   */
  kind?: 'artist' | 'track'
  coverId?: string | null
  /** Katman katman yükleme girişi (sınıf + stagger) — `revealItemProps` çıktısı. */
  reveal?: { className?: string; style?: React.CSSProperties }
}

/** Kart kapağının en geniş gösterim boyutu (CSS px) — 5 sütunlu masaüstü ızgarası. */
const HISTORY_COVER_PX = 200

export function HistoryCard({
  rank,
  title,
  subtitle,
  imageUrl,
  shape,
  sort,
  totalMs,
  playCount,
  href,
  kind,
  coverId,
  reveal,
}: HistoryCardProps) {
  const stat = sort === 'count' ? formatPlays(playCount) : formatMinutes(totalMs)
  /*
   * 2026-09-24 performans denetimi: kart ızgarası 2-5 sütun, kapak en fazla
   * ~200 CSS px. Ham 640 px orijinaller iniyordu (HAR /gecmis: 138 görsel,
   * 9,3 MB). `CoverArt` responsive modda boyutu bilemediği için burada
   * boyutlanır.
   */
  const coverSrc = imageUrl ? sizedUrl(imageUrl, HISTORY_COVER_PX) : imageUrl

  const cover = (
    <div
      className={`${styles.cover} ${shape === 'circle' ? styles.coverCircle : ''}`}
      data-placeholder={imageUrl ? undefined : ''}
    >
      {kind && coverId ? (
        <CoverArt
          kind={kind}
          id={coverId}
          src={coverSrc}
          responsive
          rounded={shape === 'circle'}
          fallbackTitle={title}
          fallbackSubtitle={subtitle ?? undefined}
          fallback={
            <span className={styles.coverInitial} aria-hidden>
              {initialOf(title)}
            </span>
          }
          // İlk 4 kart LCP adayı — bkz. aşağıdaki 2026-08-11 notu, aynı
          // gerekçe `CoverArt`'ın priority prop'una taşındı.
          priority={rank <= 4}
        />
      ) : imageUrl ? (
        // Katalog görselleri harici host (Spotify/Storage) — next/image yerine
        // düz img: bu görseller değişken host'lu ve zaten optimize (kapak boyutu).
        //
        // 🔴 2026-08-11 (LCP turu) — `/gecmis` LCP'si 8.7s idi ve LCP elemanı
        // bu görsellerden biriydi. Ölçüldü: `resourceLoadDelay 2.146ms` —
        // ilk kartlar bile `loading="lazy"` yüzünden geç keşfediliyordu.
        // İlk 4 kart (rank ≤ 4) genelde ilk ekranda görünür → eager + yüksek
        // öncelik; geri kalanı lazy kalır (uzun liste, hepsini eager yapmak
        // network'ü boğar).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverSrc ?? undefined}
          alt=""
          loading={rank <= 4 ? 'eager' : 'lazy'}
          fetchPriority={rank <= 4 ? 'high' : 'auto'}
          className={styles.coverImg}
        />
      ) : (
        <span className={styles.coverInitial} aria-hidden>
          {initialOf(title)}
        </span>
      )}
      <span className={styles.rank}>{rank}</span>
    </div>
  )

  const body = (
    <>
      {cover}
      <div className={styles.meta}>
        <span className={styles.cardTitle} title={title}>
          {title}
        </span>
        {subtitle ? (
          <span className={styles.cardSubtitle} title={subtitle}>
            {subtitle}
          </span>
        ) : null}
        <span className={styles.cardStat}>{stat}</span>
      </div>
    </>
  )

  return (
    <li className={[styles.card, reveal?.className].filter(Boolean).join(' ')} style={reveal?.style}>
      {href ? (
        <Link href={href} prefetch={false} className={styles.cardLink}>
          {body}
        </Link>
      ) : (
        <div className={styles.cardLink}>{body}</div>
      )}
    </li>
  )
}
