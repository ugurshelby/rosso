import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { refreshUserCorePackages } from '@/lib/services/user-packages-refresh'

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface GenreDistribution {
  available: boolean
  genres: Array<{ genre: string; percentage: number; track_count: number }>
}

export interface ChronotypeSummary {
  available: boolean
  label: string
  peakHour: number
  peakHourLabel: string
  hourlyData: Array<{ hour: number; play_count: number }>
}

/**
 * Yılın şampiyon sanatçısı — her yıl için o yılın EN ÇOK DİNLENEN sanatçısı.
 * "Sadık Sanatçılar" bölümünü besler: en eski yıldan bugüne, yıl başına 1 satır.
 * (Eski "distinct_years × log" sadakat mantığı yanlıştı; bkz. migration 0057.)
 */
export interface LoyalArtist {
  year: number
  artist_name: string
  play_count: number
  total_ms: number
}

export interface EraShift {
  available: boolean
  years: Array<{
    year: number
    top_artist: string
    top_genre: string | null
  }>
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function chronotypeLabel(peakHour: number): string {
  if (peakHour >= 22 || peakHour <= 5) return 'Gece Dinleyicisi'
  if (peakHour >= 6 && peakHour <= 11) return 'Sabah Dinleyicisi'
  if (peakHour >= 12 && peakHour <= 16) return 'Öğle Dinleyicisi'
  return 'Akşam Dinleyicisi'
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

// ---------------------------------------------------------------------------
// Paket okuma (Aşama 3, paket #2 — migration 0161)
// ---------------------------------------------------------------------------

/**
 * Ham tür sayımlarını `GenreDistribution`'a çevirir.
 *
 * ⚠ Bu mantık hem RPC hem paket yolunda AYNI olmak zorunda — ayrışırsa iki
 * yüzey farklı yüzde gösterir ve bunu kimse fark etmez. Bu yüzden tek yerde.
 */
function toGenreDistribution(
  rows: Array<{ genre: string; play_count: number }>,
): GenreDistribution {
  const empty: GenreDistribution = { available: false, genres: [] }
  if (rows.length === 0) return empty

  const total = rows.reduce((sum, r) => sum + Number(r.play_count), 0)
  if (total === 0) return empty

  return {
    available: true,
    genres: rows
      .map((r) => ({
        genre: r.genre,
        track_count: Number(r.play_count),
        percentage: Math.round((Number(r.play_count) / total) * 10000) / 100,
      }))
      .slice(0, 6),
  }
}

/** Ham saat kutularını `ChronotypeSummary`'ye çevirir (bkz. yukarıdaki not). */
function toChronotype(
  rows: Array<{ hour: number; play_count: number }>,
): ChronotypeSummary {
  const empty: ChronotypeSummary = {
    available: false,
    label: '',
    peakHour: 0,
    peakHourLabel: '00:00',
    hourlyData: [],
  }
  if (rows.length === 0) return empty

  const hourMap = new Map<number, number>()
  let totalPlays = 0
  for (const row of rows) {
    hourMap.set(row.hour, Number(row.play_count))
    totalPlays += Number(row.play_count)
  }
  // Eşik korunuyor: 20 dinlemenin altında "kronotip" demek yanıltıcı olur.
  if (totalPlays < 20) return empty

  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    play_count: hourMap.get(hour) ?? 0,
  }))

  let peakHour = 0
  let peakCount = 0
  for (const { hour, play_count } of hourlyData) {
    if (play_count > peakCount) {
      peakCount = play_count
      peakHour = hour
    }
  }

  return {
    available: true,
    label: chronotypeLabel(peakHour),
    peakHour,
    peakHourLabel: formatHourLabel(peakHour),
    hourlyData,
  }
}

export interface TastePackage {
  genre: GenreDistribution
  chronotype: ChronotypeSummary
  generatedAt: string
}

/**
 * Tür DNA + Kronotip — TEK sorguda (`user_taste_pkg`, migration 0161).
 *
 * ÖNCESİ: iki ayrı RPC, 290 + 133 ms — ve `user_hourly_play_counts` profil
 * sayfasında İKİ KEZ çağrılıyordu (`getPeakListeningHour` + `getHourlyBuckets`
 * aynı 24 satırı ayrı ayrı çekiyordu).
 * SONRASI: tek `select` → 0,083 ms (ölçüldü).
 *
 * `null` dönerse paket henüz üretilmemiş → çağıran *"hazırlanıyor"* göstermeli,
 * **canlı hesaba düşmemeli** (§12.4-A bağlayıcı kuralı).
 */
