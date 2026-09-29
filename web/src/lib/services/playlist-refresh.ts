import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import { systemLog } from '@/lib/observability/logger'
import {
  checkGate,
  refund,
  record429,
  PRIORITY_HIGH,
  PRIORITY_NORMAL,
  SCOPE_USER,
} from '@/lib/spotify/api-gate'
import {
  fetchUserPlaylists,
  fetchPlaylistItems,
  SpotifyHttpError,
  type RemotePlaylist,
  type RemotePlaylistItem,
} from '@/lib/spotify/playlists-fetch'
import { resolveOrCreateTrackByIdentity } from '@/lib/catalog/resolve-track'
import { spotifyAppAnahtari, spotifyKapsami } from '@/lib/spotify/byoc'

/**
 * Playlist tazeleme akışı — snapshot_id ucuz kontrolü, değişmişse tam senkron.
 * `worker/app/pipeline/playlist_refresh_runner.py`'nin TS portu
 * (01-yillik-kontrolsuz-calisma-plani.md devamı, 2026-09-16 — Sahibin
 * açık kararıyla, karmaşıklığına rağmen taşındı).
 *
 * ⚠ Bu dosyadaki HER güvenlik dalı (owner filtresi, 403/404 tekil atlama,
 * 429 ceza damgası, stale-playlist silme kapıları) canlıda yaşanmış gerçek
 * olaylardan (SBA-7, S2, S3, B1, B4, B6) doğdu — Python yorumlarındaki
 * gerekçeler AYNEN korunmuştur. Hiçbir dal "sadeleştirme" adına atlanmadı.
 */

type SupabaseClient = Awaited<ReturnType<typeof createServiceClient>>

export interface PlaylistRefreshResult {
  outcome: 'blocked' | 'skipped' | 'empty' | 'success' | 'partial' | 'error'
  playlistsUpdated: number
  playlistsDeleted?: number
  errors?: number
  skippedPlaylists?: number
  skippedUsers?: number
  gateReason?: string
}

/**
 * Aktif Spotify bağlantıları için playlist tazeleme.
 * `userId` verilirse YALNIZ o kullanıcı; verilmezse tüm aktif bağlantılar.
 *
 * Kayan sıra (0342) cron'u artık HER ZAMAN `userId` ile çağırır — kullanıcı
 * başına bir iş. Tüm-kullanıcı yolu elle/geriye uyum için duruyor.
 *
 * @param secenek.oncelik Kota kapısı önceliği. Verilmezse: `userId` varsa
 *        HIGH (kullanıcı ekranda bekliyor), yoksa NORMAL. Cron NORMAL geçer.
 */
