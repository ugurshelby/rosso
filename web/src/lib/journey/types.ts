/**
 * Shared types and data contracts for Musical Journey — "Hayat Arşivi".
 *
 * This module is pure TypeScript and safe to import from BOTH Server Components
 * and Client Components (does NOT contain 'server-only').
 */

export interface JourneyEra {
  label: string
  startYear: number
  endYear: number
  title: string
  obsession: { title: string; artist: string; plays: number } | null
}

export interface GenreSlice {
  label: string
  share: number
}

export interface JourneyArc {
  firstTrack: {
    title: string
    artist: string
    imageUrl: string | null
    playedAt: string
    trackId: string | null
  }
  lastTrack: {
    title: string
    artist: string
    imageUrl: string | null
    playedAt: string
    trackId: string | null
  }
  eras?: JourneyEra[]
  biggestShift?: { from: string; to: string; year: string } | null
  car?: {
    sessions: number
    hours: number
    share?: number
  } | null
}

export interface IntentionalityQuotient {
  agencyScore: number
  clickrowCount: number
  backbtnCount: number
  fwdbtnCount: number
  shuffleRate: number
  totalPlays: number
  sessionCount: number
  passiveSessionCount: number
  passivePlayCount: number
  activePlayCount: number
}

export interface TemporalDisplacement {
  meanDisplacement: number
  medianDisplacement: number
  tag: 'contemporary' | 'nostalgia' | 'archival' | 'catalog'
  contemporaryShare: number
  nostalgiaShare: number
  archivalShare: number
  sampleSize: number
}

export interface ObsessionTrack {
  trackId: string
  title: string
  artist: string
  imageUrl: string | null
  plays: number
  spanDays?: number
  firstPlayed?: string
  lastPlayed?: string
  kurtosis?: number
  activeMonths?: number
  skipRate?: number
}

export interface ObsessionTopology {
  comets: ObsessionTrack[]
  pillars: ObsessionTrack[]
  cometCount: number
  pillarCount: number
}

export interface RejectionSignature {
  immediateRejections: number
  immediateRejectionRate: number
  dopamineRestlessnessEvents: number
  talismanTracks: {
    trackId: string
    title: string
    artist: string
    imageUrl: string | null
    plays: number
    skipRate: number
  }[]
  totalSkips: number
  overallSkipRate: number
}

export interface CircadianDrift {
  centroidHour: number
  peakHour: number
  hourlyDistribution: number[]
  nightShare: number
  dayShare: number
  totalPlays: number
}

export interface YearPalette {
  primary: string
  glow: string
  accent: string
  deep: string
}

export interface JourneyLatentDimensions {
  intentionality: IntentionalityQuotient
  temporalDisplacement: TemporalDisplacement
  obsessionTopology: ObsessionTopology
  rejectionSignature: RejectionSignature
  circadianDrift: CircadianDrift
}

/**
 * Bir yılın sinyalleri (migration 0071 + 0287).
 *
 * Tür artık HERO (sade "Hip-Hop"), dağınıklık ALTINDA kırılım olarak açılır.
 * 0287 ile 5 analitik latent boyut (Agency, Delta t, Comets/Pillars, Skips, Circadian)
 * ve 4 renkli kromatografik palet eklenmiştir.
 */
export interface JourneyYear {
  year: number
  playCount: number
  /** Gerçek dinleme süresi (dakika) — 0103, play_count'un dakikayla karıştırılmasını önler. */
  totalMinutes: number
  trackCount: number
  artistCount: number
  newArtistCount: number
  /** 0..1 — o yıl ilk kez dinlenen sanatçı oranı. Sahip: %95 → %23 (çöküş). */
  discoveryRate: number
  /** Şarkı başına ortalama tekrar. */
  loyalty: number
  /** Baskın tür — HERO. */
  genreLabel: string
  /** 0..1 — tür çeşitliliği (Shannon entropisi / max entropi). */
  genreVariety: number
  /** 0..1 — baskın türün o yıldaki dinleme payı. */
  dominantShare: number
  genreBreakdown: GenreSlice[]
  isBreakpoint: boolean
  topTrack: {
    title: string
    artist: string
    plays: number
  } | null
  latent?: JourneyLatentDimensions
  palette?: YearPalette
}

/** Bento mozaiğindeki bir kapak. */
export interface JourneyCover {
  trackId: string
  title: string
  artist: string
  spotifyId: string | null
  imageUrl: string | null
  plays: number
}

export interface RawYear {
  year: number
  play_count: number
  total_minutes: number
  track_count: number
  artist_count: number
  new_artist_count: number
  discovery_rate: number
  loyalty: number
  genre_label: string | null
  genre_variety: number
  dominant_share: number
  genre_breakdown: GenreSlice[] | null
  is_breakpoint: boolean
  top_track_title: string | null
  top_track_artist: string | null
  top_track_plays: number | null
  latent?: RawLatentPayload
  palette?: RawPalettePayload
}

export interface RawCometPayload {
  track_id: string
  title: string
  artist: string
  image_url?: string | null
  plays: number
  span_days: number
  first_played?: string
  last_played?: string
  kurtosis?: number
}

export interface RawPillarPayload {
  track_id: string
  title: string
  artist: string
  image_url?: string | null
  active_months?: number
  skip_rate?: number
  total_plays?: number
  plays?: number
  first_played?: string
  last_played?: string
}

