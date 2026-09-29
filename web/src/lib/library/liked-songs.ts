import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * A2 "Beğenilen Şarkılar" + A4 "Keşif kovaları" veri erişimi.
 * Plan: docs/plans/02-zip-verisi-urune-baglama.md → P1
 *
 * ⚠ Neden RPC, neden `.select()` değil (CLAUDE.md §4.3):
 * Beğenilen şarkılar canlıda **2.650 satır**. Supabase REST bu boyutta
 * sessizce kırpar — `.limit(100000)` yazmak bile kurtarmaz, yalnız en eski
 * kayıtlar döner ve hata VERMEZ. Sıralama + sayfalama DB tarafında
 * (`liked_songs_page`, migration 0176); istemci yalnız istediği sayfayı alır.
 */

export type LikedSort = 'liked_desc' | 'liked_asc' | 'plays_desc' | 'title_asc'

export interface LikedSong {
  trackId: string
  spotifyId: string | null
  title: string
  artistName: string
  imageUrl: string | null
  likedAt: string | null
  playCount: number
}

export interface LikedSongsPage {
  items: LikedSong[]
  /** Filtreye uyan TOPLAM satır — sayfalama bunu kullanır */
  total: number
}

interface LikedRow {
  track_id: string
  spotify_id: string | null
  title: string | null
  artist_name: string | null
  image_url: string | null
  liked_at: string | null
  play_count: number | null
  total_count: number | null
}

export async function getLikedSongsPage(
  userId: string,
  { limit = 50, offset = 0, sort = 'liked_desc' as LikedSort } = {},
): Promise<LikedSongsPage> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('liked_songs_page', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
    p_sort: sort,
  })

  if (error || !data) return { items: [], total: 0 }

  const rows = data as LikedRow[]
  return {
    // `total_count` her satırda aynı değeri taşır (ayrı COUNT turu olmasın diye).
    total: rows[0]?.total_count ?? 0,
    items: rows.map((r) => ({
      trackId: r.track_id,
      spotifyId: r.spotify_id,
      title: r.title ?? 'Bilinmeyen şarkı',
      artistName: r.artist_name ?? '',
      imageUrl: r.image_url,
      likedAt: r.liked_at,
      playCount: r.play_count ?? 0,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// A4 — Keşif kovaları
// ─────────────────────────────────────────────────────────────────────────────

export type DiscoveryBucket = 'overlooked' | 'dusty' | 'nostalgia'

export interface DiscoveryTrack extends LikedSong {
  lastPlayedAt: string | null
}

export interface DiscoveryPage {
  items: DiscoveryTrack[]
  total: number
}

/**
 * ⚠ Eşikler (min çalma / max çalma / bayatlık) RPC'de **parametre**, koda
 * gömülü değil. Sebep: plandaki eşikler tek kullanıcıdan kalibre edilmişti ve
 * 2026-08-02 ölçümünde üçü de saptı (1.271→218, 326→137, 1.500→1.549).
 * Sabitlenmiş bir sayı ikinci kullanıcı gelince sessizce yanlış olur.
 * Varsayılanları değiştirmeden önce **yeniden ölç**.
 */
export async function getDiscoveryBucket(
  userId: string,
  bucket: DiscoveryBucket,
  { limit = 50, offset = 0 } = {},
): Promise<DiscoveryPage> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('discovery_bucket_page', {
    p_user_id: userId,
    p_bucket: bucket,
    p_limit: limit,
    p_offset: offset,
  })

  if (error || !data) return { items: [], total: 0 }

  const rows = data as Array<LikedRow & { last_played_at: string | null }>
  return {
    total: rows[0]?.total_count ?? 0,
    items: rows.map((r) => ({
      trackId: r.track_id,
      spotifyId: r.spotify_id,
      title: r.title ?? 'Bilinmeyen şarkı',
      artistName: r.artist_name ?? '',
      imageUrl: r.image_url,
      likedAt: r.liked_at,
      playCount: r.play_count ?? 0,
      lastPlayedAt: r.last_played_at,
    })),
  }
}

/** Üç kovanın da toplam sayısı — sekme rozetleri için tek turda. */
export async function getDiscoveryCounts(
  userId: string,
): Promise<Record<DiscoveryBucket, number>> {
  const [overlooked, dusty, nostalgia] = await Promise.all([
    getDiscoveryBucket(userId, 'overlooked', { limit: 1 }),
    getDiscoveryBucket(userId, 'dusty', { limit: 1 }),
    getDiscoveryBucket(userId, 'nostalgia', { limit: 1 }),
  ])
  return {
    overlooked: overlooked.total,
    dusty: dusty.total,
    nostalgia: nostalgia.total,
  }
}
