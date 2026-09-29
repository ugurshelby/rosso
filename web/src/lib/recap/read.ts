import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

/**
 * Recap okuma katmanı — v2 (FAZ R3, 2026-07-20).
 *
 * Model: **donmuş payload** (Sahip kararı, plan §4). Sayfa açılışında hesap
 * YAPILMAZ; worker cron'u (`app.cron.recap_refresh`) payload'ı önceden üretir,
 * burası yalnız okur.
 *
 * Tablo/RPC'ler migration 0122'de kuruldu — 0117'de düşürülen eski katmanın
 * yerine geçti. Eski payload şeması bilinçli olarak taşınmadı; yeni şema
 * kart-bazlı anahtarlar taşır (`payload.cover`, ileride `payload.top_artists` …)
 * ve `upsert_recap_partial` ile ALAN ALAN güncellenir — yeni kart eklemek
 * eskisini silmez (eski `build_recap` payload'ı baştan kurup `year_extras`'ı
 * sessizce siliyordu; o sınıf yapısal olarak kapatıldı).
 */

/** Liste/arşiv kartlarının ihtiyaç duyduğu asgari şekil. */
export interface RecapSummary {
  id: string
  period_type: string
  period_label: string
  period_start: string
  period_end: string
  /**
   * Eski şemadan kalan alan; arşiv/liste bileşenleri okuyor.
   * v2'de her kayıt cron tarafından üretilmiş sayılır → sabit 'ready'.
   */
  status: string
  generated_at: string
}

interface RawRecapRow {
  id: string
  period_type: string
  period_label: string
  period_start: string
  period_end: string
  generated_at: string
}

function toSummary(r: RawRecapRow): RecapSummary {
  return {
    id: r.id,
    period_type: r.period_type,
    period_label: r.period_label,
    period_start: r.period_start,
    period_end: r.period_end,
    status: 'ready',
    generated_at: r.generated_at,
  }
}

/**
 * Dönem tipine göre recap arşivi (yeni → eski).
 *
 * `cache()` ile sarılı (2026-07-30 performans turu, Aşama 1 —
 * `docs/reference/performans-olcumleri.md` Bulgu 3.1-A):
 * Aynı istek içinde aynı `(userId, periodType)` ile kaç kez çağrılırsa
 * çağrılsın DB'ye TEK tur gider.
 *
 * NEDEN GEREKTİ: `getLatestMonthlyRecap` içeride bu fonksiyonu çağırıp `rows[0]`
 * alıyor. `/recap` sayfası hem onu hem `listRecaps`'i ayrı ayrı çağırdığı için
 * aynı sorgu iki kez koşuyordu (aylık+yıllık = 4 çağrı, 2 sonuç; ölçüm: 61 ms
 * + 9,4 ms boşa). Dashboard'da da iki çağrı vardı. Düzeltmeyi ÇAĞIRAN yerlerde
 * değil burada yapmak, ikisini birden çözer ve ileride üçüncü bir çağıran
 * eklenirse o da bedava kazanır.
 *
 * `cache()` yalnız aynı server-request içinde tekilleştirir; istekler arası
 * paylaşmaz → bir kullanıcının arşivi başkasına sızmaz.
 */
export const listRecaps = cache(async (
  userId: string,
  periodType: 'month' | 'year',
): Promise<RecapSummary[]> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('list_recaps', {
      p_user_id: userId,
      p_period_type: periodType,
    })
    if (error) throw error
    return ((data ?? []) as RawRecapRow[]).map(toSummary)
  } catch (err) {
    void systemLog({
      operation: 'recap_list',
      userId,
      severity: 'warn',
      errorCode: 'list_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return []
  }
})

/** En son aylık recap (yoksa null). */
export async function getLatestMonthlyRecap(userId: string): Promise<RecapSummary | null> {
  const rows = await listRecaps(userId, 'month')
  return rows[0] ?? null
}

