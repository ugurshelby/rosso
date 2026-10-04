import Link from 'next/link'
import dynamic from 'next/dynamic'
import { requireAuth } from '@/lib/auth'
import { getPhaseState } from '@/lib/phase/read'
import { LockedPreview } from '@/components/ui/locked-preview'
import { JourneyPreviewBackdrop } from '@/components/journey/journey-preview-backdrop'
import { getJourneyEslikcileri, getJourneyYearsPackage } from '@/lib/journey/read'
import { getJourneyKapanisi, getJourneyYilNotlari } from '@/lib/analytics/editorial-read'
import { getTasteProfile } from '@/lib/analytics/taste-profile'
import { matchVibeCard } from '@/lib/vibe-cards/match'
import { CarSessionsBento } from './car-sessions-bento'
import { getLocale, getT } from '@/lib/i18n/server'
import { Suspense } from 'react'
import styles from './journey.module.css'

const JourneyView = dynamic(
  () => import('@/components/journey/journey-view').then(m => ({ default: m.JourneyView })),
  {
    loading: () => <div className={styles.journeySkeleton} aria-busy="true" />
  }
)

/** Bento mozaiğinde bir yıl için kaç kapak gösterilir. */
const COVERS_PER_YEAR = 12

export default async function JourneyPage() {
  const user = await requireAuth('/journey')
  const [{ t }, locale] = await Promise.all([getT(), getLocale()])

  // Tüm veritabanı ve durum sorgularını tek bir paralel turda çek (TTFB optimizasyonu)
  const [phaseState, pkg, eslikci, tasteProfile, yearNotes, closing] = await Promise.all([
    getPhaseState(user.id),
    getJourneyYearsPackage(user.id, COVERS_PER_YEAR),
    // Eşlikçiler paketi (0362): yılı o yılın sanatçı/albüm/şarkılarıyla anlatır.
    getJourneyEslikcileri(user.id),
    getTasteProfile(user.id),
    // AI editoryal yıl notları seçili dilde — opsiyonel; okuma hatası boş harita döner.
    getJourneyYilNotlari(user.id, locale === 'en' ? 'en' : 'tr'),
    // Kapanış metni (AI, opsiyonel): yoksa null → eski iki satırlık kapanış.
    getJourneyKapanisi(user.id),
  ])

  // Katman 2 (L2 — Streaming History) kilit kontrolü:
  // L1 kullanıcısına arayüzü asla boş bırakma; zengin Journey sahnesini blurlu göster.
  if (!phaseState.capabilities.canSeeJourney) {
    return (
      <LockedPreview
        variant="fullscreen"
        badgeLabel={t('journey.page.lockedBadge')}
        title={t('journey.page.lockedTitle')}
        description={t('journey.page.lockedDescription')}
        ctaText={t('journey.page.lockedCta')}
        href="/data"
      >
        <JourneyPreviewBackdrop />
      </LockedPreview>
    )
  }

  if (!pkg) {
    return (
      <div className={styles.emptyPage}>
        <h1 className={styles.emptyTitle}>{t('journey.page.preparingTitle')}</h1>
        <p className={styles.emptyBody}>{t('journey.page.preparingBody')}</p>
        <Link href="/recap" className={styles.backLink}>{t('journey.page.backToRecaps')}</Link>
      </div>
    )
  }

  const { years, covers } = pkg

  if (years.length === 0) {
    return (
      <div className={styles.emptyPage}>
        <h1 className={styles.emptyTitle}>{t('journey.page.notEnoughTitle')}</h1>
        <p className={styles.emptyBody}>{t('journey.page.notEnoughBody')}</p>
        <Link href="/recap" className={styles.backLink}>{t('journey.page.backToRecaps')}</Link>
      </div>
    )
  }

  return (
    <JourneyView
      years={years}
      covers={covers}
      eslikci={eslikci}
      vibeCardId={matchVibeCard(tasteProfile, user.id)}
      userId={user.id}
      yearNotes={yearNotes}
      closing={closing}
      carSessionsNode={
        <Suspense fallback={null}>
          <CarSessionsBento userId={user.id} hasL3={tasteProfile.hasL3} />
        </Suspense>
      }
    />
  )
}
