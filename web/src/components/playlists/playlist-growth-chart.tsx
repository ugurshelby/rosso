import {
  hasGrowthStory,
  monthLabel,
  peakMonth,
  type GrowthPoint,
} from '@/lib/library/playlist-growth'
import { getT } from '@/lib/i18n/server'
import { formatNumber } from '@/lib/i18n'
import styles from './playlist-growth-chart.module.css'

/**
 * A8 — "Bu liste nasıl büyüdü" grafiği.
 * Otorite: docs/design/katmanlar/dashboard-design.md
 *
 * ── Neden recharts DEĞİL ───────────────────────────────────────────────────
 * Projede recharts var ama 306KB'lık bir chunk ve `lazy-visible-chart.tsx`
 * onu bilerek IntersectionObserver arkasına almış (PERF-P2, 2026-07-24).
 * Burada çizilen tek bir kümülatif çizgi: 69 nokta, etkileşim yok, tooltip yok.
 * Saf SVG sunucuda render olur ve bu grafik için SIFIR JS iner — var olan bir
 * kütüphaneyi kullanmamak burada tutarsızlık değil, o kütüphanenin neden
 * geciktirildiğiyle aynı gerekçe.
 *
 * ── Tasarım kararları ──────────────────────────────────────────────────────
 * §3.6: tek renkli grafik `--v1`–`--v5` rampasını kullanır, accent değil.
 * §3.1: accent yalnız durum/aksiyon işaretler — bir çizgi ikisi de değildir.
 * §3.5: sayılar mono + tabular (`.num-data`).
 *
 * Ölçekleme kümülatif seriye göre: eksen 0'dan başlar, çünkü "sıfırdan bugüne"
 * bu grafiğin bütün anlatısı. Kırpılmış eksen büyümeyi olduğundan dik gösterir.
 */

interface Props {
  series: GrowthPoint[]
  /** Kart başlığı — playlist detayında liste adı, genel görünümde kütüphane. */
  title?: string
}

/** viewBox birimleri — CSS ile ölçeklenir, piksel değil. */
const W = 640
const H = 160
const PAD_T = 12
const PAD_B = 22

export async function PlaylistGrowthChart({ series, title }: Props) {
  // "Veri yoksa özellik yok": eşiğin altında hiç render etme.
  if (!hasGrowthStory(series)) return null

  const { t, locale } = await getT()
  const resolvedTitle = title ?? t('playlists.growthChart.defaultTitle')
  const peak = peakMonth(series)
  const maxCum = Math.max(...series.map((p) => p.cumulative), 1)
  const lastPoint = series[series.length - 1]
  const firstPoint = series[0]

  const plotH = H - PAD_T - PAD_B
  const x = (i: number) =>
    series.length === 1 ? W / 2 : (i / (series.length - 1)) * W
  const y = (v: number) => PAD_T + plotH - (v / maxCum) * plotH

  const linePoints = series.map((p, i) => `${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`)
  // Alan dolgusu: çizginin altını kapatmak için tabana iniyoruz.
  const areaPath = `M0,${(PAD_T + plotH).toFixed(1)} L${linePoints.join(' L')} L${W},${(PAD_T + plotH).toFixed(1)} Z`

  const peakIndex = peak ? series.findIndex((p) => p.month === peak.month) : -1
  const showPeakDot = peak != null && peakIndex >= 0 && series.length >= 4

  const summary = t('playlists.growthChart.summary', {
    from: monthLabel(firstPoint.month),
    to: monthLabel(lastPoint.month),
    count: formatNumber(lastPoint.cumulative, locale),
  })

  return (
    <section className={styles.card} aria-labelledby="growth-title">
      <header className={styles.head}>
        <h2 id="growth-title" className={styles.title}>
          {resolvedTitle}
        </h2>
        <p className={styles.range}>
          {monthLabel(firstPoint.month)} — {monthLabel(lastPoint.month)}
        </p>
      </header>

      {/* Grafik dekoratif değil ama içeriği metinle de veriliyor: ekran
          okuyucu SVG'yi atlar, aşağıdaki özet + tepe satırı bilgiyi taşır. */}
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
      >
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--v2)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--v2)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#growthFill)" />
        <polyline
          points={linePoints.join(' ')}
          fill="none"
          stroke="var(--v3)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Tek vurgu noktası: en hareketli ay (§3.1 — tek bağıran vurgu). */}
        {showPeakDot && peak && (
          <circle
            cx={x(peakIndex)}
            cy={y(peak.cumulative)}
            r="3.5"
            fill="var(--v5)"
            stroke="var(--surface)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <footer className={styles.foot}>
        <p className={styles.summary}>{summary}</p>
        {peak && peak.added > 0 && (
          <p className={styles.peak}>
            {t('playlists.growthChart.peakLine', {
              month: monthLabel(peak.month),
              count: formatNumber(peak.added, locale),
            })}
          </p>
        )}
      </footer>
    </section>
  )
}
