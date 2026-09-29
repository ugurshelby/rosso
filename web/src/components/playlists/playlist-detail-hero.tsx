'use client'

import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { MoreHorizontal, Pencil, Play } from 'lucide-react'
import type { CSSProperties } from 'react'
import { ActionMenu } from '@/components/ui/action-menu/action-menu'
import type { MenuAction } from '@/components/ui/action-menu/types'
import { PlaylistCoverFallback } from './playlist-cover-fallback'
import { PlaylistEditModal } from './playlist-edit-modal'
import { CoverArt } from '@/components/media/cover-art'
import { getPlaylistExternalUrl, platformConfig } from '@/lib/platforms'
import { useCoverPalette } from '@/hooks/use-cover-palette'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import { springFor, SPRING_REVEAL } from '@/lib/motion/apple-spring'
import { useT } from '@/lib/i18n/provider'
import type { Translator } from '@/lib/i18n/translate'
import type { Platform } from '@rosso/shared-types'
import styles from './playlist-detail.module.css'

export interface PlaylistDetailHeroProps {
  id: string
  name: string
  description: string | null
  coverUrl: string | null
  platform: Platform
  trackCount: number | null
  /** Playlist_tracks.duration_ms toplamı — bilinmiyorsa (hiç track/duration yoksa) null. */
  totalDurationMs: number | null
  syncedAt: string | null
  platformId: string | null
  /** Taşı eylemi için — kaynak dışında bağlı platform varsa düğme çıkar. */
}

const NF = new Intl.NumberFormat('en-US')

function formatSyncedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Toplam süreyi insan diline çevirir: 565 dk → "9h 25m" (catalog-detail'in
    `formatMinutes`'ı ile aynı kural — hero'ya özel küçük kopya, modüller
    arası bağımlılık yaratmamak için). Çeviri metni `t` üzerinden gelir;
    yalnız sayı biçimi burada. */
function formatTotalDuration(ms: number, t: Translator['t']): string {
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return t('playlists.detailHero.durationMin', { count: totalMinutes })
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m === 0
    ? t('playlists.detailHero.durationHr', { count: h })
    : t('playlists.detailHero.durationHrMin', { hours: h, minutes: m })
}

/** Spotify'daki gibi tek satırlık, hep görünen metadata — açıklama varsa bile
    gizlenmez (eskiden açıklama varsa şarkı/süre bilgisi hiç gösterilmiyordu). */
function buildMetaLine(
  trackCount: number | null,
  totalDurationMs: number | null,
  platform: Platform,
  t: Translator['t'],
): string {
  const platformLabel = platformConfig[platform]?.label ?? platform
  const parts: string[] = []
  if (trackCount != null) parts.push(t('playlists.detailHero.songsCount', { count: NF.format(trackCount) }))
  if (totalDurationMs) parts.push(formatTotalDuration(totalDurationMs, t))
  parts.push(platformLabel)
  return parts.join(' • ')
}