/** En son yıllık recap (yoksa null). */
export async function getLatestYearlyRecap(userId: string): Promise<RecapSummary | null> {
  const rows = await listRecaps(userId, 'year')
  return rows[0] ?? null
}

/** Kart payload'ları — donmuş, cron üretir (kart bazlı anahtarlar). */
export interface RecapCoverPayload {
  issue_label: string
  period_label: string
}

export interface RecapManifestoPayload {
  minutes: number
  tracks: number
  artists: number
  dominant_genre: string | null
}

export interface RecapArtistPayload {
  name: string
  plays: number
  image_url: string | null
}

export interface RecapTrackPayload {
  title: string
  artist: string | null
  plays: number
  image_url: string | null
}

/** Kart 5 — en çok keşif yapılan ay. */
export interface RecapDiscoveryPayload {
  /** 'YYYY-MM-DD' (ayın ilk günü). */
  month_start: string
  new_artists: number
  new_tracks: number
  /**
   * Kartın iki 1:1 karesi. Üretici bunları yazmazsa kart görselsiz kalır —
   * tip burada eksikti ve TS generator'ın `image_url` yazmadığını kimse fark
   * etmedi; her recap'in 5. ekranı placeholder gösteriyordu.
   */
  top_track?: { title: string; artist: string | null; image_url: string | null } | null
  top_artist?: { name: string; image_url: string | null } | null
}

/** Kart 6 — en uzun ardışık dinleme serisi. */
export interface RecapStreakPayload {
  days: number
  /** 'YYYY-MM-DD' */
  start: string
  end: string
}

/** Kart 7 — en yoğun gün + o günün ilk 3 şarkısı. */
export interface RecapPeakDayPayload {
  /** 'YYYY-MM-DD' */
  day: string
  minutes: number
  plays: number
  tracks: RecapTrackPayload[]
}

export interface RecapDetail {
  periodType: string
  periodLabel: string
  /** Yıllık recap'lerde sayısal yıl; aylıkta null. */
  year: number | null
  cover: RecapCoverPayload | null
  manifesto: RecapManifestoPayload | null
  topArtists: RecapArtistPayload[]
  topTracks: RecapTrackPayload[]
  discovery: RecapDiscoveryPayload | null
  streak: RecapStreakPayload | null
  peakDay: RecapPeakDayPayload | null
  /** A13.5 — takıntı. Yoğunlaşma eşiği altındaysa cron hiç yazmaz. */
  obsession: RecapObsessionPayload | null
  /** A13.6 — top albümler (≥3 farklı şarkı şartı RPC'de). */
  topAlbums: RecapAlbumPayload[]
  /** A13.2 + A13.3 + A13.7 — kart değil, satır besleyen sayılar. */
  extras: RecapExtrasPayload | null
}

/** A13.5 — takıntı payload'ı. Yoğunlaşma ölçer, toplam çalma değil (0193). */
export interface RecapObsessionPayload {
  title: string
  artist: string
  plays: number
  hours: number
  share_pct: number
  span_days: number
  peak_window_plays: number
  peak_window_start: string | null
}

/** A13.6 — albüm satırı. */
export interface RecapAlbumPayload {
  album: string
  artist: string
  distinct_tracks: number
  plays: number
  hours: number
}

/**
 * A13.2 + A13.3 + A13.7 + A13.8 — dördü de AYRI KART DEĞİL, satır besler.
 * Ayrı payload dalı açmak kart olmayan şeye kart muamelesi olurdu.
 */
