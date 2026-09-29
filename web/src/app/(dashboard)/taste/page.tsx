import { Suspense } from 'react'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { getT } from '@/lib/i18n/server'
import type { MessageKey } from '@/lib/i18n'
import { gosterimKaynagi } from '@/lib/demo/read'
import { LockedShell } from '@/components/phase/locked-shell'
import { triggerUserRefresh } from '@/lib/sync/trigger-refresh'
import { getTastePackage, getListeningYearRange } from '@/lib/analytics/identity'
import type {
  ChronotypeSummary,
  GenreDistribution,
  ListeningYearRange,
} from '@/lib/analytics/identity'
import { IdentityHero } from '@/components/taste/identity-hero'
import type { MusicalIdentity } from '@/components/taste/identity-hero'
import { IdentityBadges } from '@/components/taste/identity-badges'
import { ListeningNote } from '@/components/taste/listening-note'
import { getDinlemeNotu } from '@/lib/analytics/music-intelligence'
import { getTasteYorumlari } from '@/lib/analytics/editorial-read'
import { HeatmapChrono } from '@/components/taste/heatmap-chrono'
import { GenreDNA } from '@/components/taste/genre-dna'
import { VibeCardHero } from '@/components/taste/vibe-card-hero'
import { VibeCardArt } from '@/components/vibe-cards/vibe-card-art'
import { matchVibeCard } from '@/lib/vibe-cards/match'
import { TwoStrips } from '@/components/taste/two-strips'
import { L1TastePreview } from '@/components/taste/l1-taste-preview'
import { L3LevelUpToast } from '@/components/taste/l3-level-up-toast'
import { getTasteProfile, getTopStrips } from '@/lib/analytics/taste-profile'
import { getLongTermTopTracks } from '@/lib/spotify/long-term-top'
import { getGenreColor } from '@/lib/genre-colors'
import { LoyalArtistsSection } from './loyal-artists-section'
import { L3BentoGrid } from './l3-bento-grid'
import { TasteExtras } from './taste-extras'
import styles from './taste.module.css'

function getDominantGenreColor(genre: GenreDistribution): string {
  if (!genre.available || genre.genres.length === 0) return 'var(--color-accent)'
  return getGenreColor(genre.genres[0]!.genre)
}

// ── Musical Identity Algorithm ───────────────────────────────────────────────
// Görünen tüm kimlik adları `messages/{en,tr}/taste.ts` → `identity.names`'te.
// Buradaki harita yalnız ham tür adını (`GenreDistribution`'dan gelir) sözlük
// anahtarına (`identity.names.<key>`) çevirir — GÖSTERİLMEZ.
const GENRE_KEY_MAP: Record<string, string> = {
  'Jazz': 'jazz',
  'Electronic': 'electronic',
  'Metal': 'metal',
  'Folk': 'folk',
  'Alternative': 'alternative',
  'Classical': 'classical',
  'Pop': 'pop',
  'Hip-Hop': 'hipHop',
  'R&B': 'rnb',
  'Latin': 'latin',
  'Blues': 'blues',
  'Rock': 'rock',
  'Indie': 'indie',
  'Soul': 'soul',
  'Arabesque': 'arabesque',
  'Country': 'country',
}

function getChronoKey(peakHour: number): string {
  if (peakHour >= 22 || peakHour <= 5) return 'night'
  if (peakHour >= 6 && peakHour <= 11) return 'morning'
  if (peakHour >= 12 && peakHour <= 16) return 'noon'
  return 'evening'
}

