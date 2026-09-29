'use client'

import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { PlaylistCard, type PlaylistCardData } from './playlist-card'
import { PlaylistListRow } from './playlist-list-row'
import { groupByYear } from './group-by-year'
import type { PlaylistViewMode } from './playlist-library-toolbar'
import { useT } from '@/lib/i18n/provider'
import styles from './playlists.module.css'

interface PlaylistYearFoldersProps {
  playlists: PlaylistCardData[]
  viewMode: PlaylistViewMode
}

/**
 * FAZ PLAYLIST-KLASÖR: ay+yıl playlist'lerini açılır-kapanır yıl klasörlerinde
 * gösterir.
 *
 * Sıra (2026-08-02): önce klasörsüz playlist'ler (kullanıcının kendi kurduğu
 * listeler), sonra yıl klasörleri. Otomatik arşiv, günlük kullanımın üstüne
 * çıkmaz.
 *
 * Sahip (2026-07-26): "açılır-kapanır başlık" + varsayılan açık. Tüm yıllar
 * ilk açılışta genişletilmiş gelir; kullanıcı tıklayarak katlar.
 */
export function PlaylistYearFolders({
  playlists,
  viewMode,
}: PlaylistYearFoldersProps) {
  const { t } = useT()
  const { folders, unfoldered } = useMemo(() => groupByYear(playlists), [playlists])

  // Varsayılan: hepsi AÇIK. Kapatılan yılları set'te tutuyoruz (açık = varsayılan,
  // set'te yoksa açık). Bu, yeni yıl eklendiğinde otomatik açık gelmesini sağlar.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleYear = (year: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  const renderPlaylists = (items: PlaylistCardData[]) =>
    viewMode === 'grid' ? (
      <div className={styles.grid} aria-label={t('playlists.yearFolders.gridAriaLabel')}>
        {items.map((p) => (
          <PlaylistCard key={p.id} playlist={p} compact />
        ))}
      </div>
    ) : (
      <div className={styles.listView} aria-label={t('playlists.yearFolders.listAriaLabel')} role="list">
        {items.map((p) => (
          <div key={p.id} role="listitem">
            <PlaylistListRow playlist={p} />
          </div>
        ))}
      </div>
    )

  return (
    <div className={styles.folderView}>
      {/* Klasörsüz playlist'ler ÖNCE (2026-08-02, Sahip): "Nowadays",
          "Summer Hits" gibi kullanıcının kendi kurduğu listeler günlük
          kullanımdır — otomatik ay/yıl klasörlerinin altında kalmamalı.
          Spotify kütüphane deseni. Başlık yok: bunlar "asıl liste", klasörler
          arşiv. */}
      {unfoldered.length > 0 && (
        <section className={styles.yearFolder}>
          <div className={styles.folderPanel}>{renderPlaylists(unfoldered)}</div>
        </section>
      )}

      {folders.map((folder) => {
        const isOpen = !collapsed.has(folder.year)
        const panelId = `folder-panel-${folder.year}`
        return (
          <section key={folder.year} className={styles.yearFolder}>
            <button
              type="button"
              className={styles.folderHeader}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleYear(folder.year)}
            >
              <ChevronRight
                size={18}
                className={`${styles.folderChevron} ${isOpen ? styles.folderChevronOpen : ''}`}
                aria-hidden
              />
              <span className={styles.folderYear}>{folder.year}</span>
              <span className={styles.folderCount}>
                {t('playlists.yearFolders.playlistCount', { count: folder.playlists.length })}
              </span>
            </button>
            {isOpen && (
              <div id={panelId} className={styles.folderPanel}>
                {renderPlaylists(folder.playlists)}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
