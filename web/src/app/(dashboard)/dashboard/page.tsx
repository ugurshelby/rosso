import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Upload, Link2, Disc3 } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getT } from '@/lib/i18n/server'
import { formatRelative } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { triggerSmartSyncIfNeeded } from '@/lib/services/spotify-sync-recently-played'
import { donemEtiketiTr } from '@/lib/recap/period-label'
import { pickRecapCoverArt, recapCoverArtSrc } from '@/lib/recap/cover-art'
import { getTasteProfile } from '@/lib/analytics/taste-profile'
import { matchVibeCard } from '@/lib/vibe-cards/match'
import { StatBar } from '@/components/dashboard/StatBar'
import { FreshnessBar } from '@/components/dashboard/freshness-bar'
import { PhaseBanner } from '@/components/phase/phase-banner'
import { QuickStartSection } from '@/components/quick-start/quick-start-section'
import { getQuickStartState } from '@/lib/quick-start/read'
import { getPhaseState, sourceFilter } from '@/lib/phase/read'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getDashboardStats,
  getRecentActivity,
  getTopTracks,
  getTopArtists,
  getTotalListeningTime,
  type Period,
} from '@/lib/analytics/engine'
import { getLatestMonthlyRecap, getLatestYearlyRecap } from '@/lib/recap/read'
import { handleCardGlow } from '@/lib/cursor-glow'
import { InsightsRow } from './insights-row'
import { RecentPlayedSection } from './recent-played-section'
import styles from './dashboard.module.css'

/**
 * P0.2 — hydration yükü. **Ölçümle** seçildi, tahminle değil
 * (`lighthouse/10-08-2026/dashboard.json`).
 *
 * Tablo neyi söyledi:
 *   • LCP elemanı `<h1>` — sunucuda basılı, HTML'de HAZIR. TTFB 84 ms,
 *     ama `elementRenderDelay` **2.165 ms**: boyanamıyor çünkü ana thread
 *     tıkalı. Ana thread toplam 10,1 sn · Script Evaluation 3.196 ms.
 *   • Tek bir chunk (`25k72r…js`) **1.663 ms saf script evaluation** yakıyor.
 *     Karşılaştırma, "boyut = maliyet değil"in kanıtı: 65 KB'lık başka bir
 *     chunk yalnız 2,4 ms sürüyor. Sorun indirme değil ÇALIŞTIRMA.
 *   • `/dashboard`'da `motion/react`'i bundle'a sokan SADECE iki bileşen var:
 *     `ListeningsContent` ve `PeriodSelector`. Fold üstünde hiçbir şey
 *     motion kullanmıyor (shell, Sidebar, BottomNav, Toast, StatBar,
 *     FreshnessBar, CoverArt — hepsi ölçüldü, sıfır motion importu).
 *
 * Fold ölçüsü — ertelemenin görünürü geciktirmediğinin KANITI. Lighthouse
 * viewport'u 412×823 px; düğümlerin gerçek konumları raporda duruyor:
 *   `<h1>` (LCP)        → top **102 px**   (fold ÜSTÜ, dokunulmadı)
 *   Son Dinlenenler     → top 603–866 px   (fold sınırı, dokunulmadı)
 *   Dinlemelerim satır. → top **1.903 px** (fold'un ~2,3 ekran ALTI)
 *
 * Yani bu iki bileşen ilk ekranda GÖRÜNMÜYOR. `ssr: true` (varsayılan) —
 * HTML sunucuda üretilmeye devam eder, SEO ve ilk boyama korunur; ertelenen
 * yalnız JS'in inişi/çalışması. `ssr: false` KULLANILMADI: içerik sunucudan
 * kaybolur, boş kutu olarak boyanırdı.
 *
 * ⚠ Bu deseni bu dosyada icat etmedim — `lazy-visible-chart.tsx` aynı sayfada
 * recharts için aynı kararı verdi ve bir ders bıraktı: `dynamic` tek başına
 * indirmeyi ertelemeyebilir, o yüzden oradaki grafikler ayrıca
 * IntersectionObserver geçidi kullanıyor. Buradaki fark: bu bölüm zaten
 * `hasData` koşulunun arkasında ve fold'un çok altında.
 */
