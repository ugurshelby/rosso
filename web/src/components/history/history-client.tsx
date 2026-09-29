'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Hash, Grid2x2, Grid3x3, LayoutGrid, ListPlus, Calendar } from 'lucide-react'
import type { Period } from '@/lib/analytics/engine'
import type {
  HistorySort,
  HistoryTopTrack,
  HistoryTopArtist,
  HistoryTopAlbum,
} from '@/lib/analytics/history'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RevealTail,
  revealItemProps,
  useProgressiveReveal,
} from '@/components/ui/progressive-reveal'
import { HistoryCard } from './history-card'
import { HistoryPlaylistDialog } from './history-playlist-dialog'
import { useT } from '@/lib/i18n/provider'
import { cleanTrackTitle } from '@/lib/recap/clean-title'
import styles from './history.module.css'

export type HistoryTab = 'tracks' | 'artists' | 'albums'

const GRID_STORAGE_KEY = 'rosso:history-grid'
type GridCols = 3 | 4 | 5

function readStoredGrid(): GridCols {
  if (typeof window === 'undefined') return 3
  const stored = Number(localStorage.getItem(GRID_STORAGE_KEY))
  return stored === 4 || stored === 5 ? (stored as GridCols) : 3
}

interface HistoryClientProps {
  tab: HistoryTab
  period: Period
  sort: HistorySort
  custom: { from: string; to: string } | null
  tracks: HistoryTopTrack[]
  artists: HistoryTopArtist[]
  albums: HistoryTopAlbum[]
}