export function PlaylistDetailHero({
  id,
  name,
  description,
  coverUrl,
  platform,
  trackCount,
  totalDurationMs,
  syncedAt,
  platformId,
}: PlaylistDetailHeroProps) {
  const { t } = useT()
  const externalUrl = getPlaylistExternalUrl(platform, platformId)
  const platformLabel = platformConfig[platform]?.label ?? platform
  const metaLine = buildMetaLine(trackCount, totalDurationMs, platform, t)
  const trimmedDescription = description?.trim() || null
  const [editOpen, setEditOpen] = useState(false)
  const reduced = usePrefersReducedMotion()

  // Kapak yalnız `coverUrl` (DB'den hazır) varsa örneklenir — lazy CoverArt
  // yolunda gerçek URL parent'a hiç gelmediği için o durumda varsayılan
  // gradient'e (--color-bg-elevated) düşülür.
  const palette = useCoverPalette(coverUrl)
  const heroStyle = {
    ...(palette.dominant ? { '--hero-color': palette.dominant } : {}),
    ...(palette.muted ? { '--hero-color-muted': palette.muted } : {}),
  } as CSSProperties

  /**
   * ⚠ 2026-08-11 (Sahip): eskiden tek eylem "Senkronizasyon ayarları"
   * hayalet bir panele bağlıydı (`SyncPanelAccordion` sayfada hiç render
   * edilmiyordu — `openSyncPanel` `document.getElementById` ile hiçbir şey
   * bulamayan sessiz bir no-op'tu). Yerine gerçek eylem: playlist düzenleme
   * modalı (ad/açıklama/kapak). Sıralama ayrı bir menü eylemi DEĞİL — her
   * track satırındaki yukarı/aşağı ok (`TrackReorderButtons`) üzerinden.
   */
  const heroMenuActions = useMemo<MenuAction[]>(
    () => [
      {
        id: 'edit',
        label: t('playlists.detailHero.editPlaylist'),
        icon: <Pencil size={15} strokeWidth={1.75} aria-hidden />,
        onSelect: () => setEditOpen(true),
      },
      ...(syncedAt
        ? [
            {
              id: 'synced-at',
              kind: 'meta' as const,
              label: t('playlists.detailHero.lastUpdated', { date: formatSyncedAt(syncedAt) }),
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncedAt, t],
  )

  return (
    <header className={styles.hero} style={heroStyle}>
      {/* Tam-kenar zemin — `.heroStage`in DIŞINDA duruyor çünkü stage'in
          `overflow:hidden`i (kapak görseli için) onu `.content` sütununa
          kırpardı. Bkz. playlist-detail.module.css `.heroBleed` yorumu. */}
      <div className={styles.heroBleed} aria-hidden />
      <div className={styles.heroStage}>
        <motion.div
          className={styles.heroCoverMotion}
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springFor(reduced, SPRING_REVEAL)}
        >
          {/* Spotify gibi: kapağa tıklamak düzenlemeyi açar, hover'da kalem belirir. */}
          <button
            type="button"
            className={styles.heroCoverButton}
            onClick={() => setEditOpen(true)}
            aria-label={t('playlists.detailHero.editPlaylist')}
          >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className={styles.heroCoverImg} />
          ) : (
            /* size=640: kapak şeridi tam genişlikte (~1300px'e kadar) uzuyor.
               Küçük boyut istemek Spotify'ın 300px'lik görselini seçtirir ve
               4× büyütülünce bulanıklaşır. */
            <CoverArt
              kind="playlist"
              id={id}
              size={640}
              alt=""
              className={styles.heroCoverArtFill}
              fallback={
                <PlaylistCoverFallback
                  platform={platform}
                  iconSize={48}
                  variant="hero"
                />
              }
            />
          )}
            <span className={styles.heroCoverEdit} aria-hidden>
              <Pencil size={40} strokeWidth={1.5} />
              <span>{t('playlists.detailHero.choosePhoto')}</span>
            </span>
          </button>
        </motion.div>
        <div className={styles.heroInfo}>
          <span className={styles.heroEyebrow}>{t('playlists.detailHero.eyebrow')}</span>
          <h1 className={styles.heroTitle}>{name}</h1>
          {trimmedDescription && (
            <p className={styles.heroDescription}>{trimmedDescription}</p>
          )}
          <p className={styles.heroMeta}>{metaLine}</p>
        </div>
      </div>

      <div className={styles.heroActionStrip}>
        <div className={styles.heroActionsLeft}>
          {externalUrl ? (
            /* Tek yeşil an: doğrudan Spotify'a giden ana çal düğmesi (Spotify referansı). */
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroActionPrimary}
              aria-label={t('playlists.detailHero.playOnPlatform', { platform: platformLabel })}
            >
              <Play size={24} fill="currentColor" strokeWidth={0} aria-hidden />
            </a>
          ) : (
            <button
              type="button"
              className={styles.heroActionPrimaryNeutral}
              onClick={() => setEditOpen(true)}
              aria-label={t('playlists.detailHero.editPlaylist')}
            >
              <Pencil size={22} strokeWidth={2} aria-hidden />
            </button>
          )}
          <ActionMenu
            actions={heroMenuActions}
            triggerLabel={t('playlists.detailHero.moreOptions')}
            sheetTitle={t('playlists.detailHero.playlistOptions')}
          >
            {({ ref, onClick, longPressHandlers, ...aria }) => (
              <button
                ref={ref}
                type="button"
                className={styles.heroIconGhost}
                onClick={onClick}
                {...longPressHandlers}
                {...aria}
              >
                <MoreHorizontal size={24} strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </ActionMenu>
        </div>
      </div>

      <PlaylistEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        playlistId={id}
        initialName={name}
        initialDescription={description}
        coverUrl={coverUrl}
      />
    </header>
  )
}
