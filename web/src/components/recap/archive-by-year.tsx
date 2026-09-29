import Link from 'next/link'
import type { RecapSummary } from '@/lib/recap/read'
import { pickRecapCoverArt, recapCoverArtSrc } from '@/lib/recap/cover-art'
import { ayAdiTr } from '@/lib/recap/period-label'
import { getT } from '@/lib/i18n/server'
import styles from '@/app/(dashboard)/recap/recap.module.css'

// Arşiv — yıl bölümleri (2026-07-18, Sahibin bilgi mimarisi kararı):
// Aylık/Yıllık toggle'ı kaldırıldı. Kullanıcı "2023'e gideceğim" diye düşünür,
// "önce Aylık mı?" diye değil. Her yıl kendi bölümü: başta o yılın Yıllık Recap
// kartı (görsel olarak ağır — büyük kart = yıl), altında aylık kartlar grid'de
// (küçük kart = ay). Server component — client state gerekmez.

interface ArchiveByYearProps {
  monthly: RecapSummary[]
  yearly: RecapSummary[]
  /**
   * Kapak seçimi için tohum bileşeni. **İç recap ekranıyla AYNI formül**
   * kullanılır: `${userId}:${periodLabel}` (`[period_label]/page.tsx:42`).
   * Böylece listede görülen kapak, recap açılınca da aynı çıkar — kullanıcı
   * için görsel bir "kimlik" oluşur, kart tanınır hâle gelir.
   */
  userId: string
}

interface YearSection {
  year: string
  yearly: RecapSummary | null
  months: RecapSummary[]
}

/** 'Mayıs 2026' → '2026' · '2025' → '2025' (period_label son token) */
function yearOf(label: string): string {
  const parts = label.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/**
 * 'May 2026' → 'Mayıs' — yıl zaten bölüm başlığında, kartta tekrar etmez.
 * ⚠ `period_label` DB'de İNGİLİZCE ('May 2026'); yalnız gösterimde çevrilir
 * (bkz. `lib/recap/period-label.ts` — URL anahtarı olduğu için DB'ye dokunulmaz).
 */
function monthOf(label: string): string {
  const parts = label.trim().split(/\s+/)
  const ayKismi = parts.length > 1 ? parts.slice(0, -1).join(' ') : label
  return ayAdiTr(ayKismi)
}

function buildSections(monthly: RecapSummary[], yearly: RecapSummary[]): YearSection[] {
  const byYear = new Map<string, YearSection>()

  for (const y of yearly) {
    const year = yearOf(y.period_label)
    byYear.set(year, { year, yearly: y, months: [] })
  }
  for (const m of monthly) {
    const year = yearOf(m.period_label)
    const section = byYear.get(year) ?? { year, yearly: null, months: [] }
    section.months.push(m)
    byYear.set(year, section)
  }

  const sections = [...byYear.values()]
  // Yıllar yeni → eski; yıl içinde aylar yeni → eski (period_start otoritedir)
  sections.sort((a, b) => Number(b.year) - Number(a.year))
  for (const s of sections) {
    s.months.sort((a, b) => b.period_start.localeCompare(a.period_start))
  }
  return sections
}

export async function ArchiveByYear({ monthly, yearly, userId }: ArchiveByYearProps) {
  const { t } = await getT()
  const sections = buildSections(monthly, yearly)
  const currentYear = String(new Date().getFullYear())

  /** Kartın kapak yolu — iç ekranla aynı tohum (bkz. `userId` prop notu). */
  const kapak = (periodLabel: string) =>
    recapCoverArtSrc(pickRecapCoverArt(`${userId}:${periodLabel}`))

  if (sections.length === 0) {
    return (
      <section aria-label={t('recap.byYear.archiveLabel')}>
        <p className={styles.sectionEyebrow}>{t('recap.byYear.eyebrow')}</p>
        <div className={styles.archiveEmptyState}>
          <p className={styles.archiveEmptyTitle}>{t('recap.byYear.emptyTitle')}</p>
          <p className={styles.archiveEmptyBody}>
            {t('recap.byYear.emptyBody')}{' '}
            <Link href="/data" prefetch={false} className={styles.archiveEmptyLink}>{t('recap.byYear.emptyLink')}</Link>
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-label={t('recap.byYear.archiveLabel')}>
      <p className={styles.sectionEyebrow}>{t('recap.byYear.eyebrow')}</p>

      <div className={styles.yearSections}>
        {sections.map((s) => (
          <section key={s.year} className={styles.yearSection} aria-label={t('recap.byYear.yearArchiveLabel', { year: s.year })}>
            <div className={styles.yearHeader}>
              <h2 className={styles.yearHeading}>{s.year}</h2>
              <span className={styles.yearRule} aria-hidden />
            </div>

            {s.yearly ? (
              <Link
                href={`/recap/${s.yearly.period_label}`}
                prefetch={false}
                className={styles.yearlyArchiveCard}
                style={{ ['--kapak' as string]: `url(${kapak(s.yearly.period_label)})` }}
              >
                {/* Kapak katmanı: CSS `--kapak` değişkeniyle çiziliyor —
                    `<img>` değil, çünkü bu dekoratif bir zemin. Ekran
                    okuyucuya bir şey söylemez, `alt` gerektirmez. */}
                <span className={styles.archiveCoverLayer} aria-hidden />
                <span className={styles.yearlyArchiveInfo}>
                  <span className={styles.recapCardEyebrow}>{t('recap.byYear.yearlyLabel')}</span>
                  <span className={styles.yearlyArchiveTitle}>{s.year}</span>
                </span>
                <span className={styles.recapCardCTA}>{t('recap.byYear.openCta')}</span>
              </Link>
            ) : s.year === currentYear ? (
              /* Geçmiş yıllarda placeholder gösterilmez — veri yetersiz yıllara
                 yıllık recap üretilmiyor (migration 0069); yalnız içinde
                 bulunduğumuz yılın recap'i "henüz" yoktur. */
              <div className={`${styles.yearlyArchiveCard} ${styles.yearlyArchivePending}`}>
                <span className={styles.yearlyArchiveInfo}>
                  <span className={styles.recapCardEyebrow}>{t('recap.byYear.yearlyLabel')}</span>
                  <span className={styles.yearlyArchivePendingText}>
                    {t('recap.byYear.yearlyPending', { year: s.year })}
                  </span>
                </span>
              </div>
            ) : null}

            {s.months.length > 0 && (
              <div className={styles.archiveBento}>
                {s.months.map((m) => (
                  <Link
                    key={m.id}
                    href={`/recap/${m.period_label}`}
                    prefetch={false}
                    className={styles.archiveBentoCard}
                    style={{ ['--kapak' as string]: `url(${kapak(m.period_label)})` }}
                  >
                    <span className={styles.archiveCoverLayer} aria-hidden />
                    <span className={styles.archiveBentoLabel}>{monthOf(m.period_label)}</span>
                    <span className={styles.archiveBentoCTA}>{t('recap.byYear.openCta')}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  )
}