export function HistoryClient({
  tab,
  period,
  sort,
  custom,
  tracks,
  artists,
  albums,
}: HistoryClientProps) {
  const router = useRouter()
  const { t } = useT()
  const TABS: { key: HistoryTab; label: string }[] = [
    { key: 'tracks', label: t('history.tabs.tracks') },
    { key: 'artists', label: t('history.tabs.artists') },
    { key: 'albums', label: t('history.tabs.albums') },
  ]
  const PERIODS: { key: Period; label: string }[] = [
    { key: 'month', label: t('history.controls.monthly') },
    { key: 'year', label: t('history.controls.yearly') },
    { key: 'alltime', label: t('history.controls.allTime') },
  ]
  const [grid, setGrid] = useState<GridCols>(3)
  const [customOpen, setCustomOpen] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setGrid(readStoredGrid()) // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  // URL güncelle → sunucu yeni veriyi getirir. Mevcut paramları koru, değişeni ez.
  const navigate = useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams()
      const base: Record<string, string | null> = {
        tab, period, sort,
        from: custom?.from ?? null,
        to: custom?.to ?? null,
        ...patch,
      }
      for (const [k, v] of Object.entries(base)) {
        if (v) sp.set(k, v)
      }
      startTransition(() => {
        router.push(`/gecmis?${sp.toString()}`, { scroll: false })
      })
    },
    [router, tab, period, sort, custom],
  )

  const handleGrid = (cols: GridCols) => {
    setGrid(cols)
    localStorage.setItem(GRID_STORAGE_KEY, String(cols))
  }

  const items = tab === 'tracks' ? tracks : tab === 'artists' ? artists : albums
  const isEmpty = items.length === 0

  /*
   * Katman katman yükleme (2026-09-25). Sunucu her geçişte 100 kayıt döndürür
   * ve eskiden 100 kartın HEPSİ mount ediliyordu: HAR'da 138 görsel isteği,
   * 9,3 MB (tüm toggle'lar). Şimdi ilk 24 kart (masaüstünde ~8 satır, ilk
   * ekranın çok üstü) çizilir, kaydırdıkça 24'er kart açılır; görünmeyen
   * kartın kapağı hiç istenmez. `resetKey`: sekme/dönem/sıralama/aralık/
   * yoğunluk değişince liste baştan başlar.
   */
  const { count, hasMore, sentinelRef, initial, step } = useProgressiveReveal({
    total: items.length,
    resetKey: `${tab}|${period}|${sort}|${custom?.from ?? ''}|${custom?.to ?? ''}|${grid}`,
  })

  // Aktif aralık etiketi (playlist diyaloğuna geçmek için gün cinsinden).
  const activeRangeLabel = useMemo(() => {
    if (custom) return `${custom.from} → ${custom.to}`
    return PERIODS.find((p) => p.key === period)?.label ?? ''
  }, [custom, period])

  return (
    <div className={styles.page}>
      {/* Başlık + playlist oluştur eylemi */}
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t('history.header.eyebrow')}</p>
          <h1 className={styles.title}>{t('history.header.title')}</h1>
        </div>
        <button
          type="button"
          className={styles.playlistBtn}
          onClick={() => setPlaylistOpen(true)}
        >
          <ListPlus size={16} aria-hidden />
          {t('history.header.createPlaylist')}
        </button>
      </header>

      {/* Sekmeler: Şarkı / Sanatçı / Albüm */}
      <SegmentedControl
        layoutId="history-tab-pill"
        ariaLabel={t('history.tabs.ariaLabel')}
        options={TABS.map((tb) => ({ value: tb.key, label: tb.label }))}
        value={tab}
        onChange={(v) => navigate({ tab: v })}
        pending={isPending}
        className={styles.tabsControl}
      />

      {/* Kontrol çubuğu: zaman aralığı + sıralama + grid */}
      <div className={styles.controls}>
        <SegmentedControl
          layoutId="history-period-pill"
          ariaLabel={t('history.controls.timeRangeAriaLabel')}
          options={[
            ...PERIODS.map((p) => ({ value: p.key as Period | 'custom', label: p.label })),
            {
              value: 'custom' as Period | 'custom',
              label: custom ? t('history.controls.custom') : t('history.controls.date'),
              icon: <Calendar size={15} aria-hidden />,
            },
          ]}
          value={custom ? 'custom' : period}
          onChange={(v) => {
            if (v === 'custom') {
              setCustomOpen((o) => !o)
            } else {
              navigate({ period: v, from: null, to: null })
            }
          }}
        />

        <div className={styles.rightControls}>
          {/* Sıralama: süre / çalma sayısı */}
          <SegmentedControl
            layoutId="history-sort-pill"
            ariaLabel={t('history.controls.sortAriaLabel')}
            iconOnly
            options={[
              { value: 'time' as HistorySort, label: t('history.controls.sortByTime'), icon: <Clock size={17} /> },
              { value: 'count' as HistorySort, label: t('history.controls.sortByCount'), icon: <Hash size={17} /> },
            ]}
            value={sort}
            onChange={(v) => navigate({ sort: v })}
          />

          {/* Grid sütun seçici: 3 / 4 / 5 */}
          <SegmentedControl
            layoutId="history-grid-pill"
            ariaLabel={t('history.controls.gridAriaLabel')}
            iconOnly
            options={[
              { value: '3', label: t('history.controls.columns3'), icon: <Grid2x2 size={17} /> },
              { value: '4', label: t('history.controls.columns4'), icon: <Grid3x3 size={17} /> },
              { value: '5', label: t('history.controls.columns5'), icon: <LayoutGrid size={17} /> },
            ]}
            value={String(grid)}
            onChange={(v) => handleGrid(Number(v) as GridCols)}
          />
        </div>
      </div>

      {/* Özel tarih aralığı paneli */}
      {customOpen && (
        <CustomRangePanel
          initial={custom}
          onApply={(from, to) => {
            setCustomOpen(false)
            navigate({ from, to })
          }}
        />
      )}

      {/* İçerik ızgarası */}
      {isPending ? (
        /* Geçiş sürerken (sunucu ~0,5-1,2 sn): eski içeriği soluklaştırmak yerine
           yeni içeriğin İSKELETİ — "yükleniyor" durumu açıkça okunur, eski sıralama
           yeni etiketin altında kalıp yanıltmaz. Aynı ızgara → sonuç gelince
           yerleşim sıçramaz. */
        <div
          className={styles.grid}
          data-cols={grid}
          role="status"
          aria-live="polite"
          aria-label={t('history.loadingAriaLabel')}
        >
          {Array.from({ length: Math.min(items.length || 12, grid * 3) }, (_, i) => (
            <HistoryCardSkeleton key={i} circle={tab === 'artists'} />
          ))}
        </div>
      ) : isEmpty ? (
        <div className={styles.empty} role="status">
          <p className={styles.emptyText}>{t('history.empty.text')}</p>
          <p className={styles.emptyHint}>{t('history.empty.hint')}</p>
        </div>
      ) : (
        <>
          <ol
            className={styles.grid}
            data-cols={grid}
            aria-label={t('history.listAriaLabel', { label: TABS.find((tb) => tb.key === tab)?.label ?? '' })}
          >
            {tab === 'tracks' &&
              tracks.slice(0, count).map((t, i) => (
                <HistoryCard
                  key={t.track_id ?? `${t.title}-${i}`}
                  rank={i + 1}
                  title={cleanTrackTitle(t.title)}
                  subtitle={t.artist_name}
                  imageUrl={t.image_url}
                  shape="square"
                  sort={sort}
                  totalMs={t.total_ms}
                  playCount={t.play_count}
                  href={t.track_id ? `/track/${t.track_id}` : undefined}
                  kind="track"
                  coverId={t.track_id}
                  reveal={revealItemProps(i, initial, step)}
                />
              ))}
            {tab === 'artists' &&
              artists.slice(0, count).map((a, i) => (
                <HistoryCard
                  key={`${a.artist_name}-${i}`}
                  rank={i + 1}
                  title={a.artist_name}
                  imageUrl={a.image_url}
                  shape="circle"
                  sort={sort}
                  totalMs={a.total_ms}
                  playCount={a.play_count}
                  href={`/artist/${encodeURIComponent(a.artist_name)}`}
                  kind="artist"
                  coverId={a.artist_name}
                  reveal={revealItemProps(i, initial, step)}
                />
              ))}
            {tab === 'albums' &&
              albums.slice(0, count).map((a, i) => (
                <HistoryCard
                  key={`${a.album}-${i}`}
                  rank={i + 1}
                  title={a.album}
                  subtitle={a.artist_name}
                  imageUrl={a.image_url}
                  shape="square"
                  sort={sort}
                  totalMs={a.total_ms}
                  playCount={a.play_count}
                  href={
                    a.album
                      ? `/album/${encodeURIComponent(a.album)}${a.artist_name ? `?artist=${encodeURIComponent(a.artist_name)}` : ''}`
                      : undefined
                  }
                  reveal={revealItemProps(i, initial, step)}
                />
              ))}
          </ol>
          <RevealTail hasMore={hasMore} sentinelRef={sentinelRef} dataCols={grid}>
            {Array.from({ length: grid }, (_, i) => (
              <HistoryCardSkeleton key={i} circle={tab === 'artists'} />
            ))}
          </RevealTail>
        </>
      )}

      <HistoryPlaylistDialog
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        rangeLabel={activeRangeLabel}
      />
    </div>
  )
}