function deriveMusicalIdentity(
  chronotype: ChronotypeSummary,
  genre: GenreDistribution,
  yearRange: ListeningYearRange,
  t: Awaited<ReturnType<typeof getT>>['t']
): MusicalIdentity | null {
  if (!chronotype.available && !genre.available) return null

  const topGenre = genre.available && genre.genres.length > 0 ? genre.genres[0]!.genre : null
  const chronoKey = chronotype.available ? getChronoKey(chronotype.peakHour) : 'evening'

  const genreKey = topGenre
    ? (Object.keys(GENRE_KEY_MAP).find(
        (k) => topGenre.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(topGenre.toLowerCase())
      ) ?? null)
    : null
  const catalogGenreKey = genreKey ? GENRE_KEY_MAP[genreKey] : null

  const name = catalogGenreKey
    ? t(`taste.identity.names.${catalogGenreKey}.${chronoKey}` as MessageKey)
    : t(`taste.identity.chronoFallback.${chronoKey}` as MessageKey)

  const subtitleParts: string[] = []
  if (topGenre) subtitleParts.push(topGenre)
  if (chronotype.available) subtitleParts.push(t('taste.identity.peak', { label: chronotype.peakHourLabel }))
  // 2026-07-30 (Bulgu 2.4-A): aralık artık ilk/son çalma tarihinden geliyor
  // (iki indeksli sorgu), yıl-başına-şampiyon RPC'sinden değil (1412 ms).
  // `firstYear !== lastYear` şartı eski `years.length >= 2` davranışını korur:
  // tek yıllık kullanıcıda "2026–2026" yazılmaz, aralık hiç gösterilmez.
  if (
    yearRange.available &&
    yearRange.firstYear !== null &&
    yearRange.lastYear !== null &&
    yearRange.firstYear !== yearRange.lastYear
  ) {
    subtitleParts.push(`${yearRange.firstYear}–${yearRange.lastYear}`)
  }

  const description = t(`taste.identity.descriptions.${chronoKey}` as MessageKey)

  return { name, subtitle: subtitleParts.join(' · '), description }
}

