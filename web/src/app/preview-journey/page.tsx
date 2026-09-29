import { JourneyView } from '@/components/journey/journey-view'
import type { JourneyArc, JourneyYear, JourneyCover } from '@/lib/journey/types'

export const metadata = {
  title: 'Journey Visual Preview | Rosso',
}

function makeCovers(year: number): JourneyCover[] {
  const titles = [
    ['Midnight City', 'M83'],
    ['Starboy', 'The Weeknd'],
    ['Instant Crush', 'Daft Punk'],
    ['Nightcall', 'Kavinsky'],
    ['After Hours', 'The Weeknd'],
    ['Blinding Lights', 'The Weeknd'],
    ['Resonance', 'HOME'],
    ['Space Song', 'Beach House'],
    ['Chamber of Reflection', 'Mac DeMarco'],
    ['The Less I Know The Better', 'Tame Impala'],
    ['Breathe Deeper', 'Tame Impala'],
    ['Borderline', 'Tame Impala'],
  ]
  return titles.map(([title, artist], idx) => ({
    trackId: `t-${year}-${idx}`,
    title,
    artist,
    spotifyId: null,
    imageUrl: null,
    plays: 140 - idx * 8,
  }))
}

const mockYears: JourneyYear[] = [
  {
    year: 2021,
    playCount: 12450,
    totalMinutes: 38200,
    trackCount: 1840,
    artistCount: 620,
    newArtistCount: 410,
    discoveryRate: 0.68,
    loyalty: 4.8,
    genreLabel: 'Indie Pop',
    genreVariety: 38,
    dominantShare: 0.28,
    genreBreakdown: [
      { label: 'Indie Pop', share: 0.28 },
      { label: 'Synthwave', share: 0.24 },
      { label: 'Alternative', share: 0.18 },
      { label: 'Electronic', share: 0.14 },
    ],
    isBreakpoint: false,
    topTrack: { title: 'Midnight City', artist: 'M83', plays: 142 },
    latent: {
      intentionality: {
        agencyScore: 0.72,
        clickrowCount: 450,
        backbtnCount: 120,
        fwdbtnCount: 60,
        shuffleRate: 0.22,
        totalPlays: 12450,
        sessionCount: 380,
        passiveSessionCount: 90,
        passivePlayCount: 3200,
        activePlayCount: 9250,
      },
      temporalDisplacement: {
        meanDisplacement: -3.2,
        medianDisplacement: -2,
        tag: 'contemporary',
        contemporaryShare: 0.65,
        nostalgiaShare: 0.25,
        archivalShare: 0.1,
        sampleSize: 12450,
      },
      obsessionTopology: {
        comets: [
          { trackId: 'c1', title: 'Solar Power', artist: 'Lorde', plays: 98, kurtosis: 4.8, imageUrl: null },
          { trackId: 'c2', title: 'Silk Chiffon', artist: 'MUNA', plays: 84, kurtosis: 4.2, imageUrl: null },
          { trackId: 'c3', title: 'Chaeri', artist: 'Magdalena Bay', plays: 76, kurtosis: 3.9, imageUrl: null },
        ],
        pillars: [
          { trackId: 'p1', title: 'Midnight City', artist: 'M83', plays: 142, activeMonths: 11, imageUrl: null },
          { trackId: 'p2', title: 'Space Song', artist: 'Beach House', plays: 118, activeMonths: 10, imageUrl: null },
          { trackId: 'p3', title: 'Resonance', artist: 'HOME', plays: 95, activeMonths: 9, imageUrl: null },
        ],
        cometCount: 3,
        pillarCount: 3,
      },
      rejectionSignature: {
        immediateRejections: 140,
        immediateRejectionRate: 0.048,
        dopamineRestlessnessEvents: 18,
        talismanTracks: [
          { trackId: 't1', title: 'Midnight City', artist: 'M83', plays: 142, skipRate: 0.01, imageUrl: null },
          { trackId: 't2', title: 'Space Song', artist: 'Beach House', plays: 118, skipRate: 0.02, imageUrl: null },
        ],
        totalSkips: 890,
        overallSkipRate: 0.071,
      },
      circadianDrift: {
        centroidHour: 23.4,
        peakHour: 23,
        hourlyDistribution: [
          120, 80, 40, 20, 10, 5, 12, 35, 85, 140, 190, 220,
          260, 280, 310, 340, 420, 540, 680, 820, 960, 1100, 1250, 1180
        ],
        nightShare: 0.44,
        dayShare: 0.56,
        totalPlays: 12450,
      },
    },
    palette: {
      primary: '#312e81',
      glow: '#818cf8',
      accent: '#c084fc',
      deep: '#070614',
    },
  },
  {
    year: 2022,
    playCount: 18920,
    totalMinutes: 58400,
    trackCount: 2640,
    artistCount: 890,
    newArtistCount: 580,
    discoveryRate: 0.74,
    loyalty: 5.4,
    genreLabel: 'Synthwave',
    genreVariety: 46,
    dominantShare: 0.32,
    genreBreakdown: [
      { label: 'Synthwave', share: 0.32 },
      { label: 'Nu-Disco', share: 0.26 },
      { label: 'French House', share: 0.22 },
      { label: 'Darksynth', share: 0.20 },
    ],
    isBreakpoint: true,
    topTrack: { title: 'Starboy', artist: 'The Weeknd', plays: 188 },
    latent: {
      intentionality: {
        agencyScore: 0.84,
        clickrowCount: 680,
        backbtnCount: 190,
        fwdbtnCount: 45,
        shuffleRate: 0.16,
        totalPlays: 18920,
        sessionCount: 520,
        passiveSessionCount: 65,
        passivePlayCount: 2800,
        activePlayCount: 16120,
      },
      temporalDisplacement: {
        meanDisplacement: -5.4,
        medianDisplacement: -4,
        tag: 'contemporary',
        contemporaryShare: 0.58,
        nostalgiaShare: 0.32,
        archivalShare: 0.1,
        sampleSize: 18920,
      },
      obsessionTopology: {
        comets: [
          { trackId: 'c21', title: 'Running Up That Hill', artist: 'Kate Bush', plays: 132, kurtosis: 5.6, imageUrl: null },
          { trackId: 'c22', title: 'As It Was', artist: 'Harry Styles', plays: 110, kurtosis: 4.5, imageUrl: null },
        ],
        pillars: [
          { trackId: 'p21', title: 'Starboy', artist: 'The Weeknd', plays: 188, activeMonths: 12, imageUrl: null },
          { trackId: 'p22', title: 'Nightcall', artist: 'Kavinsky', plays: 164, activeMonths: 11, imageUrl: null },
          { trackId: 'p23', title: 'Instant Crush', artist: 'Daft Punk', plays: 146, activeMonths: 10, imageUrl: null },
        ],
        cometCount: 2,
        pillarCount: 3,
      },
      rejectionSignature: {
        immediateRejections: 110,
        immediateRejectionRate: 0.032,
        dopamineRestlessnessEvents: 12,
        talismanTracks: [
          { trackId: 't21', title: 'Starboy', artist: 'The Weeknd', plays: 188, skipRate: 0.008, imageUrl: null },
          { trackId: 't22', title: 'Nightcall', artist: 'Kavinsky', plays: 164, skipRate: 0.012, imageUrl: null },
        ],
        totalSkips: 620,
        overallSkipRate: 0.038,
      },
      circadianDrift: {
        centroidHour: 1.8,
        peakHour: 1,
        hourlyDistribution: [
          1450, 1620, 1100, 600, 180, 50, 20, 40, 90, 180, 310, 420,
          490, 520, 580, 640, 780, 920, 1150, 1340, 1480, 1550, 1600, 1540
        ],
        nightShare: 0.62,
        dayShare: 0.38,
        totalPlays: 18920,
      },
    },
    palette: {
      primary: '#4c1d95',
      glow: '#a855f7',
      accent: '#ec4899',
      deep: '#090514',
    },
  },
  {
    year: 2023,
    playCount: 24800,
    totalMinutes: 76500,
    trackCount: 3100,
    artistCount: 1120,
    newArtistCount: 680,
    discoveryRate: 0.61,
    loyalty: 6.8,
    genreLabel: 'Electronic & Ambient',
    genreVariety: 54,
    dominantShare: 0.34,
    genreBreakdown: [
      { label: 'Electronic', share: 0.34 },
      { label: 'Ambient', share: 0.26 },
      { label: 'Post-Rock', share: 0.22 },
      { label: 'Downtempo', share: 0.18 },
    ],
    isBreakpoint: false,
    topTrack: { title: 'Resonance', artist: 'HOME', plays: 245 },
    latent: {
      intentionality: {
        agencyScore: 0.89,
        clickrowCount: 920,
        backbtnCount: 280,
        fwdbtnCount: 35,
        shuffleRate: 0.11,
        totalPlays: 24800,
        sessionCount: 640,
        passiveSessionCount: 45,
        passivePlayCount: 2100,
        activePlayCount: 22700,
      },
      temporalDisplacement: {
        meanDisplacement: -8.1,
        medianDisplacement: -6,
        tag: 'archival',
        contemporaryShare: 0.42,
        nostalgiaShare: 0.38,
        archivalShare: 0.2,
        sampleSize: 24800,
      },
      obsessionTopology: {
        comets: [
          { trackId: 'c31', title: 'Strangers', artist: 'Kenya Grace', plays: 160, kurtosis: 6.2, imageUrl: null },
          { trackId: 'c32', title: 'Paint The Town Red', artist: 'Doja Cat', plays: 135, kurtosis: 4.8, imageUrl: null },
        ],
        pillars: [
          { trackId: 'p31', title: 'Resonance', artist: 'HOME', plays: 245, activeMonths: 12, imageUrl: null },
          { trackId: 'p32', title: 'After Hours', artist: 'The Weeknd', plays: 210, activeMonths: 11, imageUrl: null },
          { trackId: 'p33', title: 'Chamber of Reflection', artist: 'Mac DeMarco', plays: 185, activeMonths: 11, imageUrl: null },
        ],
        cometCount: 2,
        pillarCount: 3,
      },
      rejectionSignature: {
        immediateRejections: 85,
        immediateRejectionRate: 0.021,
        dopamineRestlessnessEvents: 8,
        talismanTracks: [
          { trackId: 't31', title: 'Resonance', artist: 'HOME', plays: 245, skipRate: 0.005, imageUrl: null },
          { trackId: 't32', title: 'After Hours', artist: 'The Weeknd', plays: 210, skipRate: 0.007, imageUrl: null },
        ],
        totalSkips: 510,
        overallSkipRate: 0.026,
      },
      circadianDrift: {
        centroidHour: 19.5,
        peakHour: 20,
        hourlyDistribution: [
          420, 210, 110, 45, 20, 15, 60, 140, 320, 680, 940, 1280,
          1420, 1580, 1690, 1850, 2100, 2480, 2850, 3100, 2900, 2300, 1450, 810
        ],
        nightShare: 0.32,
        dayShare: 0.68,
        totalPlays: 24800,
      },
    },
    palette: {
      primary: '#064e3b',
      glow: '#10b981',
      accent: '#34d399',
      deep: '#03140e',
    },
  },
  {
    year: 2024,
    playCount: 31200,
    totalMinutes: 98100,
    trackCount: 3950,
    artistCount: 1450,
    newArtistCount: 920,
    discoveryRate: 0.78,
    loyalty: 7.2,
    genreLabel: 'Psychedelic Rock & Indie',
    genreVariety: 62,
    dominantShare: 0.36,
    genreBreakdown: [
      { label: 'Psychedelic Rock', share: 0.36 },
      { label: 'Indie Rock', share: 0.28 },
      { label: 'Neo-Psychedelia', share: 0.20 },
      { label: 'Dream Pop', share: 0.16 },
    ],
    isBreakpoint: false,
    topTrack: { title: 'The Less I Know The Better', artist: 'Tame Impala', plays: 310 },
    latent: {
      intentionality: {
        agencyScore: 0.93,
        clickrowCount: 1250,
        backbtnCount: 340,
        fwdbtnCount: 40,
        shuffleRate: 0.08,
        totalPlays: 31200,
        sessionCount: 780,
        passiveSessionCount: 38,
        passivePlayCount: 1900,
        activePlayCount: 29300,
      },
      temporalDisplacement: {
        meanDisplacement: -6.8,
        medianDisplacement: -5,
        tag: 'contemporary',
        contemporaryShare: 0.54,
        nostalgiaShare: 0.32,
        archivalShare: 0.14,
        sampleSize: 31200,
      },
      obsessionTopology: {
        comets: [
          { trackId: 'c41', title: 'Espresso', artist: 'Sabrina Carpenter', plays: 195, kurtosis: 5.8, imageUrl: null },
          { trackId: 'c42', title: 'Birds of a Feather', artist: 'Billie Eilish', plays: 180, kurtosis: 5.1, imageUrl: null },
        ],
        pillars: [
          { trackId: 'p41', title: 'The Less I Know The Better', artist: 'Tame Impala', plays: 310, activeMonths: 12, imageUrl: null },
          { trackId: 'p42', title: 'Breathe Deeper', artist: 'Tame Impala', plays: 275, activeMonths: 12, imageUrl: null },
          { trackId: 'p43', title: 'Borderline', artist: 'Tame Impala', plays: 230, activeMonths: 11, imageUrl: null },
        ],
        cometCount: 2,
        pillarCount: 3,
      },
      rejectionSignature: {
        immediateRejections: 65,
        immediateRejectionRate: 0.015,
        dopamineRestlessnessEvents: 5,
        talismanTracks: [
          { trackId: 't41', title: 'The Less I Know The Better', artist: 'Tame Impala', plays: 310, skipRate: 0.003, imageUrl: null },
          { trackId: 't42', title: 'Breathe Deeper', artist: 'Tame Impala', plays: 275, skipRate: 0.004, imageUrl: null },
        ],
        totalSkips: 420,
        overallSkipRate: 0.018,
      },
      circadianDrift: {
        centroidHour: 15.6,
        peakHour: 16,
        hourlyDistribution: [
          180, 90, 40, 20, 10, 10, 45, 180, 520, 980, 1540, 2100,
          2650, 2980, 3250, 3600, 3850, 3420, 2850, 2100, 1520, 980, 510, 280
        ],
        nightShare: 0.22,
        dayShare: 0.78,
        totalPlays: 31200,
      },
    },
    palette: {
      primary: '#78350f',
      glow: '#f59e0b',
      accent: '#fbbf24',
      deep: '#140a02',
    },
  },
]

