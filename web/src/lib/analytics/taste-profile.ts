import 'server-only'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { displayIdentityWord } from '@/lib/taste/identity-word-meanings'

// ---------------------------------------------------------------------------
// FAZ P6 — Taste modeli veri erişimi (RPC tablolarından okur).
// Motor: Postgres RPC (migration 0032-0038). Bu katman yalnız OKUR.
// Tasarım: docs/vision/rosso-social-media.md MODÜL 1.
// ---------------------------------------------------------------------------

export interface TasteProfile {
  available: boolean
  // Davranışsal (L2)
  explorationRate: number | null
  shuffleReliance: number | null
  completionLoyalty: number | null
  intentionality: number | null
  peakHour: number | null
  isNightOwl: boolean | null
  countryDiversity: number | null
  // Tür (katalog dolunca)
  entropy: number | null
  dominantGenre: string | null
  mainstreamNess: number | null
  mainstreamSource: string | null
  // Kimlik (katmanlı — E1..E6)
  identityWords: string[]
  identityBlurb: string | null
  // Katman & olgunluk
  hasL2: boolean
  hasL3: boolean
  genreCoveragePct: number
  isMature: boolean
}

export interface TopStripItem {
  rank: number
  trackId: string | null
  title: string | null
  artist: string | null
  weight: number
  isHidden: boolean
  imageUrl: string | null
}

export interface TopStrips {
  now: TopStripItem[]
  evergreen: TopStripItem[]
}

export interface GenreVectorEntry {
  genre: string
  weight: number
}

/**
 * Kullanıcının taste profilini (davranış + tür + kimlik + olgunluk) okur.
 * RPC'ler henüz çalışmamışsa available=false döner (UI onboarding gösterir).
 */
export async function getTasteProfile(userId: string): Promise<TasteProfile> {
  const empty: TasteProfile = {
    available: false,
    explorationRate: null, shuffleReliance: null, completionLoyalty: null,
    intentionality: null, peakHour: null, isNightOwl: null, countryDiversity: null,
    entropy: null, dominantGenre: null, mainstreamNess: null, mainstreamSource: null,
    identityWords: [], identityBlurb: null,
    hasL2: false, hasL3: false, genreCoveragePct: 0, isMature: false,
  }

  try {
    const supabase = await createClient()
    const [{ data: prof }, { data: gv }] = await Promise.all([
      supabase
        .from('user_taste_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_genre_vectors')
        .select('dominant_genre')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    if (!prof) return empty

    return {
      available: true,
      explorationRate: prof.exploration_rate,
      shuffleReliance: prof.shuffle_reliance,
      completionLoyalty: prof.completion_loyalty,
      intentionality: prof.intentionality,
      peakHour: prof.peak_hour,
      isNightOwl: prof.is_night_owl,
      countryDiversity: prof.country_diversity,
      entropy: prof.entropy,
      dominantGenre: gv?.dominant_genre ?? null,
      mainstreamNess: prof.mainstream_ness,
      mainstreamSource: prof.mainstream_source,
      identityWords: (prof.identity_words ?? []).map(displayIdentityWord),
      // identity_blurb sütunu 0124'te düşürüldü: 0032'de tanımlanmış ama
      // hiçbir yazıcısı hiç olmamıştı (32/32 kullanıcıda NULL). Alan arayüz
      // sözleşmesinde kalıyor — yazan bir motor gelirse yeniden bağlanır.
      identityBlurb: null,
      hasL2: prof.has_l2,
      hasL3: prof.has_l3,
      genreCoveragePct: prof.genre_coverage_pct ?? 0,
      isMature: prof.is_mature,
    }
  } catch {
    return empty
  }
}

const TASTE_STRIPS_MAX_STALE_MS = 12 * 60 * 60 * 1000 // 12 saat

/**
 * İki şerit: "Right now" (son 60 günün on repeat dinlemeleri) + "Constants" (evergreen).
 * hidden_set (is_hidden) gösterimde filtrelenir.
 * 12 saatten eski veya boş veri tespit edildiğinde otomatik olarak kendini yeniler.
 */
export async function getTopStrips(userId: string, limit = 10): Promise<TopStrips> {
  const empty: TopStrips = { now: [], evergreen: [] }
  try {
    const supabase = await createClient()
    let { data } = await supabase
      .from('user_top_strips')
      .select('strip, rank, track_id, title, artist, weight, is_hidden, computed_at, tracks(image_url)')
      .eq('user_id', userId)
      .eq('is_hidden', false)
      .order('rank', { ascending: true })

    const isStale =
      !data ||
      data.length === 0 ||
      (data[0]?.computed_at &&
        Date.now() - new Date(data[0].computed_at).getTime() > TASTE_STRIPS_MAX_STALE_MS)

    if (isStale) {
      try {
        const service = await createServiceClient()
        await service.rpc('materialize_user_top_strips', { p_user_id: userId, p_limit: 20 })
        const { data: refreshed } = await supabase
          .from('user_top_strips')
          .select('strip, rank, track_id, title, artist, weight, is_hidden, computed_at, tracks(image_url)')
          .eq('user_id', userId)
          .eq('is_hidden', false)
          .order('rank', { ascending: true })

        if (refreshed && refreshed.length > 0) {
          data = refreshed
        }
      } catch (rpcErr) {
        console.warn('[taste-profile] materialize_user_top_strips oto-tazeleme hatası:', rpcErr)
      }
    }

    if (!data) return empty

    const map = (strip: string): TopStripItem[] =>
      data!
        .filter((r) => r.strip === strip)
        .slice(0, limit)
        .map((r) => ({
          rank: r.rank,
          trackId: r.track_id,
          title: r.title,
          artist: r.artist,
          weight: Number(r.weight),
          isHidden: r.is_hidden,
          imageUrl: (r.tracks as unknown as { image_url: string | null })?.image_url ?? null,
        }))

    return { now: map('now'), evergreen: map('evergreen') }
  } catch {
    return empty
  }
}

/**
 * Tür vektörü — L2-normalize edilmiş {tür: ağırlık}, en yüksekten sıralı.
 */
export async function getGenreVector(userId: string, limit = 8): Promise<GenreVectorEntry[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_genre_vectors')
      .select('vector')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data?.vector || typeof data.vector !== 'object') return []

    return Object.entries(data.vector as Record<string, number>)
      .map(([genre, weight]) => ({ genre, weight: Number(weight) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] taste-profile genre vektör sorgusu başarısız — boş veri döndü:', err)
    return []
  }
}
