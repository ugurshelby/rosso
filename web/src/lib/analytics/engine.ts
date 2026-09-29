import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { refreshUserCorePackages } from '@/lib/services/user-packages-refresh'
import { normalizeArtistName } from '@/lib/catalog/normalize-artist-name'

// ---------------------------------------------------------------------------
// Period types & date range helper
// ---------------------------------------------------------------------------

export type Period = 'week' | 'month' | 'year' | 'alltime'

/**
 * P0.6 — Dinleme kaynağı süzgeci (`play_events.source`).
 *
 * `undefined` = süzgeç yok, tüm kaynaklar (Faz 3/4 davranışı; bu modülün
 * bugüne kadarki tek davranışı, geriye dönük uyumlu).
 * `'api_realtime'` = yalnız canlı Spotify API verisi → **Faz 2**.
 *
 * Faz 2'de bu süzgeç ZORUNLU: aksi hâlde ZIP'ten gelen `spotify_export`
 * satırları da sayılır ve kullanıcı "geçmişim yükledim" sanır (Sahibin
 * 2026-07-30 tespiti). Faz eşlemesi: `src/lib/phase/read.ts` → `sourceFilter()`.
 */
export type SourceFilter = 'api_realtime'

export interface DateRange {
  from: Date | null
  to: Date
}

export function getDateRange(period: Period): DateRange {
  const to = new Date()
  if (period === 'alltime') {
    return { from: null, to }
  }
  const from = new Date(to)
  if (period === 'week') {
    from.setUTCDate(from.getUTCDate() - 7)
  } else if (period === 'month') {
    from.setUTCMonth(from.getUTCMonth() - 1)
  } else {
    // year
    from.setUTCFullYear(from.getUTCFullYear() - 1)
  }
  return { from, to }
}

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface TopTrack {
  track_id: string | null
  raw_track_name: string | null
  raw_artist_name: string | null
  play_count: number
  total_ms: number
  skip_count: number
  /**
   * Kapak URL'i — PAKETTEN gelir (migration 0214, plan 08).
   *
   * Doluysa `CoverArt src=` yoluna girer: observer kurulmaz, `/api/images/…`
   * isteği ATILMAZ, kapak ilk render'da basılır. `null` ise bileşen eski lazy
   * yola düşer (davranış korunur) — yani alan boş kalsa da hiçbir şey kırılmaz.
   *
   * ⚠ Yalnız `alltime` (paket) yolunda dolar; hafta/ay/yıl RPC'den gelir ve
   * orada görsel taşınmaz — o pencerelerde lazy yol geçerlidir.
   */
  image_url?: string | null
}

export interface TopArtist {
  artist_name: string
  play_count: number
  total_ms: number
  /** Sanatçı görseli — paketten (bkz. TopTrack.image_url). */
  image_url?: string | null
}

export interface ListeningTimeSummary {
  total_ms: number
  total_tracks: number
  total_artists: number
  total_playlists: number
}

export interface HourlyPattern {
  hour: number // 0-23
  play_count: number
  total_ms: number
}

export interface WeekdayPattern {
  weekday: number // 0=Sunday, 6=Saturday
  play_count: number
  total_ms: number
}

export interface PlatformBreakdown {
  source: string
  play_count: number
  percentage: number
}

export interface ObsessionTrack extends TopTrack {
  streak_days: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildEmptyHours(): HourlyPattern[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    play_count: 0,
    total_ms: 0,
  }))
}

function buildEmptyWeekdays(): WeekdayPattern[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    play_count: 0,
    total_ms: 0,
  }))
}

// ---------------------------------------------------------------------------
// getTopTracks
// ---------------------------------------------------------------------------

/**
 * `user_period_pkg` okuması (migration 0167). Paket yoksa `null`.
 *
 * ⚠ YALNIZ `alltime` + tam geçmiş. Ölçüm (2026-07-31) maliyetin tek pencerede
 * toplandığını gösterdi: hafta 6 ms · ay 55 ms · yıl 43 ms · **alltime 2211 ms**.
 * Dar pencerelerde tarih indeksi satırları önce kesiyor.
 *
 * Sahibin kararı: hafta/ay/yıl RPC'de kalır — zaten hızlılar VE sık
 * değişiyorlar; paketlenselerdi kullanıcı dün dinlediğini bugün "bu hafta"da
 * göremezdi (yanlış olurdu, yalnız yavaş değil).
 */