const ListeningsContent = dynamic(() =>
  import('./listenings-content').then((m) => ({ default: m.ListeningsContent })),
)
const PeriodSelector = dynamic(() =>
  import('@/components/recap/period-selector').then((m) => ({ default: m.PeriodSelector })),
)

/**
 * URL'den gelen dönemi doğrular.
 *
 * 🔴 `allowed` faz kilidinin bir parçası: Faz 2'de yalnız hafta/ay geçerlidir.
 * Bu kontrol olmadan `?period=alltime` yazan Faz 2 kullanıcısı ZIP verisini
 * görürdü — nav'ı gizlemek yetmez, parametre de süzülmeli.
 */
function parsePeriod(raw: string | undefined, allowed: Period[]): Period {
  if (raw && (allowed as string[]).includes(raw)) return raw as Period
  return allowed.includes('month') ? 'month' : (allowed[0] ?? 'month')
}

function formatMinutes(minutes: number, t: Awaited<ReturnType<typeof getT>>['t']): string {
  if (minutes === 0) return '0'
  if (minutes < 60) return t('dashboard.time.minutesShort', { count: minutes })
  const h = Math.floor(minutes / 60)
  if (h < 24) return t('dashboard.time.hoursShort', { count: h })
  const d = Math.floor(h / 24)
  return t('dashboard.time.daysShort', { count: d })
}

/** Günün saatine göre selamlama (Europe/Istanbul — sunucu UTC'de çalışır,
 *  timezone.ts ile aynı referans dilim). Sahip 2026-07-17: statik "Merhaba"
 *  yerine saate göre dinamik karşılama. */
