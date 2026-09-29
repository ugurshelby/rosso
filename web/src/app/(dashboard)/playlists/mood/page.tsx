import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { gosterimKaynagi } from '@/lib/demo/read'
import { LockedShell } from '@/components/phase/locked-shell'
import { ROSSO_PICKS, DAILY_PICKS } from '@/lib/analytics/mood'
import { getYearSummaries } from '@/lib/analytics/year-pkg'
import { PlaylistCard, type PlaylistCardData } from '@/components/playlists/playlist-card'
import { MoodCover } from '@/components/mood/mood-cover'
import { CatalogHero } from '@/components/mood/catalog-hero'
import { YearCard } from '@/components/mood/year-card'
import { getT } from '@/lib/i18n/server'
import playlistStyles from '@/components/playlists/playlists.module.css'
import styles from '@/components/mood/mood.module.css'
import type { MoodDef } from '@/lib/analytics/mood'

export const metadata: Metadata = {
  title: 'Anlar',
}

function toCardData(m: MoodDef): PlaylistCardData {
  return {
    id: m.key,
    name: m.title,
    platform: 'spotify',
    // null → sayı satırı basılmaz; yerine mood'un kimliği (tagline) gelir.
    track_count: null,
    subtitle: m.tagline,
    cover_url: null,
    synced_at: null,
    coverNode: <MoodCover moodKey={m.key} className={playlistStyles.coverImg} />,
  }
}

/**
 * Katalog sayfası (2026-09-18 yeniden kurgu): Hero → Rosso's Picks (7) →
 * Your Years (dinamik) → Daily Picks (5).
 * 2026-09-28: gosterimKaynagi ile kilitliyken demo persona verisi okunur.
 */
export default async function MoodPage() {
  const user = await requireAuth()
  const [{ veriKullanicisi, demoMu, kilitAcik }, { t }] = await Promise.all([
    gosterimKaynagi(user.id, 'mood'),
    getT(),
  ])

  const years = await getYearSummaries(veriKullanicisi)

  const content = (
    <div className={styles.page}>
      <CatalogHero />

      <section aria-label={t('playlists.catalog.rossoPicksAriaLabel')} className={styles.section}>
        <header className={styles.sectionHeader}>
          <p className={styles.eyebrow}>{t('playlists.catalog.rossoPicksEyebrow')}</p>
          <h2 className={styles.sectionTitle}>{t('playlists.catalog.rossoPicksTitle')}</h2>
        </header>
        <div
          className={`${playlistStyles.grid} ${styles.rossoPicksGrid}`}
          aria-label={t('playlists.catalog.rossoPicksGridAriaLabel')}
        >
          {ROSSO_PICKS.map((m) => (
            <PlaylistCard key={m.key} playlist={toCardData(m)} href={`/playlists/mood/${m.key}`} compact />
          ))}
        </div>
      </section>

      {years.length > 0 && (
        <section aria-label={t('playlists.catalog.yourYearsAriaLabel')} className={styles.section}>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{t('playlists.catalog.yourYearsEyebrow')}</p>
            <h2 className={styles.sectionTitle}>{t('playlists.catalog.yourYearsTitle')}</h2>
          </header>
          <div
            className={`${playlistStyles.grid} ${styles.yearsGrid}`}
            aria-label={t('playlists.catalog.yourYearsGridAriaLabel')}
          >
            {years.map((y) => (
              <YearCard key={y.year} year={y.year} coverUrl={y.coverUrl} />
            ))}
          </div>
        </section>
      )}

      <section aria-label={t('playlists.catalog.dailyPicksAriaLabel')} className={styles.section}>
        <header className={styles.sectionHeader}>
          <p className={styles.eyebrow}>{t('playlists.catalog.dailyPicksEyebrow')}</p>
          <h2 className={styles.sectionTitle}>{t('playlists.catalog.dailyPicksTitle')}</h2>
        </header>
        <div className={playlistStyles.grid} aria-label={t('playlists.catalog.dailyPicksGridAriaLabel')}>
          {DAILY_PICKS.map((m) => (
            <PlaylistCard key={m.key} playlist={toCardData(m)} href={`/playlists/mood/${m.key}`} compact />
          ))}
        </div>
      </section>
    </div>
  )

  if (!kilitAcik) {
    return (
      <LockedShell
        featureKey="mood"
        isLocked={true}
        demo={demoMu}
        actionAdim="zip"
        missingZips={['streaming']}
        title="Anlar"
      >
        {content}
      </LockedShell>
    )
  }

  return content
}
