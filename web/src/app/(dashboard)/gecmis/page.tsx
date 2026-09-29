import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { gosterimKaynagi } from '@/lib/demo/read'
import { LockedShell } from '@/components/phase/locked-shell'
import type { Period } from '@/lib/analytics/engine'
import {
  getHistoryTopTracks,
  getHistoryTopArtists,
  getHistoryTopAlbums,
  resolveRange,
  type HistorySort,
  type HistoryRange,
} from '@/lib/analytics/history'
import { HistoryClient, type HistoryTab } from '@/components/history/history-client'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return { title: t('history.meta.title') }
}

// Period preset'leri sayfada: aylık / yıllık / tüm zamanlar (Sahip tarifi).
// 'week' engine'de var ama bu sayfada sunulmuyor.
const VALID_PERIODS: Period[] = ['month', 'year', 'alltime']
const VALID_TABS: HistoryTab[] = ['tracks', 'artists', 'albums']
const VALID_SORTS: HistorySort[] = ['time', 'count']

interface PageProps {
  searchParams: Promise<{
    tab?: string
    period?: string
    sort?: string
    from?: string
    to?: string
  }>
}

function parseCustomRange(from?: string, to?: string): HistoryRange | null {
  if (!from || !to) return null
  const f = new Date(from)
  const t = new Date(to)
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return null
  // Bitiş gününü dahil et (gün sonuna kadar).
  t.setUTCHours(23, 59, 59, 999)
  return { from: f, to: t }
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const user = await requireAuth()
  const [{ veriKullanicisi, demoMu, kilitAcik }, params, { t }] = await Promise.all([
    gosterimKaynagi(user.id, 'gecmis'),
    searchParams,
    getT(),
  ])

  const tab: HistoryTab = VALID_TABS.includes(params.tab as HistoryTab)
    ? (params.tab as HistoryTab)
    : 'tracks'
  const period: Period = VALID_PERIODS.includes(params.period as Period)
    ? (params.period as Period)
    : 'month'
  const sort: HistorySort = VALID_SORTS.includes(params.sort as HistorySort)
    ? (params.sort as HistorySort)
    : 'time'

  const custom = parseCustomRange(params.from, params.to)
  const range = resolveRange(period, custom)

  // Yalnız aktif sekmenin verisini çek — üç sekmeyi birden çekmek gereksiz
  // sorgu. Sekme değişince URL değişir, sunucu yeni sekmeyi getirir.
  // Kilitliyken demo persona verisi okunur.
  const [tracks, artists, albums] = await Promise.all([
    tab === 'tracks' ? getHistoryTopTracks(veriKullanicisi, range, sort) : Promise.resolve([]),
    tab === 'artists' ? getHistoryTopArtists(veriKullanicisi, range, sort) : Promise.resolve([]),
    tab === 'albums' ? getHistoryTopAlbums(veriKullanicisi, range, sort) : Promise.resolve([]),
  ])

  const content = (
    <HistoryClient
      tab={tab}
      period={period}
      sort={sort}
      custom={custom ? { from: params.from ?? '', to: params.to ?? '' } : null}
      tracks={tracks}
      artists={artists}
      albums={albums}
    />
  )

  if (!kilitAcik) {
    return (
      <LockedShell
        featureKey="gecmis"
        isLocked={true}
        demo={demoMu}
        actionAdim="zip"
        missingZips={['streaming']}
        title={t('history.meta.title')}
      >
        {content}
      </LockedShell>
    )
  }

  return content
}
