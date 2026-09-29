import Link from 'next/link'
import { Music2 } from 'lucide-react'
import type { TopStrips } from '@/lib/analytics/taste-profile'
import { CoverArt } from '@/components/media/cover-art'
import type { Translator } from '@/lib/i18n/translate'
import styles from './two-strips.module.css'

interface TwoStripsProps {
  strips: TopStrips
  t: Translator['t']
}

// FAZ P6.8 — İki şerit gösterimi (§1.9, §1.14-D):
//   "Şu An" (decay) + "Değişmeyenler" (evergreen), yan yana (mobil alt alta).
//   Karıştırma yok — iki ayrı kimlik. Yatay scroll yok (mobil dikey).
export function TwoStrips({ strips, t }: TwoStripsProps) {
  const hasData = strips.now.length > 0 || strips.evergreen.length > 0
  if (!hasData) return null

  return (
    <section className={styles.section} aria-label={t('taste.strips.ariaLabel')}>
      <div className={styles.grid}>
        <StripColumn
          eyebrow={t('taste.strips.rightNowEyebrow')}
          subtitle={t('taste.strips.rightNowSubtitle')}
          items={strips.now}
          t={t}
        />
        <StripColumn
          eyebrow={t('taste.strips.constantsEyebrow')}
          subtitle={t('taste.strips.constantsSubtitle')}
          items={strips.evergreen}
          t={t}
        />
      </div>
    </section>
  )
}

function StripColumn({
  eyebrow,
  subtitle,
  items,
  t,
}: {
  eyebrow: string
  subtitle: string
  items: TopStrips['now']
  t: Translator['t']
}) {
  return (
    <div className={styles.column}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <p className={styles.subtitle}>{subtitle}</p>
      {items.length > 0 ? (
        <ol className={styles.list}>
          {items.map((item) => (
            <li key={`${item.rank}-${item.title}`} className={styles.row}>
              <span className={styles.rank} role="img" aria-label={t('taste.strips.rankAria', { rank: item.rank })}>
                {String(item.rank).padStart(2, '0')}
              </span>
              <CoverArt
                kind="track"
                id={item.trackId ?? item.title ?? ''}
                src={item.imageUrl}
                size={40}
                rounded
                alt=""
                fallbackTitle={item.title ?? undefined}
                fallbackSubtitle={item.artist ?? undefined}
                fallback={<Music2 size={16} strokeWidth={1.5} />}
              />
              <div className={styles.info}>
                {item.trackId ? (
                  <Link href={`/track/${item.trackId}`} prefetch={false} className={`${styles.name} entity-link`}>
                    {item.title ?? '—'}
                  </Link>
                ) : (
                  <span className={styles.name}>{item.title ?? '—'}</span>
                )}
                {item.artist ? (
                  <Link
                    href={`/artist/${encodeURIComponent(item.artist)}`}
                    prefetch={false}
                    className={`${styles.artist} entity-link`}
                  >
                    {item.artist}
                  </Link>
                ) : (
                  <span className={styles.artist}>—</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>{t('taste.strips.empty')}</p>
      )}
    </div>
  )
}
