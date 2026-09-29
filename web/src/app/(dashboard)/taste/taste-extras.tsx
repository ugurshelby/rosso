import {
  getHistoryTopTracks,
  getHistoryTopArtists,
  getHistoryTopAlbums,
  resolveRange,
} from '@/lib/analytics/history'
import { getLongestStreak, getGenreSpectrum, getListeningStats } from '@/lib/profile/queries'
import { TopFiveOverview } from '@/components/taste/top-five-overview'
import { StreakCard } from '@/components/taste/streak-card'
import { DiscoveryScoreCard } from '@/components/taste/discovery-score-card'
import { getT } from '@/lib/i18n/server'
import styles from './taste.module.css'

/** Keşif skoru: tür çeşitliliği (en çok 60) + bu ay dinlenen benzersiz şarkı (en çok 40). */
function discoveryScoreOf(genreCount: number, vaultTracks: number): number {
  const diversity = Math.min(genreCount * 12, 60)
  const vaultBonus = Math.min(Math.floor(vaultTracks / 25), 40)
  return Math.min(100, diversity + vaultBonus)
}

/**
 * Taste'in "rakamlar" bölümü: Top 5 (tüm zamanlar) · dinleme serisi · keşif skoru.
 * Eski profil sayfasından taşındı; veri kaynağı kullanıcının kendi geçmişi
 * (history_top_* RPC'leri). Sayfanın ana gövdesini beklemesin diye Suspense
 * içinde akar (page.tsx).
 */
export async function TasteExtras({ userId }: { userId: string }) {
  const { t } = await getT()
  const range = resolveRange('alltime')
  const [tracks, artists, albums, streak, genreSpectrum, stats] = await Promise.all([
    getHistoryTopTracks(userId, range, 'time', 5),
    getHistoryTopArtists(userId, range, 'time', 5),
    getHistoryTopAlbums(userId, range, 'time', 5),
    getLongestStreak(userId),
    getGenreSpectrum(userId),
    getListeningStats(userId),
  ])

  if (tracks.length === 0 && artists.length === 0 && albums.length === 0) return null

  return (
    <section className={styles.extras} aria-label={t('taste.extras.ariaLabel')}>
      <div className={`${styles.extraPanel} ${styles.extraTop}`}>
        <TopFiveOverview
          tracks={tracks.map((t) => ({ trackId: t.track_id, title: t.title, artist: t.artist_name }))}
          artists={artists.map((a) => ({ name: a.artist_name, imageUrl: a.image_url }))}
          albums={albums.map((a) => ({
            name: a.album,
            artist: a.artist_name,
            imageUrl: a.image_url,
            playCount: a.play_count,
          }))}
        />
      </div>
      <div className={`${styles.extraPanel} ${styles.extraStreak}`}>
        <StreakCard streak={streak} />
      </div>
      <div className={`${styles.extraPanel} ${styles.extraDiscovery}`}>
        <DiscoveryScoreCard
          score={discoveryScoreOf(genreSpectrum.length, stats.vaultTracks)}
          genreCount={genreSpectrum.length}
          vaultTracks={stats.vaultTracks}
        />
      </div>
    </section>
  )
}