async function getPeriodPackage(userId: string): Promise<{
  summary: ListeningTimeSummary
  topTracks: TopTrack[]
  topArtists: TopArtist[]
} | null> {
  try {
    const supabase = await createClient()
    // NOT: tablo migration 0167 ile eklendi; üretilmiş tip dosyası henüz
    // tanımıyor — diğer paket okumalarıyla aynı desen.
    const { data, error } = await (
      supabase.from as unknown as (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: unknown) => {
            maybeSingle: () => Promise<{
              data: {
                payload: {
                  summary?: {
                    total_ms?: number | string
                    total_tracks?: number | string
                    total_artists?: number | string
                  }
                  top_tracks?: Array<{
                    track_id: string | null
                    title: string | null
                    artist_name: string | null
                    play_count: number | string
                    total_ms: number | string
                    skip_count: number | string
                    // Migration 0214 (plan 08): kapak paketin alanı.
                    // Eski paketlerde YOK → `?` ile opsiyonel; cron bir sonraki
                    // turda üzerine yazar.
                    image_url?: string | null
                  }>
                  top_artists?: Array<{
                    artist_name: string
                    play_count: number | string
                    total_ms: number | string
                    image_url?: string | null
                  }>
                }
              } | null
              error: unknown
            }>
          }
        }
      }
    )('user_period_pkg')
      .select('payload')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null // paket YOK → "hazırlanıyor"

    const s = data.payload.summary ?? {}
    return {
      summary: {
        total_ms: Number(s.total_ms ?? 0),
        total_tracks: Number(s.total_tracks ?? 0),
        total_artists: Number(s.total_artists ?? 0),
        total_playlists: 0, // RPC yolu da her zaman 0 döndürüyor
      },
      // Paket top-50 tutar (§12.4); çağıran `limit` kadarını alır.
      topTracks: (data.payload.top_tracks ?? []).map((row) => ({
        track_id: row.track_id ?? null,
        raw_track_name: row.title ?? null,
        raw_artist_name: row.artist_name ?? null,
        play_count: Number(row.play_count),
        total_ms: Number(row.total_ms),
        skip_count: Number(row.skip_count),
        // Paketten gelen kapak → UI `src=` yoluna girer, istek atılmaz.
        image_url: row.image_url ?? null,
      })),
      topArtists: (data.payload.top_artists ?? []).map((row) => ({
        artist_name: row.artist_name,
        play_count: Number(row.play_count),
        total_ms: Number(row.total_ms),
        image_url: row.image_url ?? null,
      })),
    }
  } catch (err) {
    console.error('[analytics] getPeriodPackage başarısız — paket yok sayıldı:', err)
    return null
  }
}

/**
 * ⚠ 2026-07-31 (paket #5): `alltime` + tam geçmiş yolu `user_period_pkg`'den
 * okunuyor (0167) — 2211 ms → 0,012 ms. Diğer dönemler ve Faz 2 RPC'de kalır.
 *
 * Paket yoksa **boş dizi** döner (canlı hesaba düşmez, §12.4-A). Çağıran zaten
 * boş listeyi gizliyor; "hazırlanıyor" mesajı StatBar'ın altında tek yerde
 * gösteriliyor (`packageMissing`, paket #4).
 */
