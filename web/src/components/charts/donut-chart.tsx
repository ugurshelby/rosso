'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useState } from 'react'
import { useT } from '@/lib/i18n/provider'

interface PlatformItem {
  source: string
  play_count: number
  percentage: number
}

interface DonutChartProps {
  data: PlatformItem[]
}

// 2026-07-28 (plan 07): Rosso saf Spotify.
export const PLATFORM_COLORS: Record<string, string> = {
  spotify: '#1DB954',
  spotifyexport: '#1DB954',
}

// "Other" bir marka adı değil — displayName'i çağıran taraf `getPlatformDisplayName`'i
// yalnız `source` gruplama anahtarı olarak kullanır; GÖRÜNÜR metin bileşende t() ile
// çözülür (bkz. `PlatformBadge`, `MultiPlatformView`).
export const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  spotify: 'Spotify',
  spotifyexport: 'Spotify',
  notrealtime: 'Other',
  apiinactive: 'Other',
}

export function normKey(source: string): string {
  return source.toLowerCase().replace(/[\s\-_]/g, '')
}

export function getPlatformColor(source: string): string {
  // Bilinmeyen kaynak: nötr gri değil, palet tokeni (2026-08-01 denetimi).
  // Platform MARKA renkleri (Spotify yeşili vb.) tabloda kalır — onlar
  // dokunulmaz; yalnız fallback tek renkli dile bağlanır.
  return PLATFORM_COLORS[normKey(source)] ?? 'var(--faint)'
}

export function getPlatformDisplayName(source: string): string {
  return PLATFORM_DISPLAY_NAMES[normKey(source)] ?? source
}

// Platform ikonu — renk dot yerine brand rengiyle küçük pill
function PlatformBadge({ source }: { source: string }) {
  const { t } = useT()
  const color = getPlatformColor(source)
  const rawName = getPlatformDisplayName(source)
  const name = rawName === 'Other' ? t('dashboard.charts.otherPlatform') : rawName
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 999,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 11,
        fontWeight: 600,
        color,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${color}90`,
        }}
      />
      {name}
    </span>
  )
}

interface TooltipPayloadEntry {
  payload: PlatformItem
}
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const { t } = useT()
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]?.payload
  if (!item) return null
  const rawName = getPlatformDisplayName(item.source)
  const displayName = rawName === 'Other' ? t('dashboard.charts.otherPlatform') : rawName
  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 10px',
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-primary)',
        letterSpacing: '0.04em',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      }}
    >
      <div style={{ fontWeight: 600 }}>{displayName}</div>
      <div style={{ color: 'var(--color-text-tertiary)', marginTop: 2 }}>
        {item.percentage}% · {t('dashboard.charts.plays', { count: item.play_count.toLocaleString('en-US') })}
      </div>
    </div>
  )
}

// Tek platform: dinleme sayısı hero
function SinglePlatformView({ item }: { item: PlatformItem }) {
  const { t } = useT()
  const color = getPlatformColor(item.source)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
        gap: 20,
      }}
    >
      {/* Platform badge */}
      <PlatformBadge source={item.source} />

      {/* Hero — büyük dinleme sayısı */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono, monospace)',
            fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {item.play_count.toLocaleString('en-US')}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono, monospace)',
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            letterSpacing: '0.1em',
          }}
        >
          {t('dashboard.charts.totalPlays')}
        </span>
      </div>

      {/* Alt bilgi — ince ayırıcı + ek istat */}
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-geist-mono, monospace)',
          fontSize: 10,
          color: 'var(--color-text-tertiary)',
          letterSpacing: '0.08em',
        }}>
          {t('dashboard.charts.singleSource')}
        </span>
        <span style={{
          fontFamily: 'var(--font-geist-mono, monospace)',
          fontSize: 11,
          fontWeight: 700,
          color,
          letterSpacing: '0.04em',
        }}>
          %{item.percentage}
        </span>
      </div>
    </div>
  )
}

// Çok platform: donut + legend
function MultiPlatformView({ data }: { data: PlatformItem[] }) {
  const { t } = useT()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const total = data.reduce((s, d) => s + d.play_count, 0)
  const activeEntry = activeIndex !== null ? data[activeIndex] : null
  const centerValue = activeEntry ? `${activeEntry.percentage}%` : total.toLocaleString('en-US')
  const activeRawLabel = activeEntry ? getPlatformDisplayName(activeEntry.source) : null
  const centerLabel = activeRawLabel
    ? (activeRawLabel === 'Other' ? t('dashboard.charts.otherPlatform') : activeRawLabel)
    : t('dashboard.charts.listening')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      {/* Donut */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              dataKey="play_count"
              nameKey="source"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="76%"
              strokeWidth={0}
              isAnimationActive={true}
              animationBegin={200}
              animationDuration={600}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: 'pointer', outline: 'none' }}
              label={false}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.source}
                  fill={getPlatformColor(entry.source)}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
              fill="var(--color-text-primary)" fontSize={13} fontWeight={700}
              fontFamily="var(--font-geist-mono, monospace)">
              {centerValue}
            </text>
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle"
              fill="var(--color-text-tertiary)" fontSize={8}
              fontFamily="var(--font-geist-mono, monospace)" letterSpacing="0.08em">
              {centerLabel.toUpperCase().slice(0, 12)}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — pill badge'ler + gerçek dinleme sayısı (yalnız yüzde "ne kadar"
          sorusuna cevap vermiyor, sayı da lazım — Sahibin gözlemi 2026-07-17) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((item) => (
          <div key={item.source}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <PlatformBadge source={item.source} />
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontFamily: 'var(--font-geist-mono, monospace)',
                fontSize: 10,
                color: 'var(--color-text-tertiary)',
                letterSpacing: '0.02em',
              }}>
                {item.play_count.toLocaleString('en-US')}
              </span>
              <span style={{
                fontFamily: 'var(--font-geist-mono, monospace)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                letterSpacing: '0.02em',
                minWidth: 34,
                textAlign: 'right',
              }}>
                {item.percentage}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DonutChart({ data }: DonutChartProps) {
  const { t } = useT()
  if (data.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-tertiary)',
        letterSpacing: '0.06em',
      }}>
        {t('dashboard.charts.waitingForData')}
      </div>
    )
  }

  if (data.length === 1) {
    return <SinglePlatformView item={data[0]!} />
  }

  return <MultiPlatformView data={data} />
}
