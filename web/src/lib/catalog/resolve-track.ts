import 'server-only'
import type { createServiceClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createServiceClient>>

/**
 * Katalog kimliği çözümü — tek gerçek kaynak (2026-09-17).
 *
 * ★ KÖK NEDEN (Sahibin bulduğu bug): Spotify aynı kaydı (single + sonradan
 * albüme eklenen aynı şarkı) FARKLI `spotify_id`lerle sunuyor — ama ISRC
 * (International Standard Recording Code) ikisinde de AYNI, çünkü aynı ses
 * kaydı. Üç ayrı yerde ("recently played" senkronu, playlist tazeleme,
 * beğenilenler senkronu) track çözümlemesi yalnızca `spotify_id`'ye
 * bakıyordu — aynı şarkı farklı `spotify_id`lerle karşılaşınca HER SEFERİNDE
 * yeni bir `tracks` satırı açılıyor, dinleme sayıları o kadar parçaya
 * bölünüyordu (canlı örnek: Palaye Royale — "Songs For Sadness" 5 şarkılık
 * albüm, katalogda 12 satır olarak görünüyordu).
 *
 * Çözüm: `spotify_id` bulunamazsa, ISRC doluysa AYNI ISRC'li mevcut satırı
 * ara — varsa onun UUID'sini kullan, yeni satır AÇMA. Yeni `spotify_id` bu
 * satıra yazılmaz (constraint zaten `spotify_id` UNIQUE) — kanonik satırın
 * kendi `spotify_id`'si kalır, yeni varyant yalnızca play_events/
 * playlist_tracks üzerinden aynı UUID'ye bağlanır. Spotify'a geri yazarken
 * (playlist oluşturma vb.) kanonik `spotify_id` kullanılır — aynı ses kaydı
 * olduğu için sonuç kullanıcı için farksızdır.
 */

export interface TrackIdentity {
  spotifyId: string
  isrc?: string | null
  title: string
  artists: string[]
  durationMs?: number | null
  imageUrl?: string | null
  album?: string | null
}

/** `spotify_id` → yoksa `isrc` → yoksa yeni satır. UUID döner. */
export async function resolveOrCreateTrackByIdentity(
  supabase: SupabaseClient,
  identity: TrackIdentity,
): Promise<string | null> {
  if (!identity.spotifyId || !identity.title) return null

  const { data: bySpotifyId } = await supabase
    .from('tracks')
    .select('id, image_url')
    .eq('spotify_id', identity.spotifyId)
    .maybeSingle()

  if (bySpotifyId) {
    if (!bySpotifyId.image_url && identity.imageUrl) {
      void supabase.from('tracks').update({ image_url: identity.imageUrl }).eq('id', bySpotifyId.id)
    }
    return bySpotifyId.id as string
  }

  // Birleştirilmiş eski ID (0335, 2026-09-22): "B aslında A'dır" notu.
  // Canlı dinleme ISRC vermez; not olmadan B her gelişinde yeni satır açardı.
  const { data: byAlias } = await supabase
    .from('track_spotify_alias')
    .select('track_id')
    .eq('spotify_id', identity.spotifyId)
    .maybeSingle()
  if (byAlias) return byAlias.track_id

  if (identity.isrc) {
    const { data: byIsrc } = await supabase
      .from('tracks')
      .select('id')
      .eq('isrc', identity.isrc)
      .limit(1)
      .maybeSingle()
    if (byIsrc) {
      // Bu varyantı not et: aynı ID bir dahaki sefere ISRC'siz gelirse (canlı
      // dinleme, ZIP) de doğru şarkıya bağlansın. Hata dönerse akış bozulmaz
      // (sonuç yok sayılır). `await` ŞART: PostgREST sorgusu `then` çağrılmadan
      // hiç gönderilmez — `void` ile bırakılsa bu satır hiç çalışmazdı.
      await supabase
        .from('track_spotify_alias')
        .upsert(
          { spotify_id: identity.spotifyId, track_id: byIsrc.id as string, kaynak: 'isrc' },
          { onConflict: 'spotify_id', ignoreDuplicates: true },
        )
      return byIsrc.id as string
    }
  }

  const { data: inserted, error } = await supabase
    .from('tracks')
    .insert({
      spotify_id: identity.spotifyId,
      isrc: identity.isrc ?? null,
      title: identity.title,
      artists: identity.artists,
      duration_ms: identity.durationMs ?? null,
      image_url: identity.imageUrl ?? null,
      album: identity.album ?? null,
    })
    .select('id')
    .maybeSingle()

  if (!error && inserted) return inserted.id as string

  // INSERT çakışması — eşzamanlı bir istek aynı spotify_id'yi araya ekledi.
  const { data: retry } = await supabase
    .from('tracks')
    .select('id')
    .eq('spotify_id', identity.spotifyId)
    .maybeSingle()
  return (retry?.id as string) ?? null
}
