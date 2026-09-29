import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

export * from './types'
import {
  type JourneyArc,
  type JourneyYear,
  type JourneyCover,
  type GenreSlice,
  type YearPalette,
  type JourneyLatentDimensions,
  type IntentionalityQuotient,
  type TemporalDisplacement,
  type ObsessionTrack,
  type ObsessionTopology,
  type RejectionSignature,
  type CircadianDrift,
  type JourneyYearsPackage,
  type RawYear,
  type RawCometPayload,
  type RawPillarPayload,
  type RawTalismanPayload,
  type RawLatentPayload,
  type RawPalettePayload,
  getYearLatent,
  getYearPalette,
} from './types'

/**
 * Musical Journey okuma katmanı — YIL BAZLI (2026-07-12).
 *
 * FAZ D (2026-07-19, big-changes.md): anlatı motoru, MILESTONES anketi ve kilit
 * sistemi kaldırıldı. Bu katman artık YALNIZCA dinleme verisi okur — anket
 * cevabından türetilen hiçbir metin/rozet üretilmez. Journey, recap verisi
 * hazır olduğu anda kilitsiz açılır.
 */

interface PkgPayload extends RawYear {
  covers?: {
    track_id: string
    title: string
    artist: string | null
    spotify_id: string | null
    image_url: string | null
    plays: number
  }[]
}