export async function runPlaylistRefresh(
  userId?: string,
  secenek: { oncelik?: number } = {},
): Promise<PlaylistRefreshResult> {
  const supabase = await createServiceClient()

  // ── Merkezî geçit ─────────────────────────────────────────────────────
  const priority = secenek.oncelik ?? (userId !== undefined ? PRIORITY_HIGH : PRIORITY_NORMAL)
  /*
   * 🔴 KAPSAM APP BAŞINA (2026-09-23, 1000 kullanıcı ölçeği). Eskiden tek
   * 'spotify:user' bütçesi (günde 300) TÜM kullanıcılara ortaktı: 1000
   * kullanıcıda günde 2 tazeleme = 2000 geçit → ilk 300'den sonrası hep
   * 'budget' ile atlanırdı. BYOC'de her kullanıcının app'i kendi kotasını
   * taşır; kapsam da onun app'ine yazılır (satır SQL'de otomatik açılır).
   */
  const kapsam =
    userId !== undefined ? spotifyKapsami(await spotifyAppAnahtari(userId), 'user') : SCOPE_USER
  const gate = await checkGate(kapsam, { priority })
  if (!gate.allowed) {
    return {
      outcome: gate.reason === 'blocked' ? 'blocked' : 'skipped',
      playlistsUpdated: 0,
      gateReason: gate.reason,
    }
  }

  let query = supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'spotify')
    .eq('is_active', true)
  if (userId !== undefined) query = query.eq('user_id', userId)

  const { data: connections } = await query
  if (!connections || connections.length === 0) {
    // İstek atılmadı → ayrılan bütçeyi iade et.
    await refund(kapsam)
    return { outcome: 'empty', playlistsUpdated: 0 }
  }

  let updated = 0
  let deleted = 0
  let errors = 0
  let skippedPlaylists = 0
  let skippedUsers = 0

  for (const conn of connections) {
    const uid = conn.user_id as string
    const token = await ensureValidToken(uid, 'spotify')
    if (!token) {
      void systemLog({
        operation: 'playlist_refresh',
        userId: uid,
        severity: 'error',
        errorCode: 'token_refresh_failed',
        errorMessage: 'Token alınamadı — playlist\'ler bu turda tazelenmedi',
      })
      errors += 1
      continue
    }

    // Kullanıcının kendi Spotify ID'sini bir kez al; yalnız SAHİBİ olduğu
    // playlist'leri işle. Takip edilen (başkasının) listeler item fetch'te
    // 403 verir ve eskiden tüm cron'u kırardı.
    const meId = await fetchMeId(token, supabase, uid)

    let remotePlaylists: RemotePlaylist[]
    try {
      remotePlaylists = await fetchUserPlaylists(token)
    } catch (exc) {
      if (exc instanceof SpotifyHttpError && [401, 403, 404].includes(exc.status)) {
        // Kullanıcı seviyesinde 403/404 → SADECE O KULLANICI atlanır (S3).
        // Eskiden burada hata yukarı fırlayıp TÜM turu kırıyordu.
        void systemLog({
          operation: 'playlist_refresh',
          userId: uid,
          severity: 'warn',
          errorCode: `user_playlists_http_${exc.status}`,
          errorMessage:
            'Kullanıcının playlist\'leri alınamadı (erişim yok — Spotify Dev Mode allowlist\'te olmayabilir); bu tur atlandı',
        })
        skippedUsers += 1
        continue
      }
      if (exc instanceof SpotifyHttpError && exc.status === 429) {
        // Ceza damgası + bütçe kapatma — Retry-After yoksa 1 saat varsayılır.
        await record429(kapsam, exc.retryAfterSeconds, 'playlist_refresh_429')
        void systemLog({
          operation: 'playlist_refresh',
          severity: 'warn',
          errorMessage: 'Playlist tazeleme: 429 — ceza damgası vuruldu, tur durduruluyor',
        })
        break // turu bitir; DB'ye yazılanlar korunur
      }
      throw exc // beklenmedik hata (5xx, ağ) yukarı gitsin
    }

    const filteredRemote = meId
      ? remotePlaylists.filter((rp) => rp.ownerId === null || rp.ownerId === meId)
      : remotePlaylists

    const { data: existingRows } = await supabase
      .from('playlists')
      .select('id, platform_id, snapshot_id, cover_url, description')
      .eq('user_id', uid)
      .eq('platform', 'spotify')

    const existingByPlatformId = new Map(
      (existingRows ?? []).map((p) => [p.platform_id as string, p]),
    )
    const remotePlatformIds = new Set(filteredRemote.map((rp) => rp.spotifyId))

    for (const rp of filteredRemote) {
      const existing = existingByPlatformId.get(rp.spotifyId)

      if (existing && existing.snapshot_id === rp.snapshotId) {
        // İçerik değişmemiş — item fetch YAPMA (pahalı olan o). Ama eksik
        // metadata varsa ucuz bir upsert atılır (ek istek yok, veri elimizde).
        const eksikMetadata =
          (rp.coverUrl && !existing.cover_url) || (rp.description && !existing.description)
        if (eksikMetadata) {
          await supabase.from('playlists').upsert(
            {
              user_id: uid,
              platform: 'spotify',
              platform_id: rp.spotifyId,
              name: rp.name,
              snapshot_id: rp.snapshotId,
              track_count: rp.trackCount,
              cover_url: rp.coverUrl,
              description: rp.description,
              // synced_at'e DOKUNMA: içerik senkronu olmadı, yalnız metadata
              // tamamlandı — yazsaydık UI "az önce senkronlandı" derdi.
            },
            { onConflict: 'user_id,platform,platform_id' },
          )
        }
        continue
      }

      // Tek bir playlist'in item fetch'i 403/404 verirse (allowlist dışı,
      // silinmiş, gizli) o playlist'i ATLA — cron asla tek liste yüzünden ölmesin.
      let items: RemotePlaylistItem[]
      try {
        items = await fetchPlaylistItems(token, rp.spotifyId)
      } catch (exc) {
        if (exc instanceof SpotifyHttpError && [403, 404].includes(exc.status)) {
          void systemLog({
            operation: 'playlist_refresh',
            userId: uid,
            severity: 'warn',
            errorCode: `playlist_http_${exc.status}`,
            relatedId: rp.spotifyId,
            errorMessage: 'Playlist item fetch atlandı (erişilemez/silinmiş liste)',
          })
          skippedPlaylists += 1
          continue
        }
        throw exc // beklenmedik hata yukarı gitsin
      }

      const { data: upserted } = await supabase
        .from('playlists')
        .upsert(
          {
            user_id: uid,
            platform: 'spotify',
            platform_id: rp.spotifyId,
            name: rp.name,
            snapshot_id: rp.snapshotId,
            track_count: rp.trackCount,
            cover_url: rp.coverUrl,
            description: rp.description,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform,platform_id' },
        )
        .select('id')

      const playlistDbId = upserted?.[0]?.id ?? existing?.id
      if (playlistDbId) {
        // UNIQUE(playlist_id, position) — upsert yerine sil + yeniden ekle.
        await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistDbId)

        for (const item of items) {
          const trackId = await resolveOrCreateTrack(supabase, item)
          if (!trackId) continue
          await supabase.from('playlist_tracks').insert({
            playlist_id: playlistDbId,
            track_id: trackId,
            position: item.position,
            added_at: item.addedAt,
          })
        }
      }

      updated += 1
    }

    // Reconcile: Spotify'da artık olmayan (kullanıcının sildiği) playlist'leri
    // DB'den temizle. GÜVENLİK KAPILARI (körü körüne silmek canlı playlist'i
    // yok edebilir):
    //   1. meId alınamadıysa → sahiplik filtresi uygulanmadı, remote set
    //      güvenilmez → SİLME.
    //   2. remotePlaylists BOŞ döndüyse → API geçici arıza vermiş olabilir → SİLME.
    if (meId && filteredRemote.length > 0) {
      const staleIds = (existingRows ?? [])
        .map((p) => p.platform_id as string)
        .filter((pid) => !remotePlatformIds.has(pid))
      if (staleIds.length > 0) {
        const { error: deleteErr } = await supabase
          .from('playlists')
          .delete()
          .eq('user_id', uid)
          .eq('platform', 'spotify')
          .in('platform_id', staleIds)
        if (!deleteErr) {
          deleted += staleIds.length
          void systemLog({
            operation: 'playlist_refresh',
            userId: uid,
            severity: 'info',
            errorCode: 'stale_playlists_removed',
            errorMessage: `${staleIds.length} silinmiş playlist DB'den temizlendi`,
          })
        }
      }
    }
  }

  // Arıza/atlama sağlıklı raporlansın: token'sız kullanıcı varken hiç iş
  // yapılamadıysa 'error'; kısmi arıza/atlama varsa 'partial'. Atlanan
  // kullanıcı 'error' DEĞİL — sistem doğru çalışıyor, o kişi Spotify
  // tarafında erişilemez (allowlist).
  const outcome: PlaylistRefreshResult['outcome'] =
    errors > 0 && updated === 0
      ? 'error'
      : errors > 0 || skippedPlaylists > 0 || skippedUsers > 0
        ? 'partial'
        : 'success'

  return {
    outcome,
    playlistsUpdated: updated,
    playlistsDeleted: deleted,
    errors,
    skippedPlaylists,
    skippedUsers,
  }
}

