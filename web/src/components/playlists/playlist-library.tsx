'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PlaylistCard, type PlaylistCardData } from './playlist-card'
import { PlaylistListRow } from './playlist-list-row'
import {
  PlaylistLibraryToolbar,
  readStoredViewMode,
  readStoredFolderMode,
  type PlaylistSortOption,
  type PlaylistViewMode,
  type PlaylistFolderMode,
} from './playlist-library-toolbar'
import { PlaylistYearFolders } from './playlist-year-folders'
import { DisconnectedPlatformNotice } from './disconnected-platform-notice'
import { hasFoldablePlaylists } from './group-by-year'
import {
  RevealTail,
  revealItemProps,
  useProgressiveReveal,
} from '@/components/ui/progressive-reveal'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/lib/i18n/provider'
import type { Platform } from '@rosso/shared-types'
import styles from './playlists.module.css'

interface PlaylistLibraryProps {
  playlists: PlaylistCardData[]
  connectedPlatforms: Platform[]
}

function sortPlaylists(items: PlaylistCardData[], sort: PlaylistSortOption): PlaylistCardData[] {
  const copy = [...items]
  switch (sort) {
    case 'name_asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
    case 'track_count_desc':
      return copy.sort((a, b) => (b.track_count ?? 0) - (a.track_count ?? 0))
    case 'synced_desc':
    default:
      return copy.sort((a, b) => {
        const aTime = a.synced_at ? new Date(a.synced_at).getTime() : 0
        const bTime = b.synced_at ? new Date(b.synced_at).getTime() : 0
        if (bTime !== aTime) return bTime - aTime
        return a.name.localeCompare(b.name, 'tr')
      })
  }
}

