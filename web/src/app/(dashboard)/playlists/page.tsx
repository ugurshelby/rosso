import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Music, FolderOpen, Plus } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { triggerUserRefresh } from '@/lib/sync/trigger-refresh'
import { createClient } from '@/lib/supabase/server'
import { PlaylistHero } from '@/components/playlists/playlist-hero'
import { PlaylistWorkspace } from '@/components/playlists/playlist-workspace'
import { LikedSongsEntry } from '@/components/playlists/liked-songs-entry'
import { LikedSongsCount } from './liked-songs-count'
import { getPhaseState } from '@/lib/phase/read'
import { getTasteProfile } from '@/lib/analytics/taste-profile'
import { matchVibeCard } from '@/lib/vibe-cards/match'
import { getT } from '@/lib/i18n/server'
import type { Platform } from '@rosso/shared-types'
import Link from 'next/link'
import styles from '@/components/playlists/playlists.module.css'

export const metadata: Metadata = {
  title: 'Playlists',
}

export default async function PlaylistsPage() {
  const user = await requireAuth()
  const { t } = await getT()

  // FAZ 2: playlist'leri arka planda tazele (fire-and-forget).
  void triggerUserRefresh(user.id, 'playlists')

  const supabase = await createClient()

  const [{ data: playlists }, { data: connections }, { data: autoRules }, phase, tasteProfile] =
    await Promise.all([
      supabase
        .from('playlists')
        .select('id, name, platform, track_count, cover_url, synced_at')
        .eq('user_id', user.id)
        .order('name'),
      supabase
        .from('platform_connections')
        .select('platform')
        .eq('user_id', user.id)
        .eq('is_active', true),
      // Hero aksiyon butonundaki "açık" noktası (G-FAZ 0).
      supabase
        .from('auto_playlist_rules')
        .select('enabled')
        .eq('user_id', user.id)
        .eq('rule_type', 'top_month')
        .limit(1),
      getPhaseState(user.id),
      // Hero'nun her zaman dolu vibe-card katmanı (2026-09-17) — taste
      // verisi yoksa bile `matchVibeCard` deterministik bir kart döndürür.
      getTasteProfile(user.id),
    ])

  const list = playlists ?? []
  const connectedPlatforms = new Set((connections ?? []).map((c) => c.platform))
  const totalTracks = list.reduce((sum, p) => sum + (p.track_count ?? 0), 0)
  const platformCount = new Set(list.map((p) => p.platform)).size
  const hasConnections = connectedPlatforms.size > 0
  const vibeCardId = matchVibeCard(tasteProfile, user.id)
  const vibeCardSrc = `/vibe-cards/${vibeCardId}.webp`

  return (
    <>
      {/* FAZ UI-4: ortak PageHeader + ayrı istatistik çubuğu yerine tek hero.
          Sayılar artık başlığın SAĞINDA (masaüstü) / ALTINDA (mobil). */}
      <PlaylistHero
        playlistCount={list.length}
        platformCount={platformCount}
        trackCount={totalTracks}
        showActions={hasConnections && list.length > 0}
        autoPlaylistEnabled={autoRules?.[0]?.enabled ?? false}
        /*
         * Hero dokusu kütüphanenin kendi kapaklarından doğar
         * (2026-08-13). En ÇOK ŞARKILI listelerin kapağı seçiliyor —
         * ilk sıradakiler değil: liste `name`'e göre sıralı geldiği
         * için ilk 5 alfabetik olurdu ve kullanıcının kütüphanesini
         * temsil etmezdi. En kalabalık listeler onun asıl kimliği.
         */
        coverUrls={[...list]
          .filter((p) => p.cover_url)
          .sort((a, b) => (b.track_count ?? 0) - (a.track_count ?? 0))
          .slice(0, 5)
          .map((p) => p.cover_url as string)}
        vibeCardSrc={vibeCardSrc}
      />

      {/* Beğenilen Şarkılar — kütüphaneden BAĞIMSIZ giriş. Yalnız hero'nun
          üç kartı (Create/Mood/Liked) GÖRÜNMÜYORSA render edilir — aksi
          halde "Liked" iki kez söylenmiş olurdu (2026-08-13 dersi, hero
          kartı 2026-09-17'de geri geldiğinde bu koşulla korundu).
          Bağlantısız/boş kütüphane durumunda hâlâ gerekli: beğeniler
          ZIP'ten gelir, playlist senkronuna bağlı değil.
          Sayı ayrı <Suspense> ile akar (bkz. liked-songs-count.tsx) — RPC
          sayfanın ilk boyamasını bloklamaz. Faz 4 kilitliyse hiç sorulmaz. */}
      {!(hasConnections && list.length > 0) && (
        phase.capabilities.canSeeLikedSongs ? (
          <Suspense fallback={<LikedSongsEntry trackCount={null} />}>
            <LikedSongsCount userId={user.id} />
          </Suspense>
        ) : (
          <LikedSongsEntry trackCount={null} />
        )
      )}

      {list.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            {hasConnections ? (
              <FolderOpen size={40} strokeWidth={1} />
            ) : (
              <Music size={40} strokeWidth={1} />
            )}
          </div>
          <h2 className={styles.emptyTitle}>
            {hasConnections
              ? t('playlists.emptyState.titleConnected')
              : t('playlists.emptyState.titleDisconnected')}
          </h2>
          <p className={styles.emptyDesc}>
            {hasConnections
              ? t('playlists.emptyState.descConnected')
              : t('playlists.emptyState.descDisconnected')}
          </p>
          <div className={styles.emptyActions}>
            {hasConnections ? (
              <Link href="/data" className={styles.emptyActionPrimary}>
                <Plus size={14} />
                {t('playlists.emptyState.startSync')}
              </Link>
            ) : (
              <Link href="/data" className={styles.emptyActionPrimary}>
                {t('playlists.emptyState.connectPlatform')}
              </Link>
            )}
          </div>
          <div className={styles.dropZone} aria-label={t('playlists.emptyState.dropZoneAriaLabel')}>
            <span className={styles.dropZoneText}>{t('playlists.emptyState.dropZoneText')}</span>
            <span className={styles.dropZoneSubtext}>{t('playlists.emptyState.dropZoneSoon')}</span>
          </div>
        </div>
      ) : (
        <PlaylistWorkspace
          playlists={list}
          connectedPlatforms={Array.from(connectedPlatforms) as Platform[]}
        />
      )}
    </>
  )
}
