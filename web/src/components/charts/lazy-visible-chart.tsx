'use client'

/**
 * FAZ PERF-P2 (2026-07-24): recharts chunk'ı (306KB, dashboard'da %49 boşta)
 * SADECE grafik viewport'a girince yüklensin.
 *
 * Ölçülen sorun (Bulgu #3, part3): grafikler zaten `next/dynamic`+Suspense ile
 * lazy'di AMA dashboard render olunca Suspense hemen çözülüp 306KB recharts
 * chunk'ı iniyor + execute ediliyordu (bootup 2.6s). Grafikler fold'un altında
 * (insightRow) — kullanıcı oraya gelene kadar recharts'a ihtiyaç yok.
 *
 * Bu wrapper: `IntersectionObserver` ile grafik viewport'a ~200px yaklaşınca
 * `dynamic` import'u tetikler. O ana kadar placeholder gösterir (aynı yükseklik
 * → CLS=0 korunur). Veri server'da hazır, prop olarak gelir — geciken yalnız
 * recharts JS'inin inişi.
 */
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const HourlyBarChart = dynamic(
  () => import('./bar-chart').then((m) => ({ default: m.HourlyBarChart })),
)
const DonutChart = dynamic(
  () => import('./donut-chart').then((m) => ({ default: m.DonutChart })),
)

/** Grafik viewport'a girene kadar bekleyen ortak görünürlük geçidi. */
function useInView(rootMargin = '200px 0px') {
  const ref = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setInView(true)
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return { ref, inView }
}

/** Placeholder — chart yüklenene kadar aynı alanı kaplar (CLS koruması). */
function ChartPlaceholder({ height, children }: { height: number; children?: ReactNode }) {
  return (
    <div style={{ width: '100%', minHeight: height }} aria-hidden>
      {children}
    </div>
  )
}

interface LazyBarChartProps {
  data: Array<{ hour: number; play_count: number }>
  accentColor?: string
}

export function LazyHourlyBarChart({ data, accentColor }: LazyBarChartProps) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref}>
      {inView ? (
        <HourlyBarChart data={data} accentColor={accentColor} />
      ) : (
        <ChartPlaceholder height={130} />
      )}
    </div>
  )
}

interface LazyDonutChartProps {
  data: Array<{ source: string; play_count: number; percentage: number }>
}

export function LazyDonutChart({ data }: LazyDonutChartProps) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} style={{ display: 'flex', flex: 1 }}>
      {inView ? <DonutChart data={data} /> : <ChartPlaceholder height={140} />}
    </div>
  )
}
