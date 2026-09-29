import { IntentLink } from '@/components/ui/intent-link'
import Image from 'next/image'
import styles from './mood.module.css'
import type { YearSummary } from '@/lib/analytics/year-pkg'

/**
 * Your Years kartı — `PlaylistCard`'ı KULLANMAZ. Kapak görseli zaten yıl
 * sayısını içeriyor (`year-cover-generate.ts`), üstüne ayrıca başlık/tagline
 * basmak tekrar olurdu.
 */
export function YearCard({ year, coverUrl }: YearSummary) {
  return (
    <IntentLink href={`/playlists/mood/year/${year}`} className={styles.yearCard} aria-label={`${year}`}>
      <div className={styles.yearCoverWrap}>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={String(year)}
            fill
            sizes="(min-width: 1024px) 20vw, 45vw"
            className={styles.yearCoverImg}
          />
        ) : (
          <span className={styles.yearFallback}>{year}</span>
        )}
      </div>
    </IntentLink>
  )
}