function timeGreeting(t: Awaited<ReturnType<typeof getT>>['t']): string {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
    10
  ) % 24
  if (hour >= 6 && hour <= 11) return t('dashboard.greeting.morning')
  if (hour >= 12 && hour <= 17) return t('dashboard.greeting.afternoon')
  if (hour >= 18 && hour <= 22) return t('dashboard.greeting.evening')
  return t('dashboard.greeting.night')
}

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireAuth()
  const { t, tp, locale } = await getT()

  // Spotify kota kalkanı & akıllı sync (Faz 3): 30 dk DB korumalı, fire-and-forget.
  void triggerSmartSyncIfNeeded(user.id).catch(() => {})

  const resolvedParams = await searchParams

  // P0.3 — faz durumu ve quick start durumu. `cache()`'li.
  const [phaseState, quickStartState] = await Promise.all([
    getPhaseState(user.id),
    getQuickStartState(user.id),
  ])
  const caps = phaseState.capabilities

  // P0.6 — kaynak süzgeci. Faz 2'de yalnız canlı API verisi okunur; Faz 3+'ta
  // `undefined` → tüm kaynaklar (bugüne kadarki davranış, regresyon yok).
  const source = sourceFilter(caps.historyWindow)

  // P0.6 — Faz 2'de dönem seçici yalnız Hafta + Ay (Sahip onayı 2026-07-30).
  // API penceresi ~20 gün; "Tüm Zamanlar"/"Yıllık" burada yanıltıcı olurdu.
  const allowedPeriods: Period[] = caps.canSeeHistory
    ? ['week', 'month', 'year', 'alltime']
    : ['week', 'month']

  // Dönem faz kilidine tabi — parametre de süzülür (bkz. parsePeriod notu).
  const period = parsePeriod(resolvedParams.period, allowedPeriods)

  const email = user.email ?? ''
  const namePart = email.split('@')[0] ?? ''
  const displayName = user.user_metadata?.display_name as string | undefined
  const name = displayName ?? namePart

  const supabase = await createClient()

  // B2.4 (2026-07-19): en ağır 2 RPC (hourly/platform) bu Promise.all'dan
  // çıkarıldı — artık InsightsRow içinde <Suspense> ile ayrıca akıyor, sayfanın
  // üst bölümleri onları beklemiyor.
  const [
    dashStats, recentPlays, lastMonthlyRecap, lastYearlyRecap, platformConnections, playlistCountResp,
    tasteProfile,
    ...periodDataResults
  ] =
    await Promise.all([
      getDashboardStats(user.id, source),
      getRecentActivity(user.id, 5, source),
      getLatestMonthlyRecap(user.id),
      getLatestYearlyRecap(user.id),
      supabase
        .from('platform_connections')
        .select('last_recently_played_sync_at')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('playlists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      getTasteProfile(user.id),
      ...allowedPeriods.map(async (p) => {
        const [summary, topTracks, topArtists] = await Promise.all([
          getTotalListeningTime(user.id, p, source),
          getTopTracks(user.id, p, 5, source),
          getTopArtists(user.id, p, 5, source),
        ])
        return { period: p, summary, topTracks, topArtists }
      })
    ])

  const initialDataByPeriod = periodDataResults.reduce((acc, data) => {
    acc[data.period] = data
    return acc
  }, {} as Record<Period, { summary: { total_ms: number; total_tracks: number; total_artists: number }, topTracks: { track_id?: string | null; raw_track_name: string | null; raw_artist_name: string | null; play_count: number; total_ms: number; album_image_url?: string | null; image_url?: string | null }[], topArtists: { artist_name: string; play_count: number; total_ms: number; image_url?: string | null }[] }>)


  const playlistCount = playlistCountResp.count ?? 0

  const syncTimestamps = (platformConnections.data ?? [])
    .map((c) => c.last_recently_played_sync_at)
    .filter((t): t is string => Boolean(t))

  const lastSyncAt = syncTimestamps.length
    ? syncTimestamps.reduce((latest, t) => (new Date(t) > new Date(latest) ? t : latest))
    : null

  const lastSyncLabel = lastSyncAt ? formatRelative(lastSyncAt, locale) : null

  // 1:1 Kapak ve Vibe Kartı Sanat Eserleri (Dashboard rail arka planları)
  const monthlyCoverSrc = lastMonthlyRecap
    ? recapCoverArtSrc(pickRecapCoverArt(`${user.id}:${lastMonthlyRecap.period_label}`))
    : null

  const yearlyCoverSrc = lastYearlyRecap
    ? recapCoverArtSrc(pickRecapCoverArt(`${user.id}:${lastYearlyRecap.period_label}`))
    : null

  const vibeCardId = matchVibeCard(tasteProfile, user.id)
  const tasteCoverSrc = `/vibe-cards/${vibeCardId}.webp`

  // Tür kutusu: yalnız toplam tür SAYISI, diğer 3 kutuyla aynı hiyerarşi
  // (2026-07-18, Sahip revizyonu: chip listesi kaldırıldı — "dört kart aynı
  // hiyerarşiye sahip olmalı, sadece tek kartın ekstra bilgi göstermesi görsel
  // dengeyi bozuyor". Chip'ler dün eklenmişti, bugün geri alınıyor.)
  const stats = [
    {
      raw: dashStats.uniqueTracks,
      display: dashStats.uniqueTracks.toLocaleString('en-US'),
      label: t('dashboard.stats.track'),
    },
    {
      raw: dashStats.uniqueArtists,
      display: dashStats.uniqueArtists.toLocaleString('en-US'),
      label: t('dashboard.stats.artist'),
    },
    {
      raw: dashStats.topGenres.length,
      display: dashStats.topGenres.length.toLocaleString('en-US'),
      label: t('dashboard.stats.genre'),
    },
    {
      raw: dashStats.totalMinutes,
      display: formatMinutes(dashStats.totalMinutes, t),
      label: t('dashboard.stats.listening'),
    },
  ]

  // P0.6 — 🔴 Bu satır iki turda düzeltildi, hikâyesi ders niteliğinde:
  //
  //  1) P0'da kilit yalnız ROTALARA uygulanmıştı → dashboard içindeki StatBar,
  //     "Tüm Zamanlar", top listeler ZIP verisini sızdırıyordu (Sahip, 29 Tem).
  //  2) Düzeltirken `canSeeHistory && ...` yazdım → bu sefer FAZLA GENİŞ kesti:
  //     ZIP kapanırken canlı API verisi de kapandı, Faz 2 boş ekran oldu
  //     (Sahip, 30 Tem: "Spotify API bağlı ama ona bağlı özellikler hiç yok").
  //
  // Doğrusu: veri gösterilir mi sorusu "hangi KAYNAK okunabilir"e bağlı.
  // `source` süzgeci Faz 2'de yalnız `api_realtime` okur; `uniqueTracks` de o
  // pencereden sayıldığı için tek koşul yeterli — faz ayrımı süzgecin içinde.
  //
  //  3) 2026-07-31 (paket #4): `uniqueTracks > 0` bir kez daha yetmez oldu.
  //     Paket (`user_stats_pkg`) henüz üretilmemişse sayılar SIFIR değil
  //     BİLİNMİYOR — sıfırı "veri yok" sanıp Hızlı Başlangıç'ı açsaydık,
  //     ZIP'i olan kullanıcıya "Spotify geçmişini yükle" derdik. Aynı sınıf
  //     hata, üçüncü kez. `packageMissing` bu yüzden AYRI durum.
  const statsPreparing = dashStats.packageMissing === true
  const hasData =
    caps.historyWindow !== 'none' && !statsPreparing && dashStats.uniqueTracks > 0

  // Faz 2'de gösterilen sayılar KISA pencereden geliyor; kullanıcı bunu tüm
  // geçmişi sanmasın diye StatBar'a bir bağlam etiketi geçilir.
  const statsWindowLabel =
    caps.historyWindow === 'api' && recentPlays.length > 0
      ? t('dashboard.stats.windowLabel')
      : null

  return (
    <div className={styles.page}>
      {/* ═══ KAT 1 — BANNER: sayfanın kapağı, tam genişlik ═══
          FAZ ART-DIRECTION (2026-08-13): eskiden selamlama + KPI, sol
          kolonun tepesinde zeminde yüzen iki ayrı parçaydı ve sayfanın
          bir "kapağı" yoktu. Artık ikisi tek yükseltilmiş yüzeyde
          (`.cover`) birleşti ve tam genişliğe yayıldı — üç kolonun "üç
          ayrı dünya" hissini kıran asıl hamle bu. */}
      <div className={styles.zoneBanner}>
        <div className={styles.cover}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>{t('dashboard.overview')}</span>
            <h1 className={styles.welcomeTitle}>
              {timeGreeting(t)}, <em>{name}</em>
            </h1>
            <FreshnessBar lastSyncLabel={lastSyncLabel} />
          </header>

          {/* ── Stat bar — Faz 2'de API penceresinden, Faz 3+'ta tüm geçmişten ── */}
          {hasData && <StatBar stats={stats} windowLabel={statsWindowLabel} />}

          {/* Paket henüz üretilmedi (ZIP yeni işlendi / faz yeni geçti). Sayılar
              sıfır DEĞİL, bilinmiyor — canlı hesaba düşmek yerine durumu söyleriz
              (§12.4-A). Gece cron'u üretecek. */}
          {statsPreparing && (
            <p className={styles.statsPreparing} role="status">
              {t('dashboard.stats.preparing')}
            </p>
          )}
        </div>

        {/* P0.3: ZIP işleniyor / bir dosya eksik → durum şeridi */}
        <PhaseBanner state={phaseState} />

        {/* ── Yeni Quick Start Bölümü (Apple-Design, 3 adımlı, çözülme animasyonlu) ── */}
        <QuickStartSection durum={quickStartState} />
      </div>

      {/* ═══ /KAT 1 — KAT 2 başlar: MAIN (sayfanın eti) ═══
          Grafikler ve "Dinlemelerim" burada: ikisi de geniş yüzey isteyen,
          keşif amaçlı ağır içerik. Eski düzende grafikler dar sol kolonda
          sıkışıyordu — artık ana kolonun tam genişliğini kullanıyorlar. */}
      <div className={styles.zoneMain}>

      {/* ── Dinleme Dağılımı + Platform Dağılımı ── */}
      {caps.canSeeHistory && dashStats.uniqueTracks > 0 && (
        <Suspense
          fallback={
            <div className={styles.insightRow}>
              <section className={styles.insightCard} aria-label={t('dashboard.insights.loadingListeningMix')}>
                <p className={styles.insightCardEyebrow}>{t('dashboard.insights.listeningMix')}</p>
                <Skeleton height="8rem" width="100%" radius="8px" style={{ marginTop: '1rem' }} />
              </section>
              <section className={styles.insightCard} aria-label={t('dashboard.insights.loadingPlatformMix')}>
                <p className={styles.insightCardEyebrow}>{t('dashboard.insights.platformMix')}</p>
                <Skeleton height="8rem" width="100%" radius="8px" style={{ marginTop: '1rem' }} />
              </section>
            </div>
          }
        >
          <InsightsRow userId={user.id} />
        </Suspense>
      )}

      {/* ── Your Listenings — period-selectable ──
          🔴 Faz kilidi iki turda oturdu:
          • 29 Tem: bölüm tamamen kapatıldı (ZIP sızıntısı vardı).
          • 30 Tem: FAZLA kapatılmış olduğu görüldü — Faz 2'de canlı API verisiyle
            hafta/ay anlamlı (friend: 162 şarkı/hafta, 404/ay). Bölüm açık, ama
            dönem seçici `allowedPeriods` ile sınırlı: Tüm Zamanlar + Yıllık
            gerçekten ZIP ister, o ikisi Faz 3'te açılıyor. */}
      {hasData && (
        <section className={styles.listeningsSection}>
          <ListeningsContent
            defaultPeriod={period}
            allowedPeriods={allowedPeriods}
            initialDataByPeriod={initialDataByPeriod}
          />
        </section>
      )}
      </div>
      {/* ═══ /MAIN — KAT 2 devam: RAIL (yardımcı sütun) ═══
          "Recently played" buraya taşındı — canlı, hızlı bakılan, dar
          yüzeye uyan bir akış. Eskiden ana kolonun tepesindeydi ve
          "Dinlemelerim" ile aynı hiyerarşiyi paylaşıyordu; oysa biri
          anlık nabız, diğeri derin analiz. Artık ayrı katlardalar. */}
      <div className={styles.zoneRail}>

      {/* ── Recently Played — Son 5 şarkı (geçmiş verisi → faz kilidi) ──
          Dynamic Album Art Accent için ayrı client component'te
          (bkz. recent-played-section.tsx) — `useCoverPalette` client-only
          hook, server component içine gömülemez. */}
      {hasData && recentPlays.length > 0 && (
        <RecentPlayedSection plays={recentPlays} />
      )}

      {/* ── Your Recaps — hızlı erişim ──
          🔴 Faz kilidi: recap'ler Streaming History ZIP'ine dayanır (Sahip
          2026-07-29 ikinci denetimi: "recapler hâlâ görülüyor"). Faz 3 altında
          kullanıcının recap kaydı DB'de dursa bile gösterilmez — kilitli
          /recap/[period] sayfasına götüren bağlantı sunmayız. */}
      {phaseState.capabilities.canSeeRecap && (
      <section className={styles.recapsSection}>
        <h2 className={styles.sectionLabel}>{t('dashboard.recaps.title')}</h2>
        <div className={styles.recapCardGrid} style={{ marginTop: 'var(--space-4)' }}>
          {lastMonthlyRecap ? (
            <Link
              href={`/recap/${lastMonthlyRecap.period_label}`}
              prefetch={false}
              className={styles.recapQuickCard}
              onMouseMove={handleCardGlow}
            >
              {monthlyCoverSrc && (
                <div className={styles.cardArtworkBackdrop} aria-hidden="true">
                  <Image
                    src={monthlyCoverSrc}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.cardArtworkImage}
                    priority={false}
                  />
                  <div className={styles.cardArtworkOverlay} />
                </div>
              )}
              <span className={styles.recapQuickEyebrow}>{t('dashboard.recaps.latestMonthly')}</span>
              {/* Yalnız GÖSTERİM çevrilir — href ham `period_label`'ı kullanır (URL anahtarı). */}
              <span className={styles.recapQuickTitle}>{donemEtiketiTr(lastMonthlyRecap.period_label)}</span>
              <span className={styles.recapQuickSub}>{t('dashboard.recaps.openRecap')}</span>
              <ArrowRight size={14} className={styles.recapQuickArrow} />
            </Link>
          ) : (
            <div className={styles.recapQuickCard} aria-disabled="true">
              <span className={styles.recapQuickEyebrow}>{t('dashboard.recaps.latestMonthly')}</span>
              <span className={styles.recapQuickTitle}>{t('dashboard.recaps.preparing')}</span>
              <span className={styles.recapQuickSub}>{t('dashboard.recaps.preparingMonthlyBody')}</span>
            </div>
          )}
          {lastYearlyRecap ? (
            <Link
              href={`/recap/${lastYearlyRecap.period_label}`}
              prefetch={false}
              className={styles.recapQuickCard}
              onMouseMove={handleCardGlow}
            >
              {yearlyCoverSrc && (
                <div className={styles.cardArtworkBackdrop} aria-hidden="true">
                  <Image
                    src={yearlyCoverSrc}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className={styles.cardArtworkImage}
                    priority={false}
                  />
                  <div className={styles.cardArtworkOverlay} />
                </div>
              )}
              <span className={styles.recapQuickEyebrow}>{t('dashboard.recaps.latestYearly')}</span>
              <span className={styles.recapQuickTitle}>{donemEtiketiTr(lastYearlyRecap.period_label)}</span>
              <span className={styles.recapQuickSub}>{t('dashboard.recaps.openRecap')}</span>
              <ArrowRight size={14} className={styles.recapQuickArrow} />
            </Link>
          ) : (
            <div className={styles.recapQuickCard} aria-disabled="true">
              <span className={styles.recapQuickEyebrow}>{t('dashboard.recaps.latestYearly')}</span>
              <span className={styles.recapQuickTitle}>{t('dashboard.recaps.preparing')}</span>
              <span className={styles.recapQuickSub}>{t('dashboard.recaps.preparingYearlyBody')}</span>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ── CTA kartı — Taste (2026-07-17: Profil kartı kaldırıldı, navbar'da
          zaten var; Playlistlerim CTA'sı 2026-08-07'de kaldırıldı — navbar'da
          kendi sekmesi var). Widget kolonunda dikey son öğe. ── */}
      <div className={styles.ctaGrid}>
        {/* Taste kartı kilitli sayfaya götürmemeli — faz kilidine tabi. */}
        {phaseState.capabilities.canSeeTaste && (
          <Link
            href="/taste"
            prefetch={false}
            className={`${styles.ctaCard} ${styles.ctaCardAccent}`}
            onMouseMove={handleCardGlow}
          >
            {tasteCoverSrc && (
              <div className={styles.cardArtworkBackdrop} aria-hidden="true">
                <Image
                  src={tasteCoverSrc}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className={styles.cardArtworkImage}
                  priority={false}
                />
                <div className={`${styles.cardArtworkOverlay} ${styles.cardArtworkOverlayTaste}`} />
              </div>
            )}
            <div className={styles.ctaCardContent}>
              <span className={styles.ctaEyebrow}>{t('dashboard.cta.tasteEyebrow')}</span>
              <span className={styles.ctaHero}>TASTE</span>
              <span className={styles.ctaBody}>{t('dashboard.cta.tasteBody')}</span>
            </div>
            <span className={styles.ctaCTA}>
              {t('dashboard.cta.discover')}
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
        )}
      </div>
      </div>
    </div>
  )
}