export async function getTopTracks(
  userId: string,
  period: Period,
  limit = 5,
  source?: SourceFilter
): Promise<TopTrack[]> {
  if (period === 'alltime' && !source) {
    const pkg = await getPeriodPackage(userId)
    if (!pkg) return []
    const list = pkg.topTracks.slice(0, limit)
    const missingIds = list
      .filter((t) => !t.image_url && t.track_id)
      .map((t) => t.track_id as string)

    if (missingIds.length > 0) {
      try {
        const supabase = await createClient()
        const { data: trackImages } = await supabase
          .from('tracks')
          .select('id, image_url')
          .in('id', missingIds)
        if (trackImages && trackImages.length > 0) {
          const map = new Map(trackImages.map((t) => [t.id, t.image_url]))
          return list.map((t) => ({
            ...t,
            image_url: t.image_url || (t.track_id ? map.get(t.track_id) ?? null : null),
          }))
        }
      } catch {
        // non-blocking fallback
      }
    }
    return list
  }

  try {
    const supabase = await createClient()
    const range = getDateRange(period)

    const { data, error } = await supabase.rpc('recap_top_tracks', {
      p_user_id: userId,
      p_from: range.from?.toISOString() ?? undefined,
      p_to: range.to.toISOString(),
      p_limit: limit,
      p_source: source,
    })

    if (error || !data) return []

    // Yeni şema: RPC `title`/`artist_name` döndürür (eski `raw_track_name` kaldırıldı).
    // UI sözleşmesi raw_track_name/raw_artist_name bekliyor → burada map ederiz.
    const rows = data as Array<{
      track_id: string | null
      title: string | null
      artist_name: string | null
      play_count: number
      total_ms: number
      skip_count: number
    }>

    const trackIds = rows.map((r) => r.track_id).filter((id): id is string => id !== null)
    const imageMap = new Map<string, string>()
    if (trackIds.length > 0) {
      const { data: trackImages } = await supabase.from('tracks').select('id, image_url').in('id', trackIds)
      if (trackImages) {
        trackImages.forEach(t => {
          if (t.image_url) imageMap.set(t.id, t.image_url)
        })
      }
    }

    return rows.map((row) => ({
      track_id: row.track_id ?? null,
      raw_track_name: row.title ?? null,
      raw_artist_name: row.artist_name ?? null,
      play_count: Number(row.play_count),
      total_ms: Number(row.total_ms),
      skip_count: Number(row.skip_count),
      image_url: row.track_id ? (imageMap.get(row.track_id) ?? null) : null,
    }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getTopTracks başarısız — boş/varsayılan veri döndü:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// getTopArtists
// ---------------------------------------------------------------------------

/**
 * ⚠ 2026-07-31 (paket #5): `alltime` + tam geçmiş yolu pakete geçti (0167) —
 * 1424 ms → 0,012 ms. Dar pencerelerde RPC zaten 133 ms, orada kalıyor.
 */
export async function getTopArtists(
  userId: string,
  period: Period,
  limit = 5,
  source?: SourceFilter
): Promise<TopArtist[]> {
  if (period === 'alltime' && !source) {
    const pkg = await getPeriodPackage(userId)
    if (!pkg) return []
    const list = pkg.topArtists.slice(0, limit)
    const missingNames = list
      .filter((a) => !a.image_url && a.artist_name)
      .map((a) => normalizeArtistName(a.artist_name))

    if (missingNames.length > 0) {
      try {
        const supabase = await createClient()
        const { data: artistImages } = await supabase
          .from('artists')
          .select('name_normalized, image_url')
          .in('name_normalized', missingNames)
        if (artistImages && artistImages.length > 0) {
          const map = new Map(artistImages.map((a) => [a.name_normalized, a.image_url]))
          return list.map((a) => ({
            ...a,
            image_url: a.image_url || map.get(normalizeArtistName(a.artist_name)) || null,
          }))
        }
      } catch {
        // non-blocking fallback
      }
    }
    return list
  }

  try {
    const supabase = await createClient()
    const range = getDateRange(period)

    const { data, error } = await supabase.rpc('recap_top_artists', {
      p_user_id: userId,
      p_from: range.from?.toISOString() ?? undefined,
      p_to: range.to.toISOString(),
      p_limit: limit,
      p_source: source,
    })

    if (error || !data) return []

    const rows = data as Array<{ artist_name: string; play_count: number; total_ms: number; image_url?: string | null }>
    
    const names = rows.map(r => normalizeArtistName(r.artist_name))
    const imageMap = new Map<string, string>()
    if (names.length > 0) {
      const { data: artistImages } = await supabase.from('artists').select('name_normalized, image_url').in('name_normalized', names)
      if (artistImages) {
        artistImages.forEach(a => {
          if (a.image_url) imageMap.set(a.name_normalized, a.image_url)
        })
      }
    }

    return rows.map((row) => ({
      artist_name: row.artist_name,
      play_count: Number(row.play_count),
      total_ms: Number(row.total_ms),
      image_url: imageMap.get(normalizeArtistName(row.artist_name)) ?? row.image_url ?? null,
    }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getTopArtists başarısız — boş/varsayılan veri döndü:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// getTotalListeningTime
// ---------------------------------------------------------------------------

/**
 * ⚠ 2026-07-31 (paket #5): `alltime` + tam geçmiş yolu pakete geçti (0167).
 * Bu RPC alltime'da zaten önbellekli (17 ms) — pakete alınma sebebi hız değil,
 * **tek okuma**: aynı bölüm top listelerle birlikte çiziliyor, ayrı bırakmak
 * ikinci bir tur demekti.
 */
export async function getTotalListeningTime(
  userId: string,
  period: Period,
  source?: SourceFilter
): Promise<ListeningTimeSummary> {
  const zero: ListeningTimeSummary = {
    total_ms: 0,
    total_tracks: 0,
    total_artists: 0,
    total_playlists: 0,
  }

  if (period === 'alltime' && !source) {
    const pkg = await getPeriodPackage(userId)
    return pkg ? pkg.summary : zero
  }

  try {
    const supabase = await createClient()
    const range = getDateRange(period)

    const { data, error } = await supabase.rpc('recap_listening_summary', {
      p_user_id: userId,
      p_from: range.from?.toISOString() ?? undefined,
      p_to: range.to.toISOString(),
      p_source: source,
    })

    if (error || !data || data.length === 0) return zero

    const row = data[0]
    return {
      total_ms: Number(row.total_ms),
      total_tracks: Number(row.total_tracks),
      total_artists: Number(row.total_artists),
      total_playlists: 0,
    }
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getTotalListeningTime başarısız — boş/varsayılan veri döndü:', err)
    return zero
  }
}

// ---------------------------------------------------------------------------
// getPatternPackage — user_pattern_pkg (migration 0163, Aşama 3 · paket #3)
// ---------------------------------------------------------------------------

export interface PatternPackage {
  hourly: HourlyPattern[]
  platforms: PlatformBreakdown[]
  generatedAt: string
}

/**
 * Saatlik dağılım + platform donut — TEK `select` (`user_pattern_pkg`, 0163).
 *
 * ÖNCESİ: iki ayrı RPC, `recap_hourly_pattern` 126 ms + `recap_platform_breakdown`
 * 61 ms (kimlikli `EXPLAIN ANALYZE`, buffer 4617).
 * SONRASI: 0,016 ms · buffer 2 · `Index Scan` (ölçüldü).
 *
 * ⚠ YALNIZ 'alltime'. Kaynak RPC'ler dönem parametresi alıyor ama paket tek
 * satır (`user` anahtarı). Dönemli çağrılar (`/api/analytics/*`, mobil) RPC'de
 * KALIR — paketlemek 4 dönem × kullanıcı = 4 kat gece yükü demekti (0163 notu).
 *
 * `null` dönerse paket henüz üretilmemiş → çağıran *"hazırlanıyor"* göstermeli,
 * **canlı hesaba düşmemeli** (§12.4-A bağlayıcı kuralı). Eski yolu yedek
 * bırakmak 126 ms'yi EN KÖTÜ ANDA (ilk ziyaret) geri getirirdi.
 */
export async function getPatternPackage(
  userId: string
): Promise<PatternPackage | null> {
  try {
    const supabase = await createClient()
    // NOT: tablo migration 0163 ile eklendi; üretilmiş tip dosyası henüz
    // tanımıyor — `getTastePackage` (identity.ts) ile aynı desen.
    const { data, error } = await (
      supabase.from as unknown as (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: unknown) => {
            maybeSingle: () => Promise<{
              data: {
                payload: {
                  hourly?: Array<{ hour: number; play_count: number; total_ms: number }>
                  platforms?: Array<{ source: string; play_count: number; percentage: number }>
                }
                generated_at: string
              } | null
              error: unknown
            }>
          }
        }
      }
    )('user_pattern_pkg')
      .select('payload, generated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      void refreshUserCorePackages(userId)
      return null // paket YOK → "hazırlanıyor"
    }

    if (data.generated_at && Date.now() - new Date(data.generated_at).getTime() > 20 * 3600 * 1000) {
      void refreshUserCorePackages(userId)
    }

    return {
      // Sayı dönüşümü RPC yoluyla AYNI: jsonb sayıları JS'e number gelir ama
      // bigint alanlar string olabilir — iki yol ayrışmasın diye Number() aynen.
      hourly: (data.payload.hourly ?? []).map((row) => ({
        hour: Number(row.hour),
        play_count: Number(row.play_count),
        total_ms: Number(row.total_ms),
      })),
      platforms: (data.payload.platforms ?? []).map((row) => ({
        source: row.source,
        play_count: Number(row.play_count),
        percentage: Number(row.percentage),
      })),
      generatedAt: data.generated_at,
    }
  } catch (err) {
    // Okuma hatası da "paket yok" sayılır — canlı hesaba düşmeyiz.
    console.error('[analytics] getPatternPackage başarısız — paket yok sayıldı:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// getHourlyPattern — always returns 24 entries
// ---------------------------------------------------------------------------

/**
 * ⚠ 2026-07-31 (Aşama 3): Dashboard `insights-row` artık bunu ÇAĞIRMIYOR —
 * `getPatternPackage` kullanıyor. Bu fonksiyon **paket üreticisinin** dayandığı
 * RPC'yi sarmalıyor ve dönemli çağrılar (`/api/analytics/listening-pattern`,
 * `/api/analytics/recap` — mobil) için duruyor.
 * Silmeden önce `grep` ile tüm çağıranlar aranmalı (§12.3).
 */
export async function getHourlyPattern(
  userId: string,
  period: Period
): Promise<HourlyPattern[]> {
  try {
    const supabase = await createClient()
    const range = getDateRange(period)

    const { data, error } = await supabase.rpc('recap_hourly_pattern', {
      p_user_id: userId,
      p_from: range.from?.toISOString() ?? undefined,
      p_to: range.to.toISOString(),
    })

    if (error || !data) return buildEmptyHours()

    return (data as Array<{ hour: number; play_count: number; total_ms: number }>).map((row) => ({
      hour: row.hour,
      play_count: Number(row.play_count),
      total_ms: Number(row.total_ms),
    }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getHourlyPattern başarısız — boş/varsayılan veri döndü:', err)
    return buildEmptyHours()
  }
}

// ---------------------------------------------------------------------------
// getWeekdayPattern
// ---------------------------------------------------------------------------

export async function getWeekdayPattern(
  userId: string,
  period: Period
): Promise<WeekdayPattern[]> {
  try {
    const supabase = await createClient()
    const range = getDateRange(period)

    // 0106: DB tarafında toplama (Europe/Istanbul, 0=Pazar) — eski sayfalama
    // PostgREST 1000-satır tavanına takılıp ilk 1000 kaydı analiz ediyordu (§1.65).
    const { data, error } = await supabase.rpc('user_weekday_pattern', {
      p_user_id: userId,
      p_from: range.from !== null ? range.from.toISOString() : undefined,
      p_to: range.to.toISOString(),
    })

    if (error || !data || data.length === 0) return buildEmptyWeekdays()

    const weekdayMap = new Map<number, { play_count: number; total_ms: number }>()
    for (const row of data) {
      weekdayMap.set(row.weekday, {
        play_count: Number(row.play_count),
        total_ms: Number(row.total_ms),
      })
    }

    return Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      play_count: weekdayMap.get(weekday)?.play_count ?? 0,
      total_ms: weekdayMap.get(weekday)?.total_ms ?? 0,
    }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getWeekdayPattern başarısız — boş/varsayılan veri döndü:', err)
    return buildEmptyWeekdays()
  }
}

// ---------------------------------------------------------------------------
// getMostSkippedTracks
// ---------------------------------------------------------------------------

export async function getMostSkippedTracks(
  userId: string,
  period: Period,
  limit = 5
): Promise<TopTrack[]> {
  try {
    const supabase = await createClient()
    const range = getDateRange(period)

    // 0110: DB tarafında toplama — eski limitsiz select, 37k skip olayında
    // PostgREST'in 1000-satır tavanına takılıp top-5'i rastgele bir alt-kümeden
    // hesaplıyordu (§1.65 sınıfı).
    const { data, error } = await supabase.rpc('user_most_skipped', {
      p_user_id: userId,
      p_from: range.from !== null ? range.from.toISOString() : undefined,
      p_to: range.to.toISOString(),
      p_limit: limit,
    })

    if (error || !data) return []

    return data.map((row) => ({
      track_id: row.track_id,
      raw_track_name: row.title,
      raw_artist_name: row.artist_name,
      play_count: Number(row.skip_count),
      total_ms: Number(row.total_ms),
      skip_count: Number(row.skip_count),
    }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getMostSkippedTracks başarısız — boş/varsayılan veri döndü:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// getObsessionTracks
// ---------------------------------------------------------------------------

export async function getObsessionTracks(
  userId: string,
  period: Period,
  limit = 5
): Promise<ObsessionTrack[]> {
  try {
    const tracks = await getTopTracks(userId, period, 50)
    return tracks
      .filter((t) => t.play_count >= 10)
      .slice(0, limit)
      .map((t) => ({ ...t, streak_days: 0 }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getObsessionTracks başarısız — boş/varsayılan veri döndü:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// getDashboardStats — all-time summary for dashboard homepage
// ---------------------------------------------------------------------------

export interface GenreCount {
  genre: string
  count: number
}

export interface DashboardStats {
  uniqueTracks: number
  uniqueArtists: number
  favoriteGenre: string | null
  /** Tüm zamanlar tür dağılımı, en çoktan aza — favoriteGenre = topGenres[0].
   *  Sahibin notu (2026-07-17): "favori tür" tekil değeri "8000 track,
   *  2566 sanatçı dinledim ama tür sayısını göremiyorum" hissi veriyordu. */
  topGenres: GenreCount[]
  totalMinutes: number
  /**
   * Paket (`user_stats_pkg`) henüz üretilmemiş — sayılar SIFIR değil, BİLİNMİYOR.
   * Çağıran "hazırlanıyor" göstermeli; sıfırları gerçek değer sanıp
   * "hiç şarkı dinlememişsin" dememeli (§12.4-A).
   * Faz 2 (RPC) yolunda her zaman `false`.
   */
  packageMissing?: boolean
}

/**
 * `user_stats_pkg` okuması (migration 0165). Paket yoksa `null`.
 *
 * Üretici `recap_listening_summary` + `user_genre_primary_counts` RPC'lerini
 * ÇAĞIRIR (mantığı kopyalamaz) — sayım kuralları tek yerde kalır, paket ile
 * sayfa asla ayrışmaz.
 */
async function getStatsPackage(userId: string): Promise<DashboardStats | null> {
  try {
    const supabase = await createClient()
    // NOT: tablo migration 0165 ile eklendi; üretilmiş tip dosyası henüz
    // tanımıyor — `getPatternPackage`/`getTastePackage` ile aynı desen.
    const { data, error } = await (
      supabase.from as unknown as (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: unknown) => {
            maybeSingle: () => Promise<{
              data: {
                payload: {
                  unique_tracks?: number | string
                  unique_artists?: number | string
                  total_ms?: number | string
                  genres?: Array<{ genre: string; play_count: number | string }>
                }
              } | null
              error: unknown
            }>
          }
        }
      }
    )('user_stats_pkg')
      .select('payload, generated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      void refreshUserCorePackages(userId)
      return null // paket YOK → "hazırlanıyor"
    }

    const genAt = (data as { generated_at?: string }).generated_at
    if (genAt && Date.now() - new Date(genAt).getTime() > 20 * 3600 * 1000) {
      void refreshUserCorePackages(userId)
    }

    // Sayı dönüşümü RPC yoluyla AYNI: jsonb bigint alanları string gelebilir.
    const topGenres: GenreCount[] = (data.payload.genres ?? []).map((r) => ({
      genre: r.genre,
      count: Number(r.play_count),
    }))

    return {
      uniqueTracks: Number(data.payload.unique_tracks ?? 0),
      uniqueArtists: Number(data.payload.unique_artists ?? 0),
      favoriteGenre: topGenres[0]?.genre ?? null,
      topGenres,
      totalMinutes: Math.round(Number(data.payload.total_ms ?? 0) / 60000),
    }
  } catch (err) {
    console.error('[analytics] getStatsPackage başarısız — paket yok sayıldı:', err)
    return null
  }
}

/**
 * Dashboard StatBar (dört kutu) + Profil tür haritası.
 *
 * 2026-07-31 (Aşama 3 · paket #4): Faz 3+ yolu `user_stats_pkg`'den okunuyor
 * (migration 0165) — 121–1276 ms → **0,015 ms** (buffer 2, `Index Scan`).
 *
 * ⚠ Faz 2 (`source='api_realtime'`) BİLİNÇLİ olarak RPC yolunda kaldı.
 * Ölçüldü: o pencere ~20 gün ve küçük (411 şarkı, 109 ms) — orada RPC zaten
 * ucuz, üstelik veri günde 60–180 satır büyüdüğü için paketlense bile sürekli
 * bayatlardı. `user × source` anahtarı gece yükünü 2 kat artırırdı; Sahibin
 * kararı: *"karmaşıklaşmasın, hızlansın."*
 *
 * Dallanma bilinçli olarak BURADA — çağıran (`dashboard/page.tsx`) hiç
 * değişmiyor, tek satır bile eklenmiyor.
 *
 * ⚠ `null` DÖNMÜYOR: paket yoksa RPC'ye düşmek yerine `packageMissing: true`
 * ile döner — çağıran *"hazırlanıyor"* gösterir (§12.4-A bağlayıcı kuralı).
 */
export async function getDashboardStats(
  userId: string,
  source?: SourceFilter
): Promise<DashboardStats> {
  const empty: DashboardStats = {
    uniqueTracks: 0,
    uniqueArtists: 0,
    favoriteGenre: null,
    topGenres: [],
    totalMinutes: 0,
  }

  // Faz 3+ (tam geçmiş) → paket yolu. Faz 2 aşağıdaki RPC yolunda devam eder.
  if (!source) {
    const pkg = await getStatsPackage(userId)
    if (pkg) return pkg
    // Paket yok → "hazırlanıyor". Canlı hesaba DÜŞMÜYORUZ: eski yolu yedek
    // bırakmak 1276 ms'yi EN KÖTÜ ANDA (ilk ziyaret) geri getirirdi.
    return { ...empty, packageMissing: true }
  }

  try {
    const supabase = await createClient()

    // İki RPC birbirinden bağımsız → paralel çekilir (2026-07-28 performans turu).
    // Eskiden seri await'leniyordu (summary → sonra genre), iki ağ turu peş peşe.
    //   • recap_listening_summary: özet sayımlar (IDOR-korumalı, tracks JOIN içeride).
    //   • user_genre_primary_counts (0106): DB tarafında birincil-tür toplaması
    //     (§1.65: eski sayfalama 1000-satır tavanı yüzünden ilk 1000 olayı sayıyordu).
    // Favori tür KULLANICININ dinlediklerinden gelir (global katalogdan değil →
    // çok kullanıcıda başkalarının müziğiyle kirlenmez).
    //
    // P0.6: `p_source` verildiğinde (Faz 2) yalnız canlı API verisi sayılır.
    // ⚠ `recap_listening_summary` p_from=NULL iken ÖNBELLEKTEN okur; önbellek tüm
    // kaynakları topluyor. Migration 0151 bu yüzden p_source verildiğinde
    // önbelleği ATLAR — yoksa Faz 2'ye ZIP toplamı dönerdi.
    const [summaryResp, genreResp] = await Promise.all([
      supabase.rpc('recap_listening_summary', {
        p_user_id: userId,
        p_from: undefined,
        p_to: new Date().toISOString(),
        p_source: source,
      }),
      supabase.rpc('user_genre_primary_counts', {
        p_user_id: userId,
        p_source: source,
      }),
    ])

    const summary = summaryResp.data?.[0]
    if (!summary) return empty

    // Favori tür = en çok dinlenen (topGenres[0]); tüm dağılım da döndürülür.
    let favoriteGenre: string | null = null
    let topGenres: GenreCount[] = []
    if (!genreResp.error && genreResp.data) {
      topGenres = genreResp.data.map((r) => ({
        genre: r.genre,
        count: Number(r.play_count),
      }))
      favoriteGenre = topGenres[0]?.genre ?? null
    }

    return {
      uniqueTracks: Number(summary.total_tracks),
      uniqueArtists: Number(summary.total_artists),
      favoriteGenre,
      topGenres,
      totalMinutes: Math.round(Number(summary.total_ms) / 60000),
    }
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    // ⚠ Burası Faz 2'nin RPC yolu — `packageMissing` KOYULMAZ. O bayrak
    // "paket henüz üretilmedi" demek; buradaki hata RPC hatası ve Faz 2'nin
    // paketi zaten yok. Karıştırılırsa Faz 2 kullanıcısı sonsuza dek
    // "hazırlanıyor" görür, çünkü onun paketi hiç üretilmeyecek.
    console.error('[analytics] getDashboardStats başarısız — boş/varsayılan veri döndü:', err)
    return empty
  }
}

// ---------------------------------------------------------------------------
// getRecentActivity — last N play events for dashboard feed
// ---------------------------------------------------------------------------

export interface RecentPlay {
  track_id: string | null
  raw_track_name: string | null
  raw_artist_name: string | null
  played_at: string
  source: string | null
  /**
   * Kapak — `tracks` JOIN'inden gelir (plan 08). Doluysa `CoverArt src=` yolu
   * devreye girer ve istek atılmaz; `null` ise eski lazy yol çalışır.
   *
   * "Güncelle"ye basıldığında hiç kaydedilmemiş bir şarkı gelebilir; o zaman
   * `null` döner, lazy yol onu çeker ve DB'ye yazar — bir sonraki açılışta
   * buradan hazır gelir.
   */
  image_url?: string | null
}

export async function getRecentActivity(
  userId: string,
  limit = 3,
  source?: SourceFilter
): Promise<RecentPlay[]> {
  try {
    const supabase = await createClient()
    // Yeni şema: isim/sanatçı tracks JOIN'inden gelir (raw_* kaldırıldı).
    // track_id de alınır → dashboard'da gerçek kapak görseli çekmek için.
    //
    // P0.6: Faz 2'de `source='api_realtime'` süzgeci uygulanır. Burada RPC yok,
    // doğrudan tablo okunuyor → süzgeç `.eq()` ile eklenir.
    // `image_url` de JOIN'den gelir (plan 08): zaten `tracks` okunuyordu, tek
    // kolon eklemek ek sorgu DEĞİL — ama dashboard'daki 5 kapak için atılan
    // `/api/images/track/{id}` isteklerini tamamen kaldırır.
    let query = supabase
      .from('play_events')
      .select('played_at, source, track_id, tracks(title, artists, image_url)')
      .eq('user_id', userId)

    if (source) query = query.eq('source', source)

    const { data, error } = await query
      .order('played_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    type RecentRow = {
      played_at: string
      source: string | null
      track_id: string | null
      tracks: {
        title: string | null
        artists: string[] | null
        image_url: string | null
      } | null
    }

    return (data as unknown as RecentRow[]).map((row) => ({
      track_id: row.track_id,
      raw_track_name: row.tracks?.title ?? null,
      raw_artist_name: row.tracks?.artists?.[0] ?? null,
      played_at: row.played_at,
      source: row.source,
      image_url: row.tracks?.image_url ?? null,
    }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getRecentActivity başarısız — boş/varsayılan veri döndü:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// getPlatformBreakdown
// ---------------------------------------------------------------------------

/**
 * ⚠ 2026-07-31 (Aşama 3): Dashboard `insights-row` artık bunu ÇAĞIRMIYOR —
 * `getPatternPackage` kullanıyor. Paket üreticisinin dayandığı RPC budur ve
 * dönemli çağrılar (`/api/analytics/recap` — mobil) için duruyor (§12.3).
 */
export async function getPlatformBreakdown(
  userId: string,
  period: Period
): Promise<PlatformBreakdown[]> {
  try {
    const supabase = await createClient()
    const range = getDateRange(period)

    const { data, error } = await supabase.rpc('recap_platform_breakdown', {
      p_user_id: userId,
      p_from: range.from?.toISOString() ?? undefined,
      p_to: range.to.toISOString(),
    })

    if (error || !data) return []

    return (data as Array<{ source: string; play_count: number; percentage: number }>).map((row) => ({
      source: row.source,
      play_count: Number(row.play_count),
      percentage: Number(row.percentage),
    }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] getPlatformBreakdown başarısız — boş/varsayılan veri döndü:', err)
    return []
  }
}
