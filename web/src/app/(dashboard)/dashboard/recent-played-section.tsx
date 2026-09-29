'use client'

import Link from 'next/link'
import { Disc3 } from 'lucide-react'
import { CoverArt } from '@/components/media/cover-art'
import { useCoverPalette } from '@/hooks/use-cover-palette'
import { useT } from '@/lib/i18n/provider'
import { formatRelative } from '@/lib/i18n'
import styles from './dashboard.module.css'

interface RecentPlay {
  track_id?: string | null
  raw_track_name: string | null
  raw_artist_name: string | null
  played_at: string
  image_url?: string | null
}

/**
 * FAZ DASHBOARD-REDESIGN (2. tur, §2 "Dynamic Album Art Accent"): en son
 * çalınan şarkının albüm kapağından baskın renk çıkarılıp ilk satırın
 * arkasına yumuşak bir ışıma olarak yansıtılır. `useCoverPalette` zaten
 * projede vardı (playlist/mood hero'larında kullanılıyor) — CORS/decode
 * hatalarında sessizce `null` döner, glow o zaman hiç basılmaz (yeni bir
 * hata yüzeyi açmaz).
 *
 * `page.tsx` server component olduğu için bu bölüm ayrı bir client
 * component'e çıkarıldı — server component içinde client-only hook
 * kullanmak derlenmez; aynı hatayı (cursor-glow RSC serialization) bu kez
 * en baştan doğru mimariyle önlüyoruz.
 */
export function RecentPlayedSection({ plays }: { plays: RecentPlay[] }) {
  const latest = plays[0]
  const palette = useCoverPalette(latest?.image_url ?? null)
  const { t, locale } = useT()

  return (
    <section className={styles.recentPlayedSection}>
      {/* <span> → <h2>: görünüm aynı, ekran okuyucu başlıklar arası gezinebiliyor (Ş-14). */}
      <h2 className={styles.sectionLabel}>{t('dashboard.recentPlayed.title')}</h2>
      <div className={styles.recentList} style={{ marginTop: 'var(--space-4)' }}>
        {plays.map((play, i) => (
          <div
            key={i}
            className={styles.recentItem}
            style={
              i === 0 && palette.dominant
                ? ({ '--album-accent': palette.dominant } as React.CSSProperties)
                : undefined
            }
            data-accent={i === 0 && palette.dominant ? 'true' : undefined}
          >
            {play.track_id ? (
              <CoverArt
                kind="track"
                id={play.track_id}
                size={36}
                alt=""
                src={play.image_url ?? null}
                fallbackTitle={play.raw_track_name ?? undefined}
                fallbackSubtitle={play.raw_artist_name ?? undefined}
                fallback={<Disc3 size={15} strokeWidth={1.5} />}
              />
            ) : (
              <div className={styles.recentCoverPlaceholder} aria-hidden="true" />
            )}
            <div className={styles.recentInfo}>
              {play.track_id ? (
                <Link href={`/track/${play.track_id}`} prefetch={false} className={`${styles.recentTrack} entity-link`}>
                  {play.raw_track_name ?? '—'}
                </Link>
              ) : (
                <span className={styles.recentTrack}>{play.raw_track_name ?? '—'}</span>
              )}
              {play.raw_artist_name ? (
                <Link
                  href={`/artist/${encodeURIComponent(play.raw_artist_name)}`}
                  prefetch={false}
                  className={`${styles.recentArtist} entity-link`}
                >
                  {play.raw_artist_name}
                </Link>
              ) : (
                <span className={styles.recentArtist}>—</span>
              )}
            </div>
            <span className={styles.recentTime}>
              {formatRelative(play.played_at, locale)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