export interface RecapExtrasPayload {
  discovery_total?: {
    new_artists: number
    new_tracks: number
    total_artists: number
    total_tracks: number
    discovery_rate: number | null
  }
  number_one?: {
    artist_name: string | null
    artist_hours: number | null
    artist_plays: number
    artist_image_url?: string | null
    track_title: string | null
    track_artist: string | null
    track_hours: number | null
    track_plays: number
    track_image_url?: string | null
  }
  genre_variety?: {
    genre_count: number
    top_genre: string | null
    top_genre_pct: number | null
  }
  /**
   * A13.8 — dinleme yaşı. `(bugünkü_yıl − ort_release_year) + kullanıcı_yaşı`.
   *
   * ⚠ Anahtar **yoksa satır basılmaz**: doğum tarihi bilinmiyor, release_year
   * kapsaması %50'nin altında ya da örneklem 30'dan az demektir. Uydurma yaş
   * göstermek yasak (migration 0249).
   */
  listening_age?: {
    age: number
    user_age: number
    avg_release_year: number | null
    coverage_pct: number | null
    sample_size: number
  }
}

/**
 * Tek recap'in donmuş payload'ı (detay/story sahnesi için).
 *
 * Kayıt yoksa null — cron henüz üretmemiş olabilir; çağıran boş durumu
 * gösterir (hata fırlatılmaz, sayfa çökmez).
 */
export async function getRecapDetail(
  userId: string,
  periodLabel: string,
): Promise<RecapDetail | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_recap_by_label', {
      p_user_id: userId,
      p_period_label: periodLabel,
    })
    if (error) throw error

    const row = data?.[0] as
      | { period_type: string; period_label: string; payload: Record<string, unknown> }
      | undefined
    if (!row) return null

    const payload = row.payload ?? {}
    const yearMatch = /^\d{4}$/.exec(row.period_label)

    let extras = (payload.extras ?? null) as RecapExtrasPayload | null
    if (extras?.number_one) {
      const no = extras.number_one
      let trackImg = no.track_image_url ?? null
      let artistImg = no.artist_image_url ?? null

      if (!trackImg && no.track_title) {
        try {
          const { data: trackRow } = await supabase
            .from('tracks')
            .select('image_url')
            .ilike('title', no.track_title)
            .not('image_url', 'is', null)
            .limit(1)
            .maybeSingle()
          trackImg = trackRow?.image_url ?? null
        } catch {
          // Runtime fallback hatası sessizce yutulur
        }
      }

      if (!artistImg && no.artist_name) {
        try {
          const { data: artistRow } = await supabase
            .from('artists')
            .select('image_url')
            .ilike('name', no.artist_name)
            .not('image_url', 'is', null)
            .limit(1)
            .maybeSingle()
          artistImg = artistRow?.image_url ?? null

          if (!artistImg) {
            const { data: trackArtistRow } = await supabase
              .from('tracks')
              .select('image_url')
              .contains('artists', [no.artist_name])
              .not('image_url', 'is', null)
              .limit(1)
              .maybeSingle()
            artistImg = trackArtistRow?.image_url ?? null
          }
        } catch {
          // Runtime fallback hatası sessizce yutulur
        }
      }

      if (trackImg !== no.track_image_url || artistImg !== no.artist_image_url) {
        extras = {
          ...extras,
          number_one: {
            ...no,
            track_image_url: trackImg,
            artist_image_url: artistImg,
          },
        }
      }
    }

    return {
      periodType: row.period_type,
      periodLabel: row.period_label,
      year: yearMatch ? Number(row.period_label) : null,
      cover: (payload.cover ?? null) as RecapCoverPayload | null,
      manifesto: (payload.manifesto ?? null) as RecapManifestoPayload | null,
      topArtists: (payload.top_artists ?? []) as RecapArtistPayload[],
      topTracks: (payload.top_tracks ?? []) as RecapTrackPayload[],
      discovery: (payload.discovery ?? null) as RecapDiscoveryPayload | null,
      streak: (payload.streak ?? null) as RecapStreakPayload | null,
      peakDay: (payload.peak_day ?? null) as RecapPeakDayPayload | null,
      obsession: (payload.obsession ?? null) as RecapObsessionPayload | null,
      topAlbums: (payload.top_albums ?? []) as RecapAlbumPayload[],
      extras,
    }
  } catch (err) {
    void systemLog({
      operation: 'recap_detail',
      userId,
      severity: 'warn',
      errorCode: 'detail_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
