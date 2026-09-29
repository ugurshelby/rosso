import { getPatternPackage } from '@/lib/analytics/engine'
import { LazyHourlyBarChart, LazyDonutChart } from '@/components/charts/lazy-visible-chart'
import { getT } from '@/lib/i18n/server'
import styles from './dashboard.module.css'

interface InsightsRowProps {
  userId: string
}

/**
 * B2.4 (2026-07-19, gece oturumu performans turu): dashboard'un en ağır 2 RPC'si
 * (recap_hourly_pattern, recap_platform_breakdown) ayrı bir async bileşene taşındı
 * — sayfa artık bunları beklemeden üstteki header/stat-bar/recap bölümlerini
 * gösterir, bu bölüm <Suspense> ile ayrıca akar (page.tsx).
 *
 * 2026-07-31 (Aşama 3 · paket #3): iki RPC yerine TEK paket okuması
 * (`user_pattern_pkg`, migration 0163). 126 + 61 ms → 0,016 ms (buffer 4617 → 2).
 * Bu, yukarıdaki <Suspense> bloğunu pratikte boşaltıyor.
 *
 * ⚠ Paket yoksa CANLI HESABA DÜŞMEZ — "hazırlanıyor" gösterir (§12.4-A
 * bağlayıcı kuralı). Eski yolu yedek bırakmak 187 ms'yi EN KÖTÜ ANDA
 * (ilk ziyaret) geri getirirdi.
 */
export async function InsightsRow({ userId }: InsightsRowProps) {
  const [pkg, { t, tp }] = await Promise.all([getPatternPackage(userId), getT()])

  // Paket yok → gece cron'u üretecek. Kartların iskeleti korunur ki sayfa
  // düzeni zıplamasın; içerik yerine durum metni gösterilir.
  if (!pkg) {
    return (
      <>
        <div className={styles.insightRow} data-single="true">
          <section className={styles.insightCard} aria-label={t('dashboard.insights.hourlyListening')}>
            <p className={styles.insightCardEyebrow}>{t('dashboard.insights.listeningMix')}</p>
            <div className={styles.insightEmpty}>{t('dashboard.insights.analyzing')}</div>
          </section>
        </div>
      </>
    )
  }

  const hourlyPattern = pkg.hourly
  const platformBreakdown = pkg.platforms

  const peakHour = hourlyPattern.length > 0
    ? hourlyPattern.reduce((best, h) => (h.play_count > best.play_count ? h : best), hourlyPattern[0])
    : null
  const peakLabel = peakHour
    ? `${String(peakHour.hour).padStart(2, '0')}:00 – ${String((peakHour.hour + 1) % 24).padStart(2, '0')}:00`
    : '—'

  // 2026-07-28 (Sahip): /gecmis + /mood mobilde ANA giriş noktası — alt menüde
  // yer yok (5 slot dolu). Eski kodda keşif kartı YALNIZ tek platformlu kullanıcıda
  // görünüyordu; çok platformlularda (kullanıcıların %91'i, Sahip dahil) donut
  // onun yerine geçip Geçmiş+Anlar'a mobil erişimi TAMAMEN kapatıyordu. Çözüm:
  // keşif kartını üstteki insightRow grid'inden ayır, HER kullanıcıda görünen
  // tam-genişlik bağımsız satır yap. Çok platformluda donut da korunur (satırda),
  // tek platformluda donut zaten anlamsız (tek dilim) — o yüzden keşif kartı
  // ikinci hücreyi doldurur, ayrıca alttaki satır tekrar etmesin diye gizlenir.
  const multiPlatform = platformBreakdown.length > 1

  return (
    <>
      <div className={styles.insightRow} data-single={multiPlatform ? undefined : 'true'}>
        <section className={styles.insightCard} aria-label={t('dashboard.insights.hourlyListening')}>
          <p className={styles.insightCardEyebrow}>{t('dashboard.insights.listeningMix')}</p>
          {hourlyPattern.length > 0 ? (
            <>
              <div className={styles.insightPeakRow}>
                <span className={styles.insightPeakLabel}>{t('dashboard.insights.peakHours')}</span>
                <span className={styles.insightPeakValue}>{peakLabel}</span>
                <span className={styles.insightPeakCount}>
                  {tp('dashboard.insights.plays', peakHour?.play_count ?? 0)}
                </span>
              </div>
              <div className={styles.insightChartWrap}>
                <LazyHourlyBarChart data={hourlyPattern} />
              </div>
            </>
          ) : (
            <div className={styles.insightEmpty}>{t('dashboard.insights.waitingForData')}</div>
          )}
        </section>

        {/* 2026-07-27 (Sahip): eski "Dinleme Kronotipin" kartı yandaki "Dinleme
            Dağılımı" bar chart'ıyla AYNI hourlyPattern + zirve saati gösteriyordu
            → çakışma, kaldırıldı. Çok platformluda yanına "Platform mix"
            donut'u gelir (gerçek dağılım). Tek platformluda donut anlamsız (tek
            dilim) → ikinci hücreyi keşif kartı doldurur. */}
        {/* Keşfet kartı KALDIRILDI (Sahip kararı, 2026-08-07): Dinleme
            Geçmişi artık navbar'da kendi sekmesi, Anlar ise Playlists
            hero'sundaki Mood kartında. İki ayrı giriş noktası gereksizdi.

            Platform Dağılımı da zaten kalkmıştı (tek platform = tek dilim,
            donut anlamsız). Bu hücre şimdilik boş kalıyor; ızgara tek
            kartla da dengeli duruyor. */}
        {multiPlatform ? (
          <section className={styles.insightCard} aria-label={t('dashboard.insights.platformMix')}>
            <p className={styles.insightCardEyebrow}>{t('dashboard.insights.platformMix')}</p>
            <div className={styles.insightDonutWrap}>
              <LazyDonutChart data={platformBreakdown} />
            </div>
          </section>
        ) : null}
      </div>
    </>
  )
}
