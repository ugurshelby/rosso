import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { moodByKey, getMoodPackage, getMoodWorkspace, getMoodEtiketleri } from '@/lib/analytics/mood'
import { getKuratorNotu } from '@/lib/analytics/editorial-read'
import { MoodWorkspace } from '@/components/mood/mood-workspace'
import { MoodHero } from '@/components/mood/mood-hero'
import { getT } from '@/lib/i18n/server'
import playlistDetailStyles from '@/components/playlists/playlist-detail.module.css'
import styles from '@/components/mood/mood.module.css'

interface PageProps {
  params: Promise<{ key: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params
  const mood = moodByKey(key)
  // Marka son eki kök şablondan (`%s — Rosso`) gelir; burada da yazmak
  // başlığı "The Quiet Side — Rosso — Rosso" yapıyordu (2026-09-22, ölçüldü).
  return { title: mood ? mood.title : 'Anlar' }
}

/**
 * Mood detay — playlist DETAY sayfasıyla BİREBİR aynı yapı: hero + TrackTable
 * (gerçek playlist bileşeni). Fark yalnız "Spotify'a ekle" (mood'un playlist'i yok,
 * kullanıcı isterse oluşturur).
 */
export default async function MoodDetailPage({ params }: PageProps) {
  const { key } = await params
  const mood = moodByKey(key)
  if (!mood) notFound()

  const user = await requireAuth()
  // 2026-07-30: Sahibin ürün kararı — mood playlist'leri sabit 50 şarkı
  // (`MOOD_TRACK_LIMIT`). Eskiden 40'tı; liste sayfası ise 30 istiyordu, yani
  // aynı mood iki yerde iki farklı uzunlukta görünüyordu.
  //
  // 2026-08-01 (Aşama 3 · paket #6): sayfa `mood_pkg`'den okuyor (0169+0171) —
  // ~300 ms → 0,071 ms. Paket yoksa CANLI HESABA DÜŞMEZ, "hazırlanıyor" der
  // (§12.4-A). `/api/mood/create-playlist` bilinçli olarak RPC'de kaldı:
  // Spotify'a bayat liste yazmamak için.
  // Paket (cron üretimi) ve çalışma alanı (kullanıcı niyeti) PARALEL okunur —
  // ikisi ayrı tablo (migration 0255), biri diğerini beklemez.
  const [pkg, calismaAlani, kuratorNotu, etiketler, { t }] = await Promise.all([
    getMoodPackage(user.id, mood.key),
    getMoodWorkspace(mood.key),
    // Liner Notes (AI, opsiyonel): yoksa null → sayfa notsuz, eksiksiz.
    getKuratorNotu(user.id, mood.key),
    // Uygunluk etiketleri (migration 0338): yoksa boş → etiketsiz liste.
    getMoodEtiketleri(mood.key),
    getT(),
  ])
  const preparing = pkg === null
  const tracks = pkg ?? []

  /*
   * 🔴 SAYIM TEK ÖLÇÜDEN GELİR (2026-08-25, playlist turu).
   *
   * Kırık canlıda ölçüldü: hero **"32 şarkı"**, listenin üstü **"50 şarkı"**.
   * Aynı sayfada iki farklı sayı — kullanıcı hangisine inanacağını bilemez.
   *
   * Sebep: iki taraf aynı veriden FARKLI yöntemle sayıyordu.
   *   • Hero        → `tracks.length - hiddenTrackIds.length`  (çıkarma)
   *   • Workspace   → gizli KİMLİKLERİ satırlarla eşleştirip filtreleme
   *
   * Çıkarma, gizli kimliğin listede gerçekten bulunduğunu VARSAYAR. Paket
   * cron'la tazelendiğinde eski gizlenen şarkı listeden düşer ama kaydı
   * `hidden_track_ids`te kalır — o an çıkarma fazladan siler. Ölçümde tam
   * bu görüldü: 18 gizli kimlik vardı, HİÇBİRİ listede yoktu ("Hepsini
   * geri al" düğmesi bile çıkmıyordu), hero yine de 18 eksik yazıyordu.
   *
   * Çözüm: hero da workspace ile AYNI ölçüyü kullanır — gerçekten eşleşen
   * satırları say. Kaynak tek, sonuç tek.
   */
  const gizliKimlikler = new Set(calismaAlani.hiddenTrackIds)
  const gorunenSarkiSayisi = tracks.filter(
    (t) => t.trackId && !gizliKimlikler.has(t.trackId),
  ).length

  // Mood şarkılarını TrackTable'ın beklediği satır şekline map et.
  const trackRows = tracks.map((t, i) => ({
    position: i,
    tracks: t.trackId
      ? {
          id: t.trackId,
          title: t.title,
          artist_name: t.artistName ?? '',
          isrc: null,
          duration_ms: null,
          album: null,
          album_image_url: t.imageUrl,
          spotify_id: t.spotifyId,
        }
      : null,
  }))

  return (
    <div className={styles.detailPage}>
      <Link href="/playlists/mood" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Anlar
      </Link>

      <MoodHero
        moodKey={mood.key}
        title={mood.title}
        tagline={mood.tagline}
        trackCount={gorunenSarkiSayisi}
        exportedAt={calismaAlani.exportedAt}
        exportedPlaylistId={calismaAlani.exportedPlaylistId}
        weeklySyncEnabled={calismaAlani.weeklySyncEnabled}
      />

      {kuratorNotu && !preparing ? <p className={styles.kuratorNotu}>{kuratorNotu}</p> : null}

      <section
        className={playlistDetailStyles.trackSection}
        aria-label={t('playlists.moodDetail.tracksAriaLabel')}
      >
        {preparing ? (
          <p className={styles.preparing} role="status">
            {t('playlists.moodDetail.preparing')}
          </p>
        ) : (
          <MoodWorkspace
            moodKey={mood.key}
            rows={trackRows}
            initialHidden={calismaAlani.hiddenTrackIds}
            initialEtiketler={etiketler}
          />
        )}
      </section>
    </div>
  )
}