export async function getTastePackage(userId: string): Promise<TastePackage | null> {
  try {
    const supabase = await createClient()
    // NOT: tablo migration 0161 ile eklendi; üretilmiş tip dosyası henüz
    // tanımıyor (`db:types` güvenilmez — bkz. lib/phase/read.ts notu).
    const { data, error } = await (
      supabase.from as unknown as (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: unknown) => {
            maybeSingle: () => Promise<{
              data: {
                payload: {
                  genres?: Array<{ genre: string; play_count: number }>
                  hourly?: Array<{ hour: number; play_count: number }>
                }
                generated_at: string
              } | null
              error: unknown
            }>
          }
        }
      }
    )('user_taste_pkg')
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
      genre: toGenreDistribution(data.payload.genres ?? []),
      chronotype: toChronotype(data.payload.hourly ?? []),
      generatedAt: data.generated_at,
    }
  } catch {
    // Okuma hatası da "paket yok" sayılır — canlı hesaba düşmeyiz.
    return null
  }
}

// ---------------------------------------------------------------------------
// getGenreDistribution
// ---------------------------------------------------------------------------

/**
 * ⚠ 2026-07-31 (Aşama 3): `/taste` sayfası artık bunu ÇAĞIRMIYOR —
 * `getTastePackage` kullanıyor. Bu fonksiyon **paket üreticisinin** dayandığı
 * RPC'yi sarmalıyor ve `/api/analytics/taste` (mobil) için duruyor.
 * Silmeden önce `grep` ile tüm çağıranlar aranmalı (§12.3).
 */
export async function getGenreDistribution(
  userId: string
): Promise<GenreDistribution> {
  const empty: GenreDistribution = { available: false, genres: [] }

  try {
    const supabase = await createClient()

    // 0106: DB tarafında toplama — eski sayfalama döngüsü PostgREST'in
    // 1000-satır tavanına takılıp yalnız ilk 1000 olayı sayıyordu (§1.65).
    const { data, error } = await supabase.rpc('user_genre_all_counts', {
      p_user_id: userId,
    })

    if (error || !data) return empty

    // Yüzde/sıralama mantığı paket yoluyla ORTAK (`toGenreDistribution`) —
    // ikisi ayrışırsa aynı kullanıcı iki yüzeyde farklı yüzde görür.
    return toGenreDistribution(data)
  } catch {
    return empty
  }
}

// ---------------------------------------------------------------------------
// getChronotype
// ---------------------------------------------------------------------------

export async function getChronotype(userId: string): Promise<ChronotypeSummary> {
  const empty: ChronotypeSummary = {
    available: false,
    label: '',
    peakHour: 0,
    peakHourLabel: '00:00',
    hourlyData: [],
  }

  try {
    const supabase = await createClient()

    // 0106: DB tarafında saatlik toplama (Europe/Istanbul) — §1.65 düzeltmesi.
    const { data, error } = await supabase.rpc('user_hourly_play_counts', {
      p_user_id: userId,
    })

    if (error || !data) return empty

    // Zirve saati / etiket / 20-dinleme eşiği mantığı paket yoluyla ORTAK
    // (`toChronotype`) — ayrışırsa aynı kullanıcı iki yüzeyde farklı
    // kronotip etiketi görür.
    return toChronotype(data)
  } catch {
    return empty
  }
}

// ---------------------------------------------------------------------------
// getLoyalArtists
// ---------------------------------------------------------------------------

/**
 * Her yılın şampiyon sanatçısı — en eski yıldan bugüne, yıl başına o yılın
 * en çok dinlenen (ms_played) sanatçısı. get_yearly_champion_artists RPC (0057).
 * limit parametresi geriye-uyum için tutulur; her yıl bir satır döner (kırpma yok).
 */