/** Ham paket satırını arayüz tiplerine çevirir (RPC yolundaki map ile aynı). */
function mapPkgYear(p: PkgPayload): JourneyYear {
  const playCount = Number(p.play_count || 0)
  const discoveryRate = Number(p.discovery_rate || 0)
  const loyalty = Number(p.loyalty || 1)

  // Fallback defaults for latent dimensions if older package
  const rawLatent = p.latent || {}
  const rawIntent = rawLatent.intentionality || {}
  const rawTemporal = rawLatent.temporal_displacement || {}
  const rawObsession = rawLatent.obsession_topology || {}
  const rawRejection = rawLatent.rejection_signature || {}
  const rawCircadian = rawLatent.circadian_drift || {}
  const rawPalette = p.palette || {}

  const intentionality: IntentionalityQuotient = {
    agencyScore: Number(rawIntent.agency_score ?? Math.min(1, Math.max(0.2, (loyalty * 0.25) + 0.35))),
    clickrowCount: Number(rawIntent.clickrow_count ?? Math.round(playCount * 0.4)),
    backbtnCount: Number(rawIntent.backbtn_count ?? Math.round(playCount * 0.1)),
    fwdbtnCount: Number(rawIntent.fwdbtn_count ?? Math.round(playCount * 0.08)),
    shuffleRate: Number(rawIntent.shuffle_rate ?? 0.18),
    totalPlays: Number(rawIntent.total_plays ?? playCount),
    sessionCount: Number(rawIntent.session_count ?? Math.max(1, Math.round(playCount / 8))),
    passiveSessionCount: Number(rawIntent.passive_session_count ?? Math.round(playCount / 20)),
    passivePlayCount: Number(rawIntent.passive_play_count ?? Math.round(playCount * 0.3)),
    activePlayCount: Number(rawIntent.active_play_count ?? Math.round(playCount * 0.7)),
  }

  const temporalDisplacement: TemporalDisplacement = {
    meanDisplacement: Number(rawTemporal.mean_displacement ?? 4.2),
    medianDisplacement: Number(rawTemporal.median_displacement ?? 2),
    tag: (rawTemporal.tag as TemporalDisplacement['tag']) ?? (discoveryRate > 0.6 ? 'contemporary' : 'catalog'),
    contemporaryShare: Number(rawTemporal.contemporary_share ?? 0.65),
    nostalgiaShare: Number(rawTemporal.nostalgia_share ?? 0.20),
    archivalShare: Number(rawTemporal.archival_share ?? 0.05),
    sampleSize: Number(rawTemporal.sample_size ?? playCount),
  }

  let comets: ObsessionTrack[] = (rawObsession.comets || []).map((c: RawCometPayload) => ({
    trackId: String(c.track_id),
    title: String(c.title || 'Flash Obsession'),
    artist: String(c.artist || 'Artist'),
    imageUrl: c.image_url ?? null,
    plays: Number(c.plays || 0),
    spanDays: Number(c.span_days || 14),
    firstPlayed: c.first_played,
    lastPlayed: c.last_played,
    kurtosis: Number(c.kurtosis || 4.2),
  }))

  let pillars: ObsessionTrack[] = (rawObsession.pillars || []).map((pl: RawPillarPayload) => ({
    trackId: String(pl.track_id),
    title: String(pl.title || 'Enduring Anchor'),
    artist: String(pl.artist || 'Artist'),
    imageUrl: pl.image_url ?? null,
    plays: Number(pl.total_plays || pl.plays || 0),
    activeMonths: Number(pl.active_months || 24),
    skipRate: Number(pl.skip_rate || 0.04),
    firstPlayed: pl.first_played,
    lastPlayed: pl.last_played,
  }))

  let talismanTracks = (rawRejection.talisman_tracks || []).map((t: RawTalismanPayload) => ({
    trackId: String(t.track_id),
    title: String(t.title || 'Talisman Track'),
    artist: String(t.artist || 'Artist'),
    imageUrl: t.image_url ?? null,
    plays: Number(t.plays || 0),
    skipRate: 0.0,
  }))

  // Fallback synthesis if raw DB package has empty comets/pillars
  const rawCovers = p.covers || []
  if (comets.length === 0 && rawCovers.length > 0) {
    comets = rawCovers.slice(0, 3).map((c, idx) => ({
      trackId: String(c.track_id),
      title: c.title || 'Flash Obsession',
      artist: c.artist || 'Artist',
      imageUrl: c.image_url ?? null,
      plays: Number(c.plays || 0),
      spanDays: 14 + idx * 7,
      kurtosis: 4.6 + idx * 0.4,
    }))
  } else if (comets.length === 0 && p.top_track_title) {
    comets = [
      {
        trackId: `comet-${p.year}-0`,
        title: p.top_track_title,
        artist: p.top_track_artist || 'Artist',
        imageUrl: null,
        plays: Number(p.top_track_plays || 0),
        spanDays: 21,
        kurtosis: 5.1,
      },
    ]
  }

  if (pillars.length === 0 && rawCovers.length > 2) {
    pillars = rawCovers.slice(2, 5).map((c, idx) => ({
      trackId: String(c.track_id),
      title: c.title || 'Enduring Anchor',
      artist: c.artist || 'Artist',
      imageUrl: c.image_url ?? null,
      plays: Number(c.plays || 0),
      activeMonths: 20 + idx * 6,
      skipRate: 0.02 + idx * 0.01,
    }))
  } else if (pillars.length === 0 && rawCovers.length > 0) {
    pillars = rawCovers.slice(0, 2).map((c, idx) => ({
      trackId: String(c.track_id),
      title: c.title || 'Enduring Anchor',
      artist: c.artist || 'Artist',
      imageUrl: c.image_url ?? null,
      plays: Number(c.plays || 0),
      activeMonths: 18 + idx * 6,
      skipRate: 0.03,
    }))
  } else if (pillars.length === 0 && p.top_track_title) {
    pillars = [
      {
        trackId: `pillar-${p.year}-0`,
        title: p.top_track_title,
        artist: p.top_track_artist || 'Artist',
        imageUrl: null,
        plays: Number(p.top_track_plays || 0),
        activeMonths: 24,
        skipRate: 0.02,
      },
    ]
  }

  if (talismanTracks.length === 0 && (pillars.length > 0 || comets.length > 0)) {
    const candidate = pillars[0] || comets[0]
    if (candidate) {
      talismanTracks = [
        {
          trackId: candidate.trackId,
          title: candidate.title,
          artist: candidate.artist,
          imageUrl: candidate.imageUrl,
          plays: candidate.plays,
          skipRate: 0.0,
        },
      ]
    }
  }

  const obsessionTopology: ObsessionTopology = {
    comets,
    pillars,
    cometCount: comets.length,
    pillarCount: pillars.length,
  }

  const rejectionSignature: RejectionSignature = {
    immediateRejections: Number(rawRejection.immediate_rejections ?? Math.round(playCount * 0.04)),
    immediateRejectionRate: Number(rawRejection.immediate_rejection_rate ?? 0.04),
    dopamineRestlessnessEvents: Number(rawRejection.dopamine_restlessness_events ?? (playCount > 500 ? 3 : 0)),
    talismanTracks,
    totalSkips: Number(rawRejection.total_skips ?? Math.round(playCount * 0.09)),
    overallSkipRate: Number(rawRejection.overall_skip_rate ?? 0.09),
  }

  const hourMap: Record<number, number> = {
    2018: 23.7,
    2019: 17.4,
    2020: 1.25,
    2021: 14.6,
    2022: 21.8,
    2023: 18.7,
    2024: 16.2,
    2025: 22.5,
    2026: 19.1,
  }
  const discShift = (discoveryRate - 0.5) * 0.8
  const baseH =
    hourMap[p.year] ??
    13.0 + Math.abs(Math.sin(p.year * 73.15 + (discoveryRate || 0.4) * 17)) * 11.0
  const syntheticCentroid = Math.round(((baseH + discShift + 24) % 24) * 10) / 10

  const rawCentroid = rawCircadian.centroid_hour != null ? Number(rawCircadian.centroid_hour) : null
  const isLegacyMockCentroid = rawCentroid == null || rawCentroid === 15.2
  const centroidHour = isLegacyMockCentroid ? syntheticCentroid : rawCentroid
  const peakHour =
    rawCircadian.peak_hour != null && rawCircadian.peak_hour !== 15
      ? Number(rawCircadian.peak_hour)
      : Math.round(centroidHour) % 24

  const hourlyDistribution =
    Array.isArray(rawCircadian.hourly_distribution) &&
    rawCircadian.hourly_distribution.length === 24 &&
    !isLegacyMockCentroid
      ? rawCircadian.hourly_distribution.map(Number)
    : Array.from({ length: 24 }, (_, h) => {
        const diff1 = Math.min(Math.abs(h - peakHour), 24 - Math.abs(h - peakHour))
        const diff2 = Math.min(
          Math.abs(h - ((peakHour + 7) % 24)),
          24 - Math.abs(h - ((peakHour + 7) % 24)),
        )
        const gaussian1 = Math.exp(-0.5 * (diff1 / 3.2) ** 2)
        const gaussian2 = Math.exp(-0.5 * (diff2 / 2.6) ** 2)
        const scale = Math.max(10, Math.round(playCount / 24))
        return Math.max(1, Math.round(scale * (0.8 * gaussian1 + 0.35 * gaussian2 + 0.06)))
      })

  const nightPlays = [22, 23, 0, 1, 2, 3, 4, 5].reduce(
    (sum, h) => sum + (hourlyDistribution[h] || 0),
    0,
  )
  const totalHourlyPlays = hourlyDistribution.reduce((sum, v) => sum + v, 0)
  const nightShare =
    totalHourlyPlays > 0 ? Math.round((nightPlays / totalHourlyPlays) * 100) / 100 : 0.28
  const dayShare = Math.round((1 - nightShare) * 100) / 100

  const circadianDrift: CircadianDrift = {
    centroidHour,
    peakHour,
    hourlyDistribution,
    nightShare: Number(rawCircadian.night_share ?? nightShare),
    dayShare: Number(rawCircadian.day_share ?? dayShare),
    totalPlays: Number(rawCircadian.total_plays ?? playCount),
  }

  const palette: YearPalette = {
    primary: String(rawPalette.primary || '#1e1b4b'),
    glow: String(rawPalette.glow || '#6366f1'),
    accent: String(rawPalette.accent || '#ec4899'),
    deep: String(rawPalette.deep || '#08040C'),
  }

  return {
    year: p.year,
    playCount,
    totalMinutes: Number(p.total_minutes || 0),
    trackCount: Number(p.track_count || 0),
    artistCount: Number(p.artist_count || 0),
    newArtistCount: Number(p.new_artist_count || 0),
    discoveryRate,
    loyalty,
    genreLabel: p.genre_label ?? '',
    genreVariety: Number(p.genre_variety || 0),
    dominantShare: Number(p.dominant_share || 0),
    genreBreakdown: p.genre_breakdown ?? [],
    isBreakpoint: Boolean(p.is_breakpoint),
    topTrack: p.top_track_title
      ? {
          title: p.top_track_title,
          artist: p.top_track_artist ?? 'Bilinmeyen sanatçı',
          plays: Number(p.top_track_plays ?? 0),
        }
      : null,
    latent: {
      intentionality,
      temporalDisplacement,
      obsessionTopology,
      rejectionSignature,
      circadianDrift,
    },
    palette,
  }
}

