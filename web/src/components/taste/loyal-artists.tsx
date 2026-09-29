import { IntentLink } from '@/components/ui/intent-link'
import { Mic2 } from 'lucide-react'
import type { LoyalArtist } from '@/lib/analytics/identity'
import { CoverArt } from '@/components/media/cover-art'
import { Marquee } from '@/components/media/marquee'
import { LockedPreview } from '@/components/ui/locked-preview'
import type { Translator } from '@/lib/i18n/translate'
import styles from './loyal-artists.module.css'

interface LoyalArtistsProps {
  artists: LoyalArtist[]
  t: Translator['t']
}

// Boş durum önizlemesi (kilitli/blur sistemi, Sahip madde 9) — gerçek
// sanatçı adı/CoverArt ağ isteği tetiklemesin diye sabit temsili satırlar.
const PREVIEW_ROWS = [
  { year: 2023, name: 'Artist A', plays: '1,204 · 82 h' },
  { year: 2024, name: 'Artist B', plays: '980 · 61 h' },
  { year: 2025, name: 'Artist C', plays: '1,540 · 97 h' },
]

function formatMs(ms: number): string {
  const hours = Math.floor(ms / 3_600_000)
  if (hours >= 1) return `${hours} h`
  const mins = Math.floor(ms / 60_000)
  return `${mins} min`
}

export function LoyalArtists({ artists, t }: LoyalArtistsProps) {
  // ≥4 sanatçıda anlamlı; azsa şerit gösterilmez.
  const marqueeItems =
    artists.length >= 4
      ? artists.map((a) => (
          <>
            <CoverArt
              kind="artist"
              id={a.artist_name}
              size={40}
              rounded
              alt=""
              fallback={<Mic2 size={16} strokeWidth={1.5} />}
            />
            <span className={styles.marqueeName}>{a.artist_name}</span>
          </>
        ))
      : []

  return (
    <section className={styles.section} aria-label={t('taste.loyalArtists.ariaLabel')}>
      <span className={styles.eyebrow}>{t('taste.loyalArtists.eyebrow')}</span>
      <p className={styles.subtitle}>{t('taste.loyalArtists.subtitle')}</p>

      {/* Sonsuz kayan kapak şeridi (dekoratif — okuyucular listeyi kullanır) */}
      {marqueeItems.length > 0 && (
        <div className={styles.marqueeWrap}>
          <Marquee
            items={marqueeItems}
            keyOf={(i) => `${artists[i % artists.length]!.year}-${i}`}
            ariaLabel={t('taste.loyalArtists.marqueeAria')}
          />
        </div>
      )}

      {artists.length > 0 ? (
        <ol className={styles.list}>
          {artists.map(({ year, artist_name, play_count, total_ms }) => (
            <li key={year} className={styles.row}>
              <span className={styles.rank} role="img" aria-label={`${year}`}>
                {year}
              </span>
              <CoverArt
                kind="artist"
                id={artist_name}
                size={44}
                rounded
                alt={t('taste.loyalArtists.artistNameAria', { artist: artist_name })}
                fallback={<Mic2 size={18} strokeWidth={1.5} />}
              />
              <div className={styles.info}>
                <IntentLink
                  href={`/artist/${encodeURIComponent(artist_name)}`}
                  className={`${styles.name} entity-link`}
                >
                  {artist_name}
                </IntentLink>
                <span className={styles.years}>{t('taste.loyalArtists.artistOfYear', { year })}</span>
              </div>
              <span
                className={styles.playCount}
                role="img"
                aria-label={t('taste.loyalArtists.yearAria', { year, plays: play_count, duration: formatMs(total_ms) })}
              >
                {play_count.toLocaleString('en-US')} · {formatMs(total_ms)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <LockedPreview label={t('taste.loyalArtists.locked')}>
          <ol className={styles.list}>
            {PREVIEW_ROWS.map(({ year, name, plays }) => (
              <li key={year} className={styles.row}>
                <span className={styles.rank}>{year}</span>
                <span className={styles.previewAvatar} aria-hidden>
                  <Mic2 size={18} strokeWidth={1.5} />
                </span>
                <div className={styles.info}>
                  <span className={styles.name}>{name}</span>
                  <span className={styles.years}>{t('taste.loyalArtists.artistOfYear', { year })}</span>
                </div>
                <span className={styles.playCount}>{plays}</span>
              </li>
            ))}
          </ol>
        </LockedPreview>
      )}
    </section>
  )
}
