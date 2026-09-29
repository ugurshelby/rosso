'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/provider'

interface HourlyBarChartProps {
  data: Array<{ hour: number; play_count: number }>
  accentColor?: string
}

interface TooltipPayloadEntry {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: number
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const { t } = useT()
  if (!active || !payload || payload.length === 0) return null
  const count = payload[0]?.value ?? 0
  const hourStr = String(label ?? 0).padStart(2, '0') + ':00'
  return (
    <div
      style={{
        background: 'var(--material-bg-card, rgba(255,255,255,0.06))',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-primary)',
        letterSpacing: '0.04em',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ fontWeight: 600 }}>{hourStr}</div>
      <div style={{ color: 'var(--color-text-tertiary)', marginTop: 2 }}>{t('dashboard.charts.plays', { count })}</div>
    </div>
  )
}

interface PeakLabelProps {
  x?: number
  y?: number
  value?: number
  isPeak?: boolean
  accentColor?: string
}

function PeakLabel({ x = 0, y = 0, value, isPeak, accentColor = 'var(--color-accent)' }: PeakLabelProps) {
  const { t } = useT()
  if (!isPeak || !value) return null
  return (
    <text
      x={x}
      y={y - 5}
      textAnchor="middle"
      fill={accentColor}
      fontSize={9}
      fontFamily="var(--font-geist-mono, monospace)"
      letterSpacing="0.04em"
      aria-label={t('dashboard.charts.peak', { count: value })}
    >
      ★
    </text>
  )
}

export function HourlyBarChart({
  data,
  accentColor = 'var(--color-accent)',
}: HourlyBarChartProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches) // eslint-disable-line react-hooks/set-state-in-effect
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const maxCount = Math.max(...data.map((d) => d.play_count), 1)
  const xAxisTicks = [0, 6, 12, 18]
  const peakGradientId = 'barGradientPeak'
  /* FAZ DASHBOARD-REDESIGN (2026-08-13, "Dynamic Canvas") — düşük değerler
     düz griden ziyade soğuk mora düşer, zirveye yaklaştıkça yoğunluk artar;
     `--v1`–`--v5` rampası (dashboard-design.md §3.6 "tek renkli grafikler bu
     rampayı kullanır") 5 kademeli ara-yoğunluk için kullanılıyor, zirve barı
     hâlâ ayrı `peakGradientId`de kalıyor (tek bağıran vurgu, §3.1). */
  const intensityGradientId = 'barGradientIntensity'

  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={data} barCategoryGap="12%" margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
        <defs>
          {/* Peak bar: amber gradient */}
          <linearGradient id={peakGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={1} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0.55} />
          </linearGradient>
          {/* Ara-yoğunluk barları: zirveye yakınlaştıkça --v rampasında koyulaşır */}
          <linearGradient id={intensityGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.55} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0.12} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="hour"
          ticks={xAxisTicks}
          tickFormatter={(v: number) => String(v).padStart(2, '0') + ':00'}
          tick={{
            fontFamily: 'var(--font-geist-mono, monospace)',
            fontSize: 10,
            fill: 'var(--color-text-tertiary)',
            letterSpacing: '0.06em',
          }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' }}
        />
        <Bar
          dataKey="play_count"
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reducedMotion}
          animationDuration={800}
          animationEasing="ease-out"
        >
          <LabelList
            dataKey="play_count"
            content={(props) => {
              const { x, y, value, index } = props as {
                x?: number
                y?: number
                value?: number
                index?: number
              }
              const idx = index ?? 0
              const entry = data.length > 0 ? data[idx] : undefined
              const isPeak = entry != null && entry.play_count === maxCount && maxCount > 0
              return (
                <PeakLabel
                  key={`peak-${index ?? 0}`}
                  x={x}
                  y={y}
                  value={value as number}
                  isPeak={isPeak}
                  accentColor={accentColor}
                />
              )
            }}
          />
          {data.map((entry) => {
            const isPeak = entry.play_count === maxCount && maxCount > 0
            // Dynamic Canvas: 0 dinlemede en soluk, zirveye yaklaştıkça
            // --v rampası gibi kademeli koyulaşan opaklık (0.25 → 0.9).
            const ratio = maxCount > 0 ? entry.play_count / maxCount : 0
            const intensityOpacity = 0.25 + ratio * 0.65
            return (
              <Cell
                key={entry.hour}
                fill={isPeak ? `url(#${peakGradientId})` : `url(#${intensityGradientId})`}
                fillOpacity={isPeak ? 1 : intensityOpacity}
                style={
                  isPeak
                    ? {
                        filter:
                          'drop-shadow(0 0 8px color-mix(in srgb, var(--color-accent) 60%, transparent))',
                      }
                    : undefined
                }
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