/** Kart iskeleti — gerçek kartın kare/daire kapağı + iki satır metin. */
function HistoryCardSkeleton({ circle }: { circle: boolean }) {
  return (
    <div className={styles.cardLink} aria-hidden>
      <Skeleton
        width="100%"
        style={{ aspectRatio: '1 / 1' }}
        radius={circle ? '50%' : 'var(--radius-md)'}
      />
      <Skeleton height="0.85rem" width="70%" radius="4px" />
      <Skeleton height="0.7rem" width="40%" radius="4px" />
    </div>
  )
}

/** Özel tarih aralığı — iki date input. Basit, native. */
function CustomRangePanel({
  initial,
  onApply,
}: {
  initial: { from: string; to: string } | null
  onApply: (from: string, to: string) => void
}) {
  const [from, setFrom] = useState(initial?.from ?? '')
  const [to, setTo] = useState(initial?.to ?? '')
  const valid = from && to && from <= to
  const { t } = useT()

  return (
    <div className={styles.customPanel}>
      <label className={styles.customField}>
        <span>{t('history.customRange.start')}</span>
        <input name="historyFrom" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <label className={styles.customField}>
        <span>{t('history.customRange.end')}</span>
        <input name="historyTo" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
      </label>
      <button
        type="button"
        className={styles.customApply}
        disabled={!valid}
        onClick={() => valid && onApply(from, to)}
      >
        {t('history.customRange.apply')}
      </button>
    </div>
  )
}
