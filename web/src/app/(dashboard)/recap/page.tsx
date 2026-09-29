import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { gosterimKaynagi } from '@/lib/demo/read'
import { LockedPreview } from '@/components/ui/locked-preview'
import { StaggerReveal, StaggerItem } from '@/components/recap/StaggerReveal'
import { ArchiveByYear } from '@/components/recap/archive-by-year'
import { JourneyCard } from '@/components/journey/journey-card'
import { getLatestMonthlyRecap, getLatestYearlyRecap, listRecaps } from '@/lib/recap/read'
import { pickRecapCoverArt, recapCoverArtSrc } from '@/lib/recap/cover-art'
import { donemEtiketiTr } from '@/lib/recap/period-label'
import { getT } from '@/lib/i18n/server'
import styles from './recap.module.css'

// Recap sayfası: tamamlanmış aylık/yıllık recaplar + arşiv bento grid.
// Katman 1 kullanıcısı son dönemi görebilir, geçmiş arşiv ise Katman 2 (Streaming History ZIP) ile açılır.
// 2026-09-28: kilitliyken demo persona arşivi LockedPreview arkasında gerçek bileşenle gösterilir.

export default async function RecapPage() {
  const user = await requireAuth('/recap')
  const [{ veriKullanicisi, demoMu, kilitAcik }, { t }] = await Promise.all([
    gosterimKaynagi(user.id, 'recap'),
    getT(),
  ])

  const [lastMonthlyRecap, lastYearlyRecap, archivedMonthly, archivedYearly] =
    await Promise.all([
      getLatestMonthlyRecap(user.id),
      getLatestYearlyRecap(user.id),
      listRecaps(veriKullanicisi, 'month'),
      listRecaps(veriKullanicisi, 'year'),
    ])

  /**
   * Kart kapağı — **iç recap ekranıyla AYNI tohum**
   * (`[period_label]/page.tsx:42` → `${user.id}:${periodLabel}`).
   * Listede görülen kapak, recap açılınca da aynı çıkar.
   */
  const kapak = (periodLabel: string) =>
    recapCoverArtSrc(pickRecapCoverArt(`${user.id}:${periodLabel}`))

  return (
    <div className={styles.recapArchivePage}>
      {/* 🔴 2026-09-17 (Sahip: header ile Journey kartı arası boşluk yok
          gibiydi) — StaggerReveal className'sız render olduğunda içindeki
          motion.div sade bir blok kalıyor, `.recapArchivePage`'in flex
          `gap`'i yalnız DOĞRUDAN çocuklar arasında işliyor ve bu tek div
          header+journeyHero'yu tek parça hâline getirip aradaki boşluğu
          yutuyordu. className ile StaggerReveal'in kendisi de aynı dikey
          gap'i taşıyor. */}
      <StaggerReveal className={styles.staggerGroup}>

        {/* ── Sayfa başlığı ── */}
        <StaggerItem>
          <header className={styles.archiveHeader}>
            <span className={styles.archiveEyebrow}>{t('recap.archive.eyebrow')}</span>
            <h1 className={styles.archiveTitle}>{t('recap.archive.title')}</h1>
            <p className={styles.archiveSubtitle}>{t('recap.archive.subtitle')}</p>
          </header>
        </StaggerItem>

        {/* ── Musical Journey — imza ürün, en üstte ve en vurgulu (2026-07-17,
            Sahip kararı: "journey en aşağıda kalıyor, hak ettiği biçimde
            gösterilsin"). Aylık/yıllık recap listesi büyüdükçe Journey artık
            en alta itilmiyor. ── */}
        <StaggerItem>
          <section className={styles.journeyHero} aria-label={t('recap.archive.journeySectionLabel')}>
            <JourneyCard />
          </section>
        </StaggerItem>

        {/* ── İkili hızlı erişim kartı: Son Aylık + Son Yıllık ──
            🔴 2026-08-11 (LCP turu) — kimlikli ölçüm bu bölümdeki
            `.archiveCoverLayer`'ı `/recap`'in LCP elemanı gösterdi (8.6s).
            `StaggerItem` İÇİNDEYKEN spring animasyonu bitene kadar
            `opacity: 1`'e ulaşmıyordu (elementRenderDelay 1.053ms, neredeyse
            resourceLoadDelay kadar). LCP adayı stagger'ın 3. sırasında
            beklemek zorunda değil — bu bölüm `StaggerReveal`'in DIŞINA
            alındı, anında görünür. Header ve Journey kartı stagger'da kalır
            (onlar LCP adayı değil, ölçüldü). */}
        <section aria-label={t('recap.archive.latestSectionLabel')}>
            <p className={styles.sectionEyebrow}>{t('recap.archive.latestEyebrow')}</p>
            <div className={styles.latestRecapGrid}>
              {lastMonthlyRecap ? (
                <Link
                  href={`/recap/${lastMonthlyRecap.period_label}`}
                  prefetch={false}
                  className={`${styles.recapCard} ${styles.recapCardMonthly}`}
                  style={{ ['--kapak' as string]: `url(${kapak(lastMonthlyRecap.period_label)})` }}
                >
                  <span className={styles.archiveCoverLayer} aria-hidden />
                  <span className={styles.recapCardEyebrow}>{t('recap.archive.latestMonthlyEyebrow')}</span>
                  {/* Yalnız GÖSTERİM çevrilir; href ve kapak tohumu ham etiketi kullanır. */}
                  <span className={styles.recapCardTitle}>{donemEtiketiTr(lastMonthlyRecap.period_label)}</span>
                  <span className={styles.recapCardCTA}>{t('recap.archive.openCta')}</span>
                </Link>
              ) : (
                <div className={`${styles.recapCard} ${styles.recapCardEmpty}`}>
                  <span className={styles.recapCardEyebrow}>{t('recap.archive.latestMonthlyEyebrow')}</span>
                  <span className={styles.recapCardEmptyText}>{t('recap.archive.emptyMonthly')}</span>
                </div>
              )}

              {lastYearlyRecap ? (
                <Link
                  href={`/recap/${lastYearlyRecap.period_label}`}
                  prefetch={false}
                  className={`${styles.recapCard} ${styles.recapCardYearly}`}
                  style={{ ['--kapak' as string]: `url(${kapak(lastYearlyRecap.period_label)})` }}
                >
                  <span className={styles.archiveCoverLayer} aria-hidden />
                  <span className={styles.recapCardEyebrow}>{t('recap.archive.latestYearlyEyebrow')}</span>
                  <span className={styles.recapCardTitle}>{donemEtiketiTr(lastYearlyRecap.period_label)}</span>
                  <span className={styles.recapCardCTA}>{t('recap.archive.openCta')}</span>
                </Link>
              ) : (
                <div className={`${styles.recapCard} ${styles.recapCardEmpty}`}>
                  <span className={styles.recapCardEyebrow}>{t('recap.archive.latestYearlyEyebrow')}</span>
                  <span className={styles.recapCardEmptyText}>
                    {t('recap.archive.emptyYearly', { year: new Date().getFullYear() })}
                  </span>
                </div>
              )}
            </div>
        </section>

        {/* ── Arşiv — yıl bölümleri (Katman 2 ile açılır) ── */}
        <StaggerItem>
          {kilitAcik ? (
            <ArchiveByYear monthly={archivedMonthly} yearly={archivedYearly} userId={user.id} />
          ) : (
            <LockedPreview
              badgeLabel={t('recap.archive.locked.badgeLabel')}
              title={t('recap.archive.locked.title')}
              description={t('recap.archive.locked.description')}
              ctaText={t('recap.archive.locked.cta')}
              href="/data"
              demo={demoMu}
            >
              <ArchiveByYear monthly={archivedMonthly} yearly={archivedYearly} userId={veriKullanicisi} />
            </LockedPreview>
          )}
        </StaggerItem>

      </StaggerReveal>
    </div>
  )
}
