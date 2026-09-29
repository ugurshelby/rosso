import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/security/route-params'
import { PlaylistDetailHero } from '@/components/playlists/playlist-detail-hero'
import { PlaylistGrowthChart } from '@/components/playlists/playlist-growth-chart'
import { TrackTable } from '@/components/playlists/track-table'
import { getPlaylistGrowth } from '@/lib/library/playlist-growth'
import { getT } from '@/lib/i18n/server'
import type { Platform } from '@rosso/shared-types'
import styles from '@/components/playlists/playlist-detail.module.css'

export const metadata: Metadata = {
  title: 'Playlist',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PlaylistDetailPage({ params }: PageProps) {
  const { id } = await params
  if (!isUuid(id)) notFound()  // P4: geçersiz id DB'ye gitmeden 404
  const user = await requireAuth()
  const supabase = await createClient()
  const { t } = await getT()

  // ── Üç sorgu PARALEL (2026-07-30 performans turu, Aşama 1 — Bulgu 6.2-B) ──
  // Eskiden üç aşama SERİ bekliyordu: playlist → sync_rules → mode → bağlantılar.
  // Oysa üçü de yalnız URL'deki `id` ve `user.id`'ye bağlı; birbirlerinin
  // sonucuna ihtiyaçları yok → aynı anda gidebilirler (bir ağ turu kazancı).
  //
  /* 2026-08-08 (P3): ÜÇ sorgu → BİR sorgu. `sync_rules` ve
     `platform_connections` yalnız kaldırılan senkron panelini besliyordu;
     canlıda ölçüldü: sync_rules 0 kayıt, platform_connections yalnız
     'spotify'. İki gereksiz ağ turu daha gitti. */
  const { data: playlist } =
    await (
      supabase
        .from('playlists')
        .select(`
          id, name, platform, platform_id, track_count, cover_url, description, synced_at,
          playlist_tracks (
            position,
            tracks (
              id, title, artists, isrc, duration_ms, album, spotify_id
            )
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .order('position', { referencedTable: 'playlist_tracks' })
        .single()
    )

  if (!playlist) notFound()

  // A1 + A8 — ikisi de `playlist_track_events`'ten okur ve birbirine bağlı
  // değil → paralel. (A8 = migration 0182: eşleştirme A1 ile birebir aynı,
  // ad VEYA URI. Tek parametreli eski imza 21 listede çalışıyordu, bu 30'da.)
  //
  // ⚠ Eşleşme KISMİ: Spotify export'unda playlist URI'si yok, ad üzerinden
  // eşleşiyoruz (112 listenin 30'u — ölçüldü). Eşleşmeyen listede harita boş
  // döner ve sütun hiç görünmez; grafik de hiç render edilmez.
  const [{ data: addedRows }, growthSeries] = await Promise.all([
    supabase.rpc('playlist_track_added_dates', {
      p_user_id: user.id,
      p_playlist_id: id,
    }),
    getPlaylistGrowth(user.id, id),
  ])
  const addedAtByTrack = new Map<string, string>(
    (addedRows ?? [])
      .filter((r): r is { track_id: string; added_at: string } => Boolean(r.added_at))
      .map((r) => [r.track_id, r.added_at]),
  )

  const trackRows = (playlist.playlist_tracks ?? []).map((pt) => ({
    position: pt.position,
    tracks: pt.tracks
      ? {
          id: (pt.tracks as { id: string }).id,
          title: (pt.tracks as { title: string }).title,
          artist_name: (pt.tracks as { artists: string[] }).artists,
          isrc: (pt.tracks as { isrc: string | null }).isrc,
          duration_ms: (pt.tracks as { duration_ms: number | null }).duration_ms,
          album: (pt.tracks as { album: string | null }).album,
          album_image_url: null,
          spotify_id: (pt.tracks as { spotify_id: string | null }).spotify_id,
        }
      : null,
    addedAt: pt.tracks
      ? addedAtByTrack.get((pt.tracks as { id: string }).id) ?? null
      : null,
  }))

  // Hero metadata satırı (§ playlist hero redesign, 2026-07-30) — bilinmeyen
  // (null) duration_ms'ler toplama katılmaz; hiç bilinen yoksa null (satırda
  // gösterilmez, uydurma "0 dk" yazılmaz).
  const totalDurationMs = trackRows.reduce(
    (sum, row) => sum + (row.tracks?.duration_ms ?? 0),
    0,
  )

  return (
    <>
      <PlaylistDetailHero
        id={playlist.id}
        name={playlist.name}
        description={playlist.description}
        coverUrl={playlist.cover_url}
        platform={playlist.platform as Platform}
        trackCount={playlist.track_count}
        totalDurationMs={totalDurationMs > 0 ? totalDurationMs : null}
        syncedAt={playlist.synced_at}
        platformId={playlist.platform_id}
      />

      <section className={styles.trackSection} aria-label={t('playlists.detail.tracksAriaLabel')}>
        <TrackTable rows={trackRows} playlistId={playlist.id} />
      </section>

      {/* A8 — büyüme grafiği. Şarkı tablosundan SONRA: önce "bu listede ne var"
          sorusu cevaplanır, sonra "nasıl bu hâle geldi". Seri 3 aydan kısaysa
          bileşen kendisi null döner (eşleşen 30 listenin 16'sı geçiyor). */}
      <PlaylistGrowthChart
        series={growthSeries}
        title={t('playlists.detail.growthTitle', { name: playlist.name })}
      />

      {/* 🗑 ÖNERİ BÖLÜMÜ KALDIRILDI (2026-08-11, Sahip kararı) — "Rosso
          playlistlerin altında şarkı önermesin." `RecommendationsSection`,
          `PlaylistRecommendations`, `getPlaylistRecommendations(Package)`,
          `get_playlist_recommendations` RPC'si ve `playlist_reco_pkg` cron
          paketi kaldırıldı; migration 0268 DB tarafını söktü.
          Ürün yönü artık: mood sayfası üzerinden Rosso'nun ÜRETTİĞİ haftalık
          playlist'ler (bkz. `/playlists/mood`), tek şarkı önerisi değil. */}

      {/* 🗑 SENKRONİZASYON PANELİ + `SyncPanelRoot` KALDIRILDI (2026-08-11,
          gece oturumu — 2026-08-08 P3 temizliğinin devamı). Panel zaten
          UI'da render edilmiyordu ama `PlaylistDetailHero`'daki menü hâlâ
          `openSyncPanel` (var olmayan `#playlist-sync-panel` id'sini arayan
          sessiz no-op) çağırıyordu — hayalet bir eylem. Sahibin ekran
          görüntüsüyle yakalandı. Menü artık gerçek bir eylem: playlist
          düzenleme modalı (`PlaylistEditModal` — ad/açıklama/kapak).
          `SyncPanelRoot` context'inin tek tüketicisi bu hayalet eylemdi,
          o gidince context de anlamsız kaldı.

          ÖLÇÜLDÜ (canlı, 2026-08-08): platform_connections → yalnız
          'spotify' (3 bağlantı, başka 0); sync_rules → 0 kayıt.
          ⚠ `sync_rules` TABLOSU DURUYOR (Sahip kararı: "kalabilir ama UI
            göstermemeli"). Çok platform dönerse panel geri getirilebilir. */}
    </>
  )
}