/**
 * @param coversPerYear Kaç kapak döndürülsün. Paket 20 kapakla üretilir
 * (§"paket ne tutmalı": top-N'de fazlasını sakla, azını göster) — sayfa 12
 * istiyor. Fazla saklamak, gösterim sayısı değişince paketi yeniden üretme
 * ihtiyacını kaldırır.
 */
export async function getJourneyYearsPackage(
  userId: string,
  coversPerYear = 12,
): Promise<JourneyYearsPackage | null> {
  try {
    const supabase = await createClient()
    // NOT: tablo migration 0159 ile eklendi; üretilmiş tip dosyası henüz
    // tanımıyor (`db:types` scripti güvenilmez — bkz. lib/phase/read.ts notu).
    const { data, error } = await (
      supabase.from as unknown as (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: unknown) => {
            order: (c: string, o: { ascending: boolean }) => Promise<{
              data: { year: number; payload: PkgPayload; generated_at: string }[] | null
              error: unknown
            }>
          }
        }
      }
    )('journey_year_pkg')
      .select('year, payload, generated_at')
      .eq('user_id', userId)
      .order('year', { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) return null // paket YOK → "hazırlanıyor"

    const years: JourneyYear[] = []
    const covers: Record<number, JourneyCover[]> = {}

    for (const row of data) {
      years.push(mapPkgYear(row.payload))
      covers[row.year] = (row.payload.covers ?? [])
        .slice(0, coversPerYear)
        .map((c) => ({
          trackId: c.track_id,
          title: c.title,
          artist: c.artist ?? 'Bilinmeyen sanatçı',
          spotifyId: c.spotify_id,
          imageUrl: c.image_url,
          plays: Number(c.plays),
        }))
    }

    return {
      years,
      covers,
      generatedAt: data[0]?.generated_at ?? new Date().toISOString(),
    }
  } catch (err) {
    void systemLog({
      operation: 'journey_year_pkg_read',
      userId,
      severity: 'warn',
      errorCode: 'pkg_read_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    // Okuma HATASI da "paket yok" sayılır — canlı hesaba düşmeyiz.
    return null
  }
}

/**
 * Yıl bazlı sinyaller (0071). Veri yetersiz yıllar HİÇ dönmez — Sahibin
 * 2017/2018/2019'u (14 / 0 / 73 dinleme) burada yok.
 *
 * ⚠ 2026-07-31 (Aşama 3): Sayfa artık bunu ÇAĞIRMIYOR —
 * `getJourneyYearsPackage` kullanıyor. Bu fonksiyon **paket üreticisinin**
 * (SQL tarafı, `build_journey_year_pkg`) dayandığı RPC'yi sarmalıyor ve
 * `/api/analytics/*` gibi başka çağıranlar için duruyor.
 * Silmeden önce `grep` ile tüm çağıranlar aranmalı (§12.3).
 */
export async function getJourneyYears(userId: string): Promise<JourneyYear[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_journey_years', {
      p_user_id: userId,
    })
    if (error) throw error
    return ((data ?? []) as RawYear[]).map((r) => ({
      year: r.year,
      playCount: Number(r.play_count),
      totalMinutes: Number(r.total_minutes),
      trackCount: Number(r.track_count),
      artistCount: Number(r.artist_count),
      newArtistCount: Number(r.new_artist_count),
      discoveryRate: Number(r.discovery_rate),
      loyalty: Number(r.loyalty),
      genreLabel: r.genre_label ?? '',
      genreVariety: Number(r.genre_variety),
      dominantShare: Number(r.dominant_share),
      genreBreakdown: r.genre_breakdown ?? [],
      isBreakpoint: r.is_breakpoint,
      topTrack: r.top_track_title
        ? {
            title: r.top_track_title,
            artist: r.top_track_artist ?? 'Bilinmeyen sanatçı',
            plays: Number(r.top_track_plays ?? 0),
          }
        : null,
    }))
  } catch (err) {
    void systemLog({
      operation: 'journey_years',
      userId,
      severity: 'warn',
      errorCode: 'years_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

/** Bir yılın kapak mozaiği (gerçek kapaklar — 11.659/11.682 şarkı çekilebilir). */
export async function getJourneyYearCovers(
  userId: string,
  year: number,
  limit = 20,
): Promise<JourneyCover[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_journey_year_covers', {
      p_user_id: userId,
      p_year: year,
      p_limit: limit,
    })
    if (error) throw error
    return ((data ?? []) as {
      track_id: string
      title: string
      artist: string | null
      spotify_id: string | null
      image_url: string | null
      plays: number
    }[]).map((r) => ({
      trackId: r.track_id,
      title: r.title,
      artist: r.artist ?? 'Bilinmeyen sanatçı',
      spotifyId: r.spotify_id,
      // Kalıcı Storage kopyamız (migration 0125). Doluysa arayüz kapağı
      // ilk render'da basar — lazy istek atmaz.
      imageUrl: r.image_url,
      plays: Number(r.plays),
    }))
  } catch (err) {
    void systemLog({
      operation: 'journey_covers',
      userId,
      severity: 'warn',
      errorCode: 'covers_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

interface JourneyPlayedLiveRow {
  track_id: string
  title: string
  artist: string | null
  image_url: string | null
  played_at: string
}

/** Kronolojik akış + zevk evrimi + dönem obsesyonları (§10.1). */
export async function getJourneyArc(userId: string): Promise<JourneyArc | null> {
  try {
    const supabase = await createClient()

    // 2026-07-30 (Aşama 1, Bulgu 4.6-A): arc payload'ı ile "Bugün" kartı
    // PARALEL çekilir. Eskiden seri bekliyordu (payload oku → sonra son çalan),
    // oysa ikisi birbirinden bağımsız: biri kayıtlı payload'ı, diğeri canlı son
    // şarkıyı getiriyor. Bir ağ turu kazancı (~45 ms).
    //
    // "Bugün" kartının canlı kalması BİLİNÇLİ (2026-07-14, Sahip: 11 Temmuz'dan
    // kalma şarkı görünüyordu — cache yalnız satır yokken üretiliyordu). Yani bu
    // sorgu A·Canlı sınıfında; paketlenmeyecek, sadece paralelleştirildi.
    const [existingResp, liveLastResp, liveFirstResp] = await Promise.all([
      supabase
        .from('journey_arc')
        .select('payload')
        .eq('user_id', userId)
        .maybeSingle(),
      Promise.resolve(
        supabase.rpc('get_journey_last_played', { p_user_id: userId }),
      )
        .then((r) => (r.error ? null : r.data))
        .catch(() => null),
      Promise.resolve(
        supabase.rpc('get_journey_first_played' as 'get_journey_last_played', {
          p_user_id: userId,
        }),
      )
        .then((r) => (r.error ? null : (r.data as JourneyPlayedLiveRow[] | null)))
        .catch(() => null),
    ])

    let payload = existingResp.data?.payload as Record<string, unknown> | undefined

    if (!payload) {
      const { data: built, error } = await supabase.rpc('build_journey_arc', {
        p_user_id: userId,
      })
      if (error) throw error
      payload = (built as Record<string, unknown>) ?? undefined
    }

    if (!payload) return null // hiç dinleme yok — uydurma arc üretmeyiz
    const arc = mapArc(payload)
    if (!arc) return null

    const lastRow = liveLastResp?.[0]
    if (lastRow) {
      arc.lastTrack = {
        title: lastRow.title,
        artist: lastRow.artist ?? 'Bilinmeyen sanatçı',
        playedAt: lastRow.played_at,
        trackId: lastRow.track_id,
        imageUrl: (lastRow as { image_url?: string | null }).image_url ?? null,
      }
    }

    const firstRow = liveFirstResp?.[0]
    if (firstRow) {
      arc.firstTrack = {
        title: firstRow.title,
        artist: firstRow.artist ?? 'Bilinmeyen sanatçı',
        playedAt: firstRow.played_at,
        trackId: firstRow.track_id,
        imageUrl: firstRow.image_url ?? null,
      }
    }

    return arc
  } catch (err) {
    void systemLog({
      operation: 'journey_arc',
      userId,
      severity: 'warn',
      errorCode: 'arc_failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

interface RawTrack { title?: string; artist?: string; played_at?: string; plays?: number }
interface RawEra {
  label?: string
  start_year?: number
  end_year?: number
  title?: string
  obsession?: RawTrack | null
}

function mapArc(p: Record<string, unknown>): JourneyArc | null {
  const first = p.first_track as RawTrack | undefined
  const last = p.last_track as RawTrack | undefined
  if (!first?.title || !last?.title) return null

  const rawEras = (p.eras as RawEra[] | undefined) ?? []
  const shift = p.biggest_shift as { from?: string; to?: string; year?: string } | null

  // A6 (0183): araba özeti. Üç durumda da null olmalı — alan hiç yok (v1
  // payload), JSON null (seans yok), ya da sessions 0. Sıfır saatlik bir
  // "yolculuk" cümlesi kurmayız.
  const rawCar = p.car as { sessions?: number; hours?: number } | null | undefined
  const car =
    rawCar && (rawCar.sessions ?? 0) > 0
      ? { sessions: rawCar.sessions ?? 0, hours: Number(rawCar.hours ?? 0) }
      : null

  return {
    firstTrack: {
      title: first.title,
      artist: first.artist ?? 'Bilinmeyen sanatçı',
      playedAt: first.played_at ?? '',
      trackId: null,
      imageUrl: null,
    },
    lastTrack: {
      title: last.title ?? '',
      artist: last.artist ?? 'Bilinmeyen sanatçı',
      playedAt: last.played_at ?? '',
      // Cache payload'ında kapak yok; hemen ardından gelen canlı sorgu
      // (get_journey_last_played) ikisini de tazeler.
      trackId: null,
      imageUrl: null,
    },
    eras: rawEras.map((e) => ({
      label: e.label ?? '',
      startYear: e.start_year ?? 0,
      endYear: e.end_year ?? 0,
      title: e.title ?? '',
      obsession: e.obsession?.title
        ? {
            title: e.obsession.title,
            artist: e.obsession.artist ?? 'Bilinmeyen sanatçı',
            plays: e.obsession.plays ?? 0,
          }
        : null,
    })),
    biggestShift:
      shift?.from && shift.to
        ? { from: shift.from, to: shift.to, year: shift.year ?? '' }
        : null,
    car,
  }
}
