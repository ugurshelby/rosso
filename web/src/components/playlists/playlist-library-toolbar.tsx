'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SPRING_UI } from '@/lib/motion/apple-spring'
import { LayoutGrid, List, Search, FolderTree, AlignJustify } from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import type { MessageKey } from '@/lib/i18n'
import styles from './playlists.module.css'

export type PlaylistSortOption = 'synced_desc' | 'name_asc' | 'track_count_desc'
export type PlaylistViewMode = 'grid' | 'list'
/** Ay+yıl playlist'lerini yıl klasörlerinde grupla ('folder') veya düz göster ('flat'). */
export type PlaylistFolderMode = 'folder' | 'flat'

const SORT_OPTIONS: { value: PlaylistSortOption; labelKey: MessageKey }[] = [
  { value: 'synced_desc', labelKey: 'playlists.toolbar.sortOptions.lastUpdated' },
  { value: 'name_asc', labelKey: 'playlists.toolbar.sortOptions.alphabetical' },
  { value: 'track_count_desc', labelKey: 'playlists.toolbar.sortOptions.trackCount' },
]

const VIEW_STORAGE_KEY = 'rosso:playlist-view'
const FOLDER_STORAGE_KEY = 'rosso:playlist-folder'

export function readStoredViewMode(): PlaylistViewMode {
  if (typeof window === 'undefined') return 'grid'
  const stored = localStorage.getItem(VIEW_STORAGE_KEY)
  return stored === 'list' ? 'list' : 'grid'
}

export function persistViewMode(mode: PlaylistViewMode): void {
  localStorage.setItem(VIEW_STORAGE_KEY, mode)
}

/**
 * Klasör tercihi. Varsayılan 'folder' (Sahip 2026-07-26: "açık gelsin") —
 * ama toggle yalnız klasörlenebilir playlist varsa gösterilir (bkz. library).
 */
export function readStoredFolderMode(): PlaylistFolderMode {
  if (typeof window === 'undefined') return 'folder'
  const stored = localStorage.getItem(FOLDER_STORAGE_KEY)
  return stored === 'flat' ? 'flat' : 'folder'
}

export function persistFolderMode(mode: PlaylistFolderMode): void {
  localStorage.setItem(FOLDER_STORAGE_KEY, mode)
}

interface PlaylistLibraryToolbarProps {
  onSearchChange: (value: string) => void
  sort: PlaylistSortOption
  onSortChange: (value: PlaylistSortOption) => void
  viewMode: PlaylistViewMode
  onViewModeChange: (value: PlaylistViewMode) => void
  /** Klasör toggle'ı — yalnız `canFolder` true iken gösterilir. */
  folderMode: PlaylistFolderMode
  onFolderModeChange: (value: PlaylistFolderMode) => void
  canFolder: boolean
  resultCount: number
  totalCount: number
}

export function PlaylistLibraryToolbar({
  onSearchChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  folderMode,
  onFolderModeChange,
  canFolder,
  resultCount,
  totalCount,
}: PlaylistLibraryToolbarProps) {
  const { t } = useT()
  const [searchInput, setSearchInput] = useState('')
  const reduced = useReducedMotion()
  const indicatorTransition = reduced ? { duration: 0 } : SPRING_UI

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearchChange(searchInput.trim())
    }, 200)
    return () => window.clearTimeout(timer)
  }, [searchInput, onSearchChange])

  const handleViewChange = (mode: PlaylistViewMode) => {
    onViewModeChange(mode)
    persistViewMode(mode)
  }

  const handleFolderChange = (mode: PlaylistFolderMode) => {
    onFolderModeChange(mode)
    persistFolderMode(mode)
  }

  return (
    <div className={styles.libraryToolbar} role="toolbar" aria-label={t('playlists.toolbar.ariaLabel')}>
      {/* Platform filtresi kaldırıldı (2026-07-18, Sahip revizyonu: "bu
          seviyede gerekli değil, platform renkleri/buton tasarımı genel
          tasarım dilini zayıflatıyordu"). */}
      <div className={styles.toolbarControls}>
        <label className={styles.searchField}>
          <Search size={16} className={styles.searchIcon} aria-hidden />
          <input name="playlistSearch"
            type="search"
            className={styles.searchInput}
            placeholder={t('playlists.toolbar.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label={t('playlists.toolbar.searchAriaLabel')}
          />
        </label>

        <label className={styles.sortField}>
          <span className={styles.sortLabel}>{t('playlists.toolbar.sortLabel')}</span>
          <select name="playlistSort"
            className={styles.sortSelect}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as PlaylistSortOption)}
            aria-label={t('playlists.toolbar.sortAriaLabel')}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.viewToggle} role="group" aria-label={t('playlists.toolbar.viewModeAriaLabel')}>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            aria-pressed={viewMode === 'grid'}
            aria-label={t('playlists.toolbar.gridView')}
            onClick={() => handleViewChange('grid')}
          >
            {viewMode === 'grid' && (
              <motion.span
                layoutId="view-toggle-indicator"
                className={styles.viewBtnIndicator}
                transition={indicatorTransition}
                aria-hidden
              />
            )}
            <span className={styles.viewBtnIcon}>
              <LayoutGrid size={18} />
            </span>
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            aria-pressed={viewMode === 'list'}
            aria-label={t('playlists.toolbar.listView')}
            onClick={() => handleViewChange('list')}
          >
            {viewMode === 'list' && (
              <motion.span
                layoutId="view-toggle-indicator"
                className={styles.viewBtnIndicator}
                transition={indicatorTransition}
                aria-hidden
              />
            )}
            <span className={styles.viewBtnIcon}>
              <List size={18} />
            </span>
          </button>
        </div>

        {/* Klasör toggle — YALNIZ ay+yıl playlist'i olan kullanıcıya gösterilir.
            Klasörlenecek bir şey yoksa toggle anlamsız, hiç render edilmez. */}
        {canFolder && (
          <div className={styles.viewToggle} role="group" aria-label={t('playlists.toolbar.folderModeAriaLabel')}>
            <button
              type="button"
              className={`${styles.viewBtn} ${folderMode === 'folder' ? styles.viewBtnActive : ''}`}
              aria-pressed={folderMode === 'folder'}
              aria-label={t('playlists.toolbar.yearFolders')}
              onClick={() => handleFolderChange('folder')}
            >
              {folderMode === 'folder' && (
                <motion.span
                  layoutId="folder-toggle-indicator"
                  className={styles.viewBtnIndicator}
                  transition={indicatorTransition}
                  aria-hidden
                />
              )}
              <span className={styles.viewBtnIcon}>
                <FolderTree size={18} />
              </span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${folderMode === 'flat' ? styles.viewBtnActive : ''}`}
              aria-pressed={folderMode === 'flat'}
              aria-label={t('playlists.toolbar.flatList')}
              onClick={() => handleFolderChange('flat')}
            >
              {folderMode === 'flat' && (
                <motion.span
                  layoutId="folder-toggle-indicator"
                  className={styles.viewBtnIndicator}
                  transition={indicatorTransition}
                  aria-hidden
                />
              )}
              <span className={styles.viewBtnIcon}>
                <AlignJustify size={18} />
              </span>
            </button>
          </div>
        )}
      </div>

      {searchInput ? (
        <p className={styles.toolbarMeta} aria-live="polite">
          {t('playlists.toolbar.resultCount', { count: resultCount, total: totalCount })}
        </p>
      ) : null}
    </div>
  )
}
