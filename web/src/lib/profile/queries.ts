import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getDateRange, getDashboardStats } from '@/lib/analytics/engine'
import { getTastePackage } from '@/lib/analytics/identity'

/** Çağıranın verdiği istemci (servis ya da oturum) — ikisi de aynı tipli Supabase istemcisi. */
type Db = Awaited<ReturnType<typeof createClient>>

/**
 * Kişisel dinleme özetleri (Taste sayfasının "rakamlar" bölümü: seri, keşif skoru).
 * V2 (2026-09-25): eski profil sayfasının veri katmanından yalnız hâlâ kullanılan üç
 * sorgu kaldı; profil/sosyal sorguları silindi (etiket `sosyal-son`'da durur).
 * Tüm sorgular RLS-aktif kullanıcı client'ı kullanır; hata durumunda boş/sıfır
 * döner (sayfa asla patlamaz — servis izolasyonu).
 */

export interface ListeningStats {
  /** Bu ay toplam dinleme dakikası. */
  minutesThisMonth: number
  /** Vault: farklı şarkı sayısı (tüm zamanlar). */
  vaultTracks: number
  /** Gece yarısı sonrası (00:00–05:00) dinleme yüzdesi. */
  afterMidnightPct: number
}

export interface GenreSlice {
  genre: string
  /** 0–100 normalize edilmiş pay. */
  pct: number
}

export interface Streak {
  longestDays: number
  /** Şu an devam eden ardışık gün sayısı — bugün veya dün dinlenmişse geriye
   *  doğru sayılır (bugün henüz dinlenmediyse seri "kırılmış" sayılmaz, çünkü
   *  gün henüz bitmedi). 2026-07-17, Sahip: "sadece en uzun seri değil, şu an
   *  kaçıncı gündeyim de görmek istiyorum." */
  currentDays: number
}

// ---------------------------------------------------------------------------
// getListeningStats — mini stat strip
// ---------------------------------------------------------------------------
// 0106: tüm all-time/dönemsel taramalar DB tarafında toplayan RPC'lere taşındı.
// Eski fetchAllPlayedAt sayfalaması PAGE_SIZE=10000 kullandığı için PostgREST'in
// 1000-satır tavanında ilk turda duruyor, verinin %99'unu görmüyordu (§1.65).

export async function getListeningStats(userId: string, client?: Db): Promise<ListeningStats> {
  try {
    const range = getDateRange('month')
    const supabase = client ?? (await createClient())

    const { data, error } = await supabase.rpc('user_listening_stats', {
      p_user_id: userId,
      p_from: range.from!.toISOString(),
      p_to: range.to.toISOString(),
    })

    const row = data?.[0]
    if (error || !row || Number(row.play_count) === 0) {
      return { minutesThisMonth: 0, vaultTracks: 0, afterMidnightPct: 0 }
    }

    const plays = Number(row.play_count)
    return {
      minutesThisMonth: Math.round(Number(row.total_ms) / 60000),
      vaultTracks: Number(row.distinct_tracks),
      afterMidnightPct: Math.round((Number(row.after_midnight) / plays) * 100),
    }
  } catch {
    return { minutesThisMonth: 0, vaultTracks: 0, afterMidnightPct: 0 }
  }
}

// ---------------------------------------------------------------------------
// getGenreSpectrum — genre dağılımı (tracks.metadata join üzerinden)
// ---------------------------------------------------------------------------

/**
 * 2026-07-31 (Aşama 3 · paket #4): `user_stats_pkg`'den okunuyor (0165).
 * Önce `user_genre_primary_counts` RPC'si — 121–1276 ms; şimdi 0,015 ms.
 *
 * Profil sayfası Faz 3+ yüzeyi olduğu için `p_source` dallanması YOK
 * (Dashboard'daki Faz 2 yolu buraya uğramıyor). Paket yoksa boş dizi döner —
 * sayfa zaten tür haritasını gizler, canlı hesaba DÜŞMEZ (§12.4-A).
 *
 * ⚠ Yüzde mantığı `getDashboardStats` ile ORTAK girdi kullanıyor (aynı paket,
 * aynı `genres` dizisi) — ayrışırlarsa aynı kullanıcı iki yüzeyde farklı tür
 * görür ve hiçbir test bunu yakalamaz.
 */
export async function getGenreSpectrum(userId: string, client?: Db): Promise<GenreSlice[]> {
  try {
    const stats = await getDashboardStats(userId)
    const genres = stats.topGenres
    if (genres && genres.length > 0) {
      const total = genres.reduce((a, r) => a + r.count, 0)
      if (total > 0) {
        return genres
          .map((r) => ({
            genre: r.genre,
            pct: Math.round((r.count / total) * 100),
          }))
          .slice(0, 6)
      }
    }

    const supabase = client ?? (await createClient())

    // FALLBACK 1: user_genre_vectors (dominant_genre & vector jsonb)
    const { data: gv } = await supabase
      .from('user_genre_vectors')
      .select('dominant_genre, vector')
      .eq('user_id', userId)
      .maybeSingle()

    if (gv?.vector && typeof gv.vector === 'object' && Object.keys(gv.vector).length > 0) {
      const entries = Object.entries(gv.vector as Record<string, number>)
        .filter(([g, w]) => Boolean(g) && typeof w === 'number' && w > 0)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 6)
      const sumWeight = entries.reduce((acc, [, w]) => acc + (w as number), 0)
      if (sumWeight > 0) {
        return entries.map(([genre, weight]) => ({
          genre,
          pct: Math.round(((weight as number) / sumWeight) * 100),
        }))
      }
    }

    // FALLBACK 2: user_genre_primary_counts RPC
    const { data: counts } = await supabase.rpc('user_genre_primary_counts', {
      p_user_id: userId,
      p_source: undefined,
    })

    if (counts && Array.isArray(counts) && counts.length > 0) {
      const total = counts.reduce((acc, c) => acc + Number(c.play_count || 0), 0)
      if (total > 0) {
        return counts.slice(0, 6).map((c) => ({
          genre: c.genre,
          pct: Math.round((Number(c.play_count || 0) / total) * 100),
        }))
      }
    }

    return []
  } catch {
    return []
  }
}


// ---------------------------------------------------------------------------
// getLongestStreak — ardışık gün serisi
// ---------------------------------------------------------------------------

export async function getLongestStreak(userId: string, client?: Db): Promise<Streak> {
  try {
    // 0106: gaps-and-islands hesabı DB'de (Europe/Istanbul gün sınırı).
    // Güncel seri: son dinlenen gün bugün YA DA dün ise sayılır (§1.65 düzeltmesi).
    const supabase = client ?? (await createClient())
    const { data, error } = await supabase.rpc('user_streaks', {
      p_user_id: userId,
    })

    const row = data?.[0]
    if (error || !row) return { longestDays: 0, currentDays: 0 }

    return {
      longestDays: Number(row.longest_days),
      currentDays: Number(row.current_days),
    }
  } catch {
    return { longestDays: 0, currentDays: 0 }
  }
}