/**
 * Kullanıcının Spotify hesap ID'sini /v1/me'den al (sahiplik filtresi için).
 * Başarısız olursa null döner — o durumda filtre uygulanmaz (güvenli taraf).
 */
async function fetchMeId(
  token: string,
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  let meId: string | null = null
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { id?: string }
    meId = data.id ?? null
  } catch {
    void systemLog({
      operation: 'playlist_refresh',
      userId,
      severity: 'warn',
      errorMessage: "Spotify /me alınamadı — sahiplik filtresi bu tur atlandı",
    })
    return null
  }

  if (meId) {
    // spotify_user_id boşsa değeri kaydet (her turda boşuna /v1/me atılmasın).
    await supabase
      .from('platform_connections')
      .update({ spotify_user_id: meId })
      .eq('user_id', userId)
      .eq('platform', 'spotify')
      .is('spotify_user_id', null)
  }

  return meId
}

/** Çöp guard'ı: title/artists/spotify_id boşsa insert etme. */
async function resolveOrCreateTrack(
  supabase: SupabaseClient,
  item: RemotePlaylistItem,
): Promise<string | null> {
  if (!item.spotifyId || !item.title || item.artists.length === 0) return null

  return resolveOrCreateTrackByIdentity(supabase, {
    spotifyId: item.spotifyId,
    isrc: item.isrc,
    title: item.title,
    artists: item.artists,
  })
}