// ── Page ────────────────────────────────────────────────────────────────────
export default async function TastePage() {
  const user = await requireAuth()
  const [{ t }, { veriKullanicisi, demoMu, kilitAcik }] = await Promise.all([
    getT(),
    gosterimKaynagi(user.id, 'taste'),
  ])

  // FAZ 2: recently-played'i arka planda tazele (sadece gerçek kullanıcıda).
  if (kilitAcik) {
    void triggerUserRefresh(user.id, 'recently_played')
  }

  // B2.4 (2026-07-19): en ağır sorgu (getLoyalArtists — tüm-geçmiş RPC) bu
  // Promise.all'dan çıkarıldı, LoyalArtistsSection içinde Suspense ile akıyor.
  // 2026-07-30 (Aşama 1, Bulgu 2.4-A): `getEraShift` → `getListeningYearRange`.
  // 2026-07-31 (Aşama 3, paket #2): Tür DNA + Kronotip artık TEK sorguda
  // `user_taste_pkg`'den geliyor (0,083 ms).
  // Dinleme notu (Katman B, 2026-09-19): aynı Promise.all turunda.
  // 2026-09-28: gosterimKaynagi ile kilitliyken demo persona verisi okunur.
  const [tastePkg, yearRange, tasteProfile, topStrips, dinlemeNotu] = await Promise.all([
    getTastePackage(veriKullanicisi),
    getListeningYearRange(veriKullanicisi),
    getTasteProfile(veriKullanicisi),
    getTopStrips(veriKullanicisi, 10),
    getDinlemeNotu(veriKullanicisi),
  ])

  // ⚠ PAKET YOKSA CANLI HESAP YAPILMAZ (§12.4-A bağlayıcı kuralı).
  if (!tastePkg) {
    if (kilitAcik) {
      const longTermTop = !tasteProfile.hasL2
        ? await getLongTermTopTracks(user.id)
        : { ok: false as const, reason: 'failed' as const }

      return (
        <div className={styles.emptyState}>
          <h1 className={styles.emptyTitle}>{t('taste.empty.title')}</h1>
          <p className={styles.emptyBody}>
            {t('taste.empty.body')}
          </p>
          {longTermTop.ok && longTermTop.tracks.length > 0 && (
            <L1TastePreview tracks={longTermTop.tracks} t={t} />
          )}
          <Link href="/dashboard" className={styles.emptyLink}>{t('taste.empty.backHome')}</Link>
        </div>
      )
    }

    // Kilitli ancak demo paketi tohumlanmamışsa
    return (
      <LockedShell
        featureKey="taste"
        isLocked={true}
        actionAdim="zip"
        missingZips={['streaming']}
        title={t('taste.empty.title')}
        description={t('taste.empty.body')}
      >
        <div className={styles.emptyState}>
          <h1 className={styles.emptyTitle}>{t('taste.empty.title')}</h1>
          <p className={styles.emptyBody}>{t('taste.empty.body')}</p>
        </div>
      </LockedShell>
    )
  }

  const { genre, chronotype } = tastePkg
  const identity = deriveMusicalIdentity(chronotype, genre, yearRange, t)
  const dominantGenreColor = getDominantGenreColor(genre)
  const vibeCardId = matchVibeCard(tasteProfile, veriKullanicisi)
  // Kişiye özel kimlik/vibe yorumları (Katman D, AI) — yoksa null, elle küratlı metinler çizilir.
  const tasteYorumlari = await getTasteYorumlari(veriKullanicisi, vibeCardId)

  const mainContent = (
    <>
      {/* HERO REVİZYONU: Başlık + kimlik kartı TEK sahne */}
      <div
        className={styles.identityPlate}
        style={{ '--identity-color': dominantGenreColor } as React.CSSProperties}
      >
        <VibeCardArt
          id={vibeCardId}
          className={styles.plateArt}
          priority
          sizes="(min-width: 768px) 60vw, 100vw"
        />
        <div className={styles.plateBlurLayer} aria-hidden="true" />
        <IdentityHero identity={identity} dominantGenreColor={dominantGenreColor} t={t} />
        <VibeCardHero seed={veriKullanicisi} vibeCardId={vibeCardId} narrativeOverride={tasteYorumlari?.vibe} t={t} />
      </div>

      <div className={styles.l3BentoGrid}>
        <Suspense fallback={<div className={styles.bentoSkeleton} />}>
          <L3BentoGrid 
            userId={veriKullanicisi} 
            hasL3={tasteProfile.hasL3} 
            identityWords={tasteProfile.identityWords} 
          />
        </Suspense>
      </div>

      {/* FAZ P6 — katmanlı kimlik + iki şerit (RPC-tabanlı, yeni motor) */}
      {tasteProfile.available && (
        <IdentityBadges
          words={tasteProfile.identityWords}
          blurb={tasteProfile.identityBlurb}
          coveragePct={tasteProfile.genreCoveragePct}
          isMature={tasteProfile.isMature}
          comments={tasteYorumlari?.axes}
        />
      )}

      {/* Dinleme notu — kimlik bölümünün devamı; AI yoksa hiç çizilmez. */}
      <ListeningNote note={dinlemeNotu} t={t} />

      <TwoStrips strips={topStrips} t={t} />
      <HeatmapChrono data={chronotype} />
      <GenreDNA
        data={genre}
        coveragePct={tasteProfile.genreCoveragePct}
        isMature={tasteProfile.isMature}
      />
      {/* Top 5 · seri · keşif skoru — eski profil sayfasından taşındı (V2). */}
      <Suspense fallback={<div className={styles.bentoSkeleton} />}>
        <TasteExtras userId={veriKullanicisi} />
      </Suspense>

      <Suspense fallback={null}>
        <LoyalArtistsSection userId={veriKullanicisi} />
      </Suspense>
    </>
  )

  if (!kilitAcik) {
    return (
      <LockedShell
        featureKey="taste"
        isLocked={true}
        demo={demoMu}
        actionAdim="zip"
        missingZips={['streaming']}
        title={t('taste.empty.title')}
        description={t('taste.empty.body')}
      >
        {mainContent}
      </LockedShell>
    )
  }

  return (
    <>
      {/* §1.14-F: L3 az önce işlendiyse bir kez "kimliğin derinleşti" toast'ı. */}
      <L3LevelUpToast hasL3={tasteProfile.hasL3} />
      {mainContent}

      {!genre.available && (
        <div className={styles.ctaBand}>
          <div className={styles.ctaBandLeft}>
            <p className={styles.ctaBandEyebrow}>{t('taste.cta.start')}</p>
            <p className={styles.ctaBandHeadline}>
              {t('taste.cta.headline')}
            </p>
          </div>
          <Link href="/data" className={styles.ctaButton} aria-label={t('taste.cta.goToData')}>
            {t('taste.cta.uploadHistory')}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2.5 7h9M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </>
  )
}