const mockCovers: Record<number, JourneyCover[]> = {
  2021: makeCovers(2021),
  2022: makeCovers(2022),
  2023: makeCovers(2023),
  2024: makeCovers(2024),
}

const mockArc: JourneyArc = {
  firstTrack: {
    title: 'Midnight City',
    artist: 'M83',
    imageUrl: null,
    playedAt: '2021-02-14T21:40:00Z',
    trackId: 'first-1',
  },
  lastTrack: {
    title: 'The Less I Know The Better',
    artist: 'Tame Impala',
    imageUrl: null,
    playedAt: '2024-12-31T23:55:00Z',
    trackId: 'last-1',
  },
  eras: [
    {
      label: 'Golden Exploration',
      startYear: 2021,
      endYear: 2022,
      title: 'Neon Odyssey',
      obsession: { title: 'Starboy', artist: 'The Weeknd', plays: 188 },
    },
    {
      label: 'Deep Frequency',
      startYear: 2023,
      endYear: 2024,
      title: 'Atmospheric Radiance',
      obsession: { title: 'Resonance', artist: 'HOME', plays: 245 },
    },
  ],
  car: {
    sessions: 420,
    hours: 184,
  },
  biggestShift: {
    from: 'Synthwave',
    to: 'Psychedelic Rock',
    year: '2023',
  },
}

export default function PreviewJourneyPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#050508' }}>
      <JourneyView
        arc={mockArc}
        years={mockYears}
        covers={mockCovers}
        vibeCardId="neon-drifter"
        userId="preview-user"
        carSessionsNode={null}
        hasL3={false}
      />
    </main>
  )
}
