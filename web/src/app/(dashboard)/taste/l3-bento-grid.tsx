import { getInferencesComparison } from '@/lib/taste/inferences'
import { getCuratorBehavior } from '@/lib/taste/curator'
import { LockedPreview } from '@/components/ui/locked-preview'
import { Cpu, Fingerprint, Archive, Sparkles, ShieldCheck } from 'lucide-react'
import { getT } from '@/lib/i18n/server'
import { formatNumber } from '@/lib/i18n'
import styles from './taste.module.css'

export async function L3BentoGrid({
  userId,
  hasL3,
  identityWords,
}: {
  userId: string
  hasL3: boolean
  identityWords: string[]
}) {
  const { t, locale } = await getT()

  if (!hasL3) {
    return (
      <>
        <div className={styles.l3LockedAyna}>
          <LockedPreview
            badgeLabel={t('taste.l3Bento.mirror.badgeLabel')}
            title={t('taste.l3Bento.mirror.title')}
            description={t('taste.l3Bento.mirror.description')}
            ctaText={t('taste.l3Bento.mirror.cta')}
            href="/data"
          >
            {null}
          </LockedPreview>
        </div>
        <div className={styles.l3LockedCurator}>
          <LockedPreview
            badgeLabel={t('taste.l3Bento.curator.badgeLabel')}
            title={t('taste.l3Bento.curator.title')}
            description={t('taste.l3Bento.curator.description')}
            ctaText={t('taste.l3Bento.curator.cta')}
            href="/data"
          >
            {null}
          </LockedPreview>
        </div>
      </>
    )
  }

  const [inferences, curator] = await Promise.all([
    getInferencesComparison(userId),
    getCuratorBehavior(userId),
  ])

  // Curator bar calculations
  const totalItems = curator.addedCount + curator.removedCount
  const addedPct = totalItems > 0 ? Math.max(2, Math.min(99.5, (curator.addedCount / totalItems) * 100)) : 100
  const removedPct = 100 - addedPct

  return (
    <>
      {inferences.hasData && (
        <div className={styles.bentoAyna}>
          <header className={styles.bentoHeader}>
            <div className={styles.bentoEyebrowRow}>
              <span className={styles.bentoBadge}>
                <Sparkles size={12} className={styles.bentoBadgeIcon} aria-hidden />
                <span>{t('taste.l3Bento.mirror.badge')}</span>
              </span>
              <span className={styles.bentoTagline}>{t('taste.l3Bento.mirror.tagline')}</span>
            </div>
            <h3 className={styles.bentoAynaTitle}>{t('taste.l3Bento.mirror.title')}</h3>
            <p className={styles.bentoSubhead}>
              {t('taste.l3Bento.mirror.subhead')}
            </p>
          </header>

          <div className={styles.aynaStage}>
            {/* Left: Spotify Algorithmic Perspective */}
            <div className={styles.aynaColumn}>
              <div className={styles.aynaColumnHeader}>
                <div className={styles.aynaIconWrapSpotify}>
                  <Cpu size={14} aria-hidden />
                </div>
                <div>
                  <h4 className={styles.aynaColHeading}>{t('taste.l3Bento.mirror.spotifyHeading')}</h4>
                  <span className={styles.aynaColSub}>{t('taste.l3Bento.mirror.spotifySub')}</span>
                </div>
              </div>
              <ul className={styles.aynaList}>
                {inferences.spotifyLabels.map((lbl, idx) => (
                  <li key={idx} className={styles.aynaItemSpotify}>
                    <span className={styles.aynaTagDot} aria-hidden />
                    <span className={styles.aynaTagText}>{lbl}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Center Bridge: VS Pill */}
            <div className={styles.aynaBridge} aria-hidden>
              <div className={styles.aynaBridgeLine} />
              <span className={styles.aynaBridgePill}>VS</span>
              <div className={styles.aynaBridgeLine} />
            </div>

            {/* Right: Rosso Genuine DNA */}
            <div className={styles.aynaColumn}>
              <div className={styles.aynaColumnHeader}>
                <div className={styles.aynaIconWrapRosso}>
                  <Fingerprint size={14} aria-hidden />
                </div>
                <div>
                  <h4 className={styles.aynaColHeadingRosso}>{t('taste.l3Bento.mirror.rossoHeading')}</h4>
                  <span className={styles.aynaColSubRosso}>{t('taste.l3Bento.mirror.rossoSub')}</span>
                </div>
              </div>
              <ul className={styles.aynaList}>
                {identityWords.slice(0, 3).map((w, idx) => (
                  <li key={idx} className={styles.aynaItemRosso}>
                    <span className={styles.aynaRossoDot} aria-hidden />
                    <span className={styles.aynaRossoText}>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.aynaFooterPlaque}>
            <p className={styles.aynaAltMetin}>
              {t('taste.l3Bento.mirror.footerQuote')}
            </p>
          </div>
        </div>
      )}

      {curator.hasData && (
        <div className={styles.bentoCurator}>
          <header className={styles.bentoHeader}>
            <div className={styles.bentoEyebrowRow}>
              <span className={styles.bentoBadge}>
                <Archive size={12} className={styles.bentoBadgeIcon} aria-hidden />
                <span>{t('taste.l3Bento.curator.badge')}</span>
              </span>
              <span className={styles.bentoTagline}>{t('taste.l3Bento.curator.tagline')}</span>
            </div>
            <h3 className={styles.bentoCuratorTitle}>{t('taste.l3Bento.curator.title')}</h3>
          </header>

          {/* Archetype Badge Pill */}
          <div className={styles.curatorArchetypePlaque}>
            <div className={styles.curatorArchetypeHeader}>
              <span className={styles.curatorArchetypePill}>
                <ShieldCheck size={13} className={styles.curatorArchetypeIcon} aria-hidden />
                <span>{curator.archetype.title}</span>
              </span>
              <span className={styles.curatorTagline}>{curator.archetype.tagline}</span>
            </div>
          </div>

          {/* Metric Presentation: Apple Health / Activity Style */}
          <div className={styles.curatorMetricBlock}>
            <div className={styles.curatorStatRow}>
              <div className={styles.curatorPercentCluster}>
                <span className={styles.curatorPercentValue}>
                  %{curator.curationStrictnessPct}
                </span>
                <span className={styles.curatorPercentLabel}>
                  {t('taste.l3Bento.curator.curationRate')}
                </span>
              </div>
              <div className={styles.curatorStatMeta}>
                <span className={styles.curatorStatMetaBadge}>
                  {t('taste.l3Bento.curator.preservation', { pct: curator.archetype.preservationRatePct })}
                </span>
              </div>
            </div>

            {/* Apple Activity-style Proportional Ratio Bar */}
            <div className={styles.curatorBarContainer} role="progressbar" aria-valuenow={curator.curationStrictnessPct} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.curatorBarTrack}>
                <div
                  className={styles.curatorBarAdded}
                  style={{ width: `${addedPct}%` }}
                  title={t('taste.l3Bento.curator.addedTitle', { count: formatNumber(curator.addedCount, locale) })}
                />
                {curator.removedCount > 0 && (
                  <div
                    className={styles.curatorBarRemoved}
                    style={{ width: `${removedPct}%` }}
                    title={t('taste.l3Bento.curator.removedTitle', { count: formatNumber(curator.removedCount, locale) })}
                  />
                )}
              </div>
              <div className={styles.curatorBarLegend}>
                <span className={styles.legendAdded}>
                  <span className={styles.legendDotAdded} aria-hidden />
                  {formatNumber(curator.addedCount, locale)} {t('taste.l3Bento.curator.added')}
                </span>
                <span className={styles.legendRemoved}>
                  <span className={styles.legendDotRemoved} aria-hidden />
                  {formatNumber(curator.removedCount, locale)} {t('taste.l3Bento.curator.removed')}
                </span>
              </div>
            </div>
          </div>

          <p className={styles.curatorDesc}>
            {curator.archetype.description}
          </p>
        </div>
      )}
    </>
  )
}