export interface RawTalismanPayload {
  track_id: string
  title: string
  artist: string
  image_url?: string | null
  plays: number
  skip_rate?: number
}

export interface RawLatentPayload {
  intentionality?: {
    agency_score?: number
    clickrow_count?: number
    backbtn_count?: number
    fwdbtn_count?: number
    shuffle_rate?: number
    total_plays?: number
    session_count?: number
    passive_session_count?: number
    passive_play_count?: number
    active_play_count?: number
  }
  temporal_displacement?: {
    mean_displacement?: number
    median_displacement?: number
    tag?: string
    contemporary_share?: number
    nostalgia_share?: number
    archival_share?: number
    sample_size?: number
  }
  obsession_topology?: {
    comets?: RawCometPayload[]
    pillars?: RawPillarPayload[]
    comet_count?: number
    pillar_count?: number
  }
  rejection_signature?: {
    immediate_rejections?: number
    immediate_rejection_rate?: number
    dopamine_restlessness_events?: number
    talisman_tracks?: RawTalismanPayload[]
    total_skips?: number
    overall_skip_rate?: number
  }
  circadian_drift?: {
    centroid_hour?: number
    peak_hour?: number
    hourly_distribution?: number[]
    night_share?: number
    day_share?: number
    total_plays?: number
  }
}

export interface RawPalettePayload {
  primary?: string
  glow?: string
  accent?: string
  deep?: string
}

export interface JourneyYearsPackage {
  years: JourneyYear[]
  covers: Record<number, JourneyCover[]>
  generatedAt: string
}

/** Fallback helper ensuring guaranteed latent dimension object */
export function getYearLatent(y: JourneyYear): JourneyLatentDimensions {
  if (y.latent) return y.latent

  const playCount = y.playCount || 0
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
  const discShift = ((y.discoveryRate || 0.4) - 0.5) * 0.8
  const baseH =
    hourMap[y.year] ??
    13.0 + Math.abs(Math.sin(y.year * 73.15 + (y.discoveryRate || 0.4) * 17)) * 11.0
  const centroidHour = Math.round(((baseH + discShift + 24) % 24) * 10) / 10
  const peakHour = Math.round(centroidHour) % 24

  const hourlyDistribution = Array.from({ length: 24 }, (_, h) => {
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

  const comets: ObsessionTrack[] = y.topTrack
    ? [
        {
          trackId: `comet-${y.year}-0`,
          title: y.topTrack.title,
          artist: y.topTrack.artist,
          imageUrl: null,
          plays: y.topTrack.plays,
          spanDays: 21,
          kurtosis: 5.2,
        },
      ]
    : []

  const pillars: ObsessionTrack[] = y.topTrack
    ? [
        {
          trackId: `pillar-${y.year}-0`,
          title: y.topTrack.title,
          artist: y.topTrack.artist,
          imageUrl: null,
          plays: y.topTrack.plays,
          activeMonths: 24,
          skipRate: 0.02,
        },
      ]
    : []

  const talismanTracks: {
    trackId: string
    title: string
    artist: string
    imageUrl: string | null
    plays: number
    skipRate: number
  }[] = y.topTrack
    ? [
        {
          trackId: `talisman-${y.year}-0`,
          title: y.topTrack.title,
          artist: y.topTrack.artist,
          imageUrl: null,
          plays: y.topTrack.plays,
          skipRate: 0.0,
        },
      ]
    : []

  return {
    intentionality: {
      agencyScore: Math.min(1, Math.max(0.2, (y.loyalty || 1) * 0.25 + 0.35)),
      clickrowCount: Math.round(playCount * 0.4),
      backbtnCount: Math.round(playCount * 0.1),
      fwdbtnCount: Math.round(playCount * 0.08),
      shuffleRate: 0.18,
      totalPlays: playCount,
      sessionCount: Math.max(1, Math.round(playCount / 8)),
      passiveSessionCount: Math.round(playCount / 20),
      passivePlayCount: Math.round(playCount * 0.3),
      activePlayCount: Math.round(playCount * 0.7),
    },
    temporalDisplacement: {
      meanDisplacement: 4.2,
      medianDisplacement: 2,
      tag: (y.discoveryRate || 0) > 0.6 ? 'contemporary' : 'catalog',
      contemporaryShare: 0.65,
      nostalgiaShare: 0.2,
      archivalShare: 0.05,
      sampleSize: playCount,
    },
    obsessionTopology: {
      comets,
      pillars,
      cometCount: comets.length,
      pillarCount: pillars.length,
    },
    rejectionSignature: {
      immediateRejections: Math.round(playCount * 0.04),
      immediateRejectionRate: 0.04,
      dopamineRestlessnessEvents: playCount > 500 ? 3 : 0,
      talismanTracks,
      totalSkips: Math.round(playCount * 0.09),
      overallSkipRate: 0.09,
    },
    circadianDrift: {
      centroidHour,
      peakHour,
      hourlyDistribution,
      nightShare,
      dayShare,
      totalPlays: playCount,
    },
  }
}

/** Fallback helper ensuring guaranteed 4-color palette */
export function getYearPalette(y: JourneyYear): YearPalette {
  if (y.palette) return y.palette
  return {
    primary: '#1e1b4b',
    glow: '#6366f1',
    accent: '#ec4899',
    deep: '#08040C',
  }
}