export function PlaylistLibrary({
  playlists,
  connectedPlatforms,
}: PlaylistLibraryProps) {
  const { t } = useT()
  const connectedSet = useMemo(() => new Set(connectedPlatforms), [connectedPlatforms])

  // Bağlantısı kopmuş platformlar — yalnız KÜTÜPHANEDE playlist'i olanlar.
  // Kullanıcının hiç kullanmadığı bir platform için "bağlantın kopmuş" demek
  // yanlış olurdu; uyarı ancak gerçekten etkilenen içerik varsa anlamlı.
  const disconnected = useMemo(() => {
    const seen = new Set<Platform>()
    for (const p of playlists) {
      const platform = p.platform as Platform
      if (!connectedSet.has(platform)) seen.add(platform)
    }
    return [...seen]
  }, [playlists, connectedSet])

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<PlaylistSortOption>('synced_desc')
  const [viewMode, setViewMode] = useState<PlaylistViewMode>('grid')
  const [folderMode, setFolderMode] = useState<PlaylistFolderMode>('folder')
  const [toolbarResetKey, setToolbarResetKey] = useState(0)

  // Toggle yalnız ay+yıl playlist'i varsa gösterilir (Sahip: klasörlenecek bir
  // şey yoksa seçenek anlamsız). Ham `playlists`'ten hesaplanır — arama filtresi
  // toggle'ın varlığını değiştirmemeli.
  const canFolder = useMemo(() => hasFoldablePlaylists(playlists), [playlists])

  useEffect(() => {
    setViewMode(readStoredViewMode()) // eslint-disable-line react-hooks/set-state-in-effect
    setFolderMode(readStoredFolderMode())
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const filtered = useMemo(() => {
    let items = playlists
    if (search) {
      const q = search.toLocaleLowerCase('tr')
      items = items.filter((p) => p.name.toLocaleLowerCase('tr').includes(q))
    }
    return sortPlaylists(items, sort)
  }, [playlists, search, sort])

  // Katman katman yükleme (2026-09-25): ilk 24 kart, kaydırdıkça 24'er tane.
  // Eski `useIncrementalReveal` yalnız IntersectionObserver'a güveniyordu ve
  // canlıda listeyi 24'te bırakıyordu (toolbar 125 diyor, kaydırınca yüklenmiyor)
  // → çift tetikleyicili ortak altyapıya taşındı (ui/progressive-reveal).
  const { count, hasMore, sentinelRef, initial, step } = useProgressiveReveal({
    total: filtered.length,
    resetKey: `${viewMode}|${sort}|${search}`,
  })
  const visible = useMemo(() => filtered.slice(0, count), [filtered, count])

  // Klasörlü görünüm yalnız: tercih 'folder' + klasörlenebilir playlist var +
  // arama yok. Arama filtrelemeyi devralır → düz görünüme düşer.
  const useFolderView = folderMode === 'folder' && canFolder && !search

  return (
    <>
      {disconnected.length > 0 && <DisconnectedPlatformNotice platforms={disconnected} />}

      <PlaylistLibraryToolbar
        key={toolbarResetKey}
        onSearchChange={handleSearchChange}
        sort={sort}
        onSortChange={setSort}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        folderMode={folderMode}
        onFolderModeChange={setFolderMode}
        canFolder={canFolder}
        resultCount={filtered.length}
        totalCount={playlists.length}
      />

      {filtered.length === 0 ? (
        <div className={styles.filterEmpty} role="status">
          <p className={styles.filterEmptyText}>{t('playlists.library.noMatches')}</p>
          <button
            type="button"
            className={styles.filterEmptyReset}
            onClick={() => {
              setSearch('')
              setToolbarResetKey((k) => k + 1)
            }}
          >
            {t('playlists.library.clearSearch')}
          </button>
        </div>
      ) : useFolderView ? (
        /* Klasörlü görünüm — ay+yıl playlist'leri yıl klasörlerinde. Arama VEYA
           seçim modunda düz görünüme düşer (aşağıdaki dallar): arama zaten
           filtreliyor, seçim modunda gruplama etkileşimi karmaşıklaştırır. */
        <PlaylistYearFolders playlists={filtered} viewMode={viewMode} />
      ) : viewMode === 'grid' ? (
        <>
          <div className={styles.grid} aria-label={t('playlists.library.gridAriaLabel')}>
            {visible.map((p, i) => {
              const anim = revealItemProps(i, initial, step)
              return (
                <div key={p.id} className={anim.className} style={anim.style}>
                  <PlaylistCard playlist={p} compact />
                </div>
              )
            })}
          </div>
          <RevealTail hasMore={hasMore} sentinelRef={sentinelRef} className={styles.grid}>
            {Array.from({ length: 6 }, (_, i) => (
              <PlaylistCardSkeleton key={i} />
            ))}
          </RevealTail>
        </>
      ) : (
        <>
          <div className={styles.listView} aria-label={t('playlists.library.listAriaLabel')} role="list">
            {visible.map((p, i) => {
              const anim = revealItemProps(i, initial, step)
              return (
                <div key={p.id} role="listitem" className={anim.className} style={anim.style}>
                  <PlaylistListRow playlist={p} />
                </div>
              )
            })}
          </div>
          <RevealTail hasMore={hasMore} sentinelRef={sentinelRef} className={styles.listView}>
            {Array.from({ length: 4 }, (_, i) => (
              <PlaylistRowSkeleton key={i} />
            ))}
          </RevealTail>
        </>
      )}

    </>
  )
}

/** Kart iskeleti — gerçek kartla aynı iskelet: kare kapak + iki satır (yüzey "zıplamaz"). */
function PlaylistCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden>
      <Skeleton width="100%" style={{ aspectRatio: '1 / 1' }} radius="var(--radius-md)" />
      <Skeleton height="0.85rem" width="70%" radius="4px" />
      <Skeleton height="0.7rem" width="40%" radius="4px" />
    </div>
  )
}

function PlaylistRowSkeleton() {
  return (
    <div className={styles.listRowWrap} aria-hidden>
      <div className={styles.listRow}>
        <Skeleton width="48px" height="48px" radius="6px" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton height="0.85rem" width="55%" radius="4px" />
          <Skeleton height="0.65rem" width="30%" radius="4px" />
        </div>
      </div>
    </div>
  )
}