export async function getLoyalArtists(
  userId: string,
  limit?: number
): Promise<LoyalArtist[]> {
  void limit
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_yearly_champion_artists', {
      p_user_id: userId,
    })
    if (error || !data) return []
    return (data as Array<{
      year: number
      artist_name: string
      play_count: number
      total_ms: number
    }>).map((r) => ({
      year: r.year,
      artist_name: r.artist_name,
      play_count: r.play_count,
      total_ms: r.total_ms,
    }))
  } catch (err) {
    // S4: hata yutulmasın — Vercel loglarında görünür olsun
    console.error('[analytics] identity yıllık sanatçı sorgusu başarısız — boş veri döndü:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// getListeningYearRange
// ---------------------------------------------------------------------------

/** Dinleme geçmişinin ilk ve son yılı — hero alt başlığındaki "2019–2026". */
export interface ListeningYearRange {
  available: boolean
  firstYear: number | null
  lastYear: number | null
}

/**
 * Yalnız yıl ARALIĞINI döner — iki sayı, iki indeksli sorgu.
 *
 * NEDEN VAR (2026-07-30 performans turu, Aşama 1 —
 * `docs/reference/performans-olcumleri.md` Bulgu 2.4-A):
 * Taste hero'sunun alt başlığı `getEraShift()`'ten YALNIZ ilk ve son yılı
 * okuyordu (`years[0].year` ve `years[son].year`). Ama o RPC yıl başına
 * şampiyon sanatçı + baskın tür hesaplıyor: ölçümde 1412 ms ortalama (max
 * 3725 ms), çünkü CTE'yi iki kez tarayıp 124 bin satırı iki kez diske
 * sıralıyor. İki sayı için.
 *
 * ⚠ `getEraShift()` SİLİNMEDİ — `/api/analytics/taste` (mobil istemci) zengin
 * çıktının tamamını döndürüyor. Sayfa artık bu ucuz yolu kullanıyor, API
 * eski davranışını aynen koruyor.
 *
 * Zemin: eskiden aralık, "veri yeterli mi" süzgecinden geçmiş yıllardan
 * geliyordu (`data.length < 2` → available=false). Burada süzgeç YOK; ilk/son
 * çalma tarihine bakılır. Tek satırlık dinlemede iki yıl aynı olabilir —
 * çağıran taraf `firstYear !== lastYear` kontrolüyle "aralık" gösterir
 * (bkz. taste/page.tsx), yani tek yıllık kullanıcıda "2026–2026" yazılmaz.
 */
export async function getListeningYearRange(
  userId: string,
): Promise<ListeningYearRange> {
  const empty: ListeningYearRange = { available: false, firstYear: null, lastYear: null }

  try {
    const supabase = await createClient()

    // İki tekil sorgu: `idx_play_events_user_time` (user_id, played_at DESC)
    // ikisini de indeksin uçlarından okur — tablo taraması yok.
    const [oldest, newest] = await Promise.all([
      supabase
        .from('play_events')
        .select('played_at')
        .eq('user_id', userId)
        .order('played_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('play_events')
        .select('played_at')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const from = oldest.data?.played_at
    const to = newest.data?.played_at
    if (!from || !to) return empty

    // Europe/Istanbul — RPC'lerin tamamı bu dilimi kullanıyor (tek referans).
    const yearOf = (iso: string): number =>
      Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Europe/Istanbul',
          year: 'numeric',
        }).format(new Date(iso)),
      )

    return { available: true, firstYear: yearOf(from), lastYear: yearOf(to) }
  } catch (err) {
    console.error('[analytics] getListeningYearRange başarısız — boş veri döndü:', err)
    return empty
  }
}

// ---------------------------------------------------------------------------
// getEraShift
// ---------------------------------------------------------------------------

export async function getEraShift(userId: string): Promise<EraShift> {
  const empty: EraShift = { available: false, years: [] }

  try {
    const supabase = await createClient()

    // 0106: DB tarafında yıl-başına-şampiyon toplaması — eski sayfalama
    // 1000-satır tavanına takılıp tek yılın verisini görüyor, "en az 2 yıl"
    // şartı sağlanamadığı için bölüm hep boş kalıyordu (§1.65).
    const { data, error } = await supabase.rpc('user_era_shift', {
      p_user_id: userId,
    })

    if (error || !data) return empty
    if (data.length < 2) return empty

    return {
      available: true,
      years: data.map((r) => ({
        year: r.year,
        top_artist: r.top_artist,
        top_genre: r.top_genre ?? null,
      })),
    }
  } catch {
    return empty
  }
}
