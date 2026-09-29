import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPhaseState } from '@/lib/phase/read'
import { gosterimKaynagi } from '@/lib/demo/read'
import { LockedShell } from '@/components/phase/locked-shell'
import { PageHeader } from '@/components/ui/page-header'
import {
  getLikedSongsPage,
  getDiscoveryBucket,
  getDiscoveryCounts,
} from '@/lib/library/liked-songs'
import { LikedSongsView, type LikedView } from '@/components/playlists/liked-songs-view'
import { getT } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Liked songs',
}

/**
 * "Beğenilen Şarkılar" sanal listesi (2026-08-04).
 * Faz 4 — `liked_songs_events` Account Data ZIP'inden gelir.
 * 2026-09-28: gosterimKaynagi ile kilitliyken demo persona verisi okunur.
 */

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{ liste?: string; sayfa?: string }>
}

function parseView(raw: string | undefined): LikedView {
  return raw === 'overlooked' || raw === 'nostalgia' ? raw : 'liked'
}

export default async function LikedSongsPage({ searchParams }: PageProps) {
  const user = await requireAuth()
  const [{ veriKullanicisi, demoMu, kilitAcik }, phase, params, { t }] = await Promise.all([
    gosterimKaynagi(user.id, 'begeniler'),
    getPhaseState(user.id),
    searchParams,
    getT(),
  ])

  const view = parseView(params.liste)
  // `?sayfa=` elle yazılabilir — negatif/NaN değerleri sıfıra çek.
  const page = Math.max(0, Number.parseInt(params.sayfa ?? '0', 10) || 0)
  const offset = page * PAGE_SIZE

  const [counts, data, likedHead] = await Promise.all([
    getDiscoveryCounts(veriKullanicisi),
    view === 'liked'
      ? getLikedSongsPage(veriKullanicisi, { limit: PAGE_SIZE, offset })
      : getDiscoveryBucket(veriKullanicisi, view, { limit: PAGE_SIZE, offset }),
    // Hero'daki toplam her görünümde "beğenilen" sayısını gösterir
    view === 'liked'
      ? Promise.resolve(null)
      : getLikedSongsPage(veriKullanicisi, { limit: 1, offset: 0 }),
  ])

  const likedTotal = view === 'liked' ? data.total : likedHead?.total ?? 0

  const content = (
    <LikedSongsView
      activeView={view}
      page={page}
      pageSize={PAGE_SIZE}
      items={data.items}
      total={data.total}
      counts={{ overlooked: counts.overlooked, nostalgia: counts.nostalgia }}
      likedTotal={likedTotal}
    />
  )

  if (!kilitAcik) {
    return (
      <>
        <PageHeader
          title={t('playlists.likedView.title')}
          subtitle={t('playlists.likedView.lockedSubtitle')}
        />
        <LockedShell
          featureKey="begeniler"
          isLocked={true}
          demo={demoMu}
          actionAdim="zip"
          missingZips={['account', 'technical']}
          title={t('playlists.likedView.title')}
          description={
            phase.partialPhase4
              ? 'Almost there — upload your second export file to unlock deep lifetime analytics.'
              : 'Upload Account Data and Technical Log ZIP files to unlock deep lifetime analytics.'
          }
        >
          {content}
        </LockedShell>
      </>
    )
  }

  return content
}
