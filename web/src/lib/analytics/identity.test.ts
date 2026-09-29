import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Supabase server client — identity.ts artık tamamen RPC tabanlı (0106).
//
// NOT (§1.65 / §1.5): eski testler .range() sayfalama zincirini mock'luyordu.
// O sayfalama canlıda PostgREST'in 1000-satır tavanına takılıp verinin %99'unu
// görmüyordu — yani testler yanlış gerçeği koruyordu. Fonksiyonlar DB tarafında
// toplayan RPC'lere taşındı (migration 0106); testler artık RPC sözleşmesini
// (fonksiyon adı + parametre + dönüş şekli) doğrular.
// ---------------------------------------------------------------------------

let mockRpcResults: Record<string, unknown>
let mockRpcError: { message: string } | null = null

const rpcMock = vi.fn(async (fn: string) => ({
  data: mockRpcError ? null : (mockRpcResults[fn] ?? null),
  error: mockRpcError,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc: rpcMock,
  })),
}))

// ---------------------------------------------------------------------------
// Import after mock is set up
// ---------------------------------------------------------------------------

import {
  getChronotype,
  getLoyalArtists,
  getGenreDistribution,
  getEraShift,
} from './identity'

beforeEach(() => {
  mockRpcResults = {}
  mockRpcError = null
  rpcMock.mockClear()
})

// Saatlik RPC satırları üretici: verilen saatlere verilen sayıda çalma.
function hourRows(counts: Record<number, number>) {
  return Object.entries(counts).map(([hour, play_count]) => ({
    hour: Number(hour),
    play_count,
  }))
}

// ---------------------------------------------------------------------------
// getChronotype
// ---------------------------------------------------------------------------

describe('getChronotype', () => {
  it('returns correct label "Gece Dinleyicisi" when peak is at hour 23', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 23: 25 })

    const result = await getChronotype('user-1')

    expect(result.available).toBe(true)
    expect(result.label).toBe('Gece Dinleyicisi')
    expect(result.peakHour).toBe(23)
    expect(result.peakHourLabel).toBe('23:00')
    expect(rpcMock).toHaveBeenCalledWith('user_hourly_play_counts', { p_user_id: 'user-1' })
  })

  it('returns correct label "Sabah Dinleyicisi" when peak is at hour 8', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 8: 25 })

    const result = await getChronotype('user-1')

    expect(result.available).toBe(true)
    expect(result.label).toBe('Sabah Dinleyicisi')
  })

  it('returns correct label "Öğle Dinleyicisi" when peak is at hour 13', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 13: 25 })

    const result = await getChronotype('user-1')

    expect(result.available).toBe(true)
    expect(result.label).toBe('Öğle Dinleyicisi')
  })

  it('returns correct label "Akşam Dinleyicisi" when peak is at hour 19', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 19: 25 })

    const result = await getChronotype('user-1')

    expect(result.available).toBe(true)
    expect(result.label).toBe('Akşam Dinleyicisi')
  })

  it('returns available: false when fewer than 20 total plays', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 23: 15 })

    const result = await getChronotype('user-1')

    expect(result.available).toBe(false)
  })

  it('returns available: false when exactly 19 plays (boundary)', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 10: 9, 23: 10 })

    const result = await getChronotype('user-1')

    expect(result.available).toBe(false)
  })

  it('returns available: false on DB error', async () => {
    mockRpcError = { message: 'DB boom' }

    const result = await getChronotype('user-1')

    expect(result.available).toBe(false)
  })

  it('always returns exactly 24 hourlyData entries when available', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 14: 20 })

    const result = await getChronotype('user-1')

    expect(result.available).toBe(true)
    expect(result.hourlyData).toHaveLength(24)
  })

  it('hourlyData has 24 entries in order 0–23', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 14: 20 })

    const result = await getChronotype('user-1')

    result.hourlyData.forEach(({ hour }, idx) => {
      expect(hour).toBe(idx)
    })
  })

  it('fills missing hours with 0 play_count', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 14: 20 })

    const result = await getChronotype('user-1')

    const hour0 = result.hourlyData.find((h) => h.hour === 0)
    expect(hour0?.play_count).toBe(0)

    const hour14 = result.hourlyData.find((h) => h.hour === 14)
    expect(hour14?.play_count).toBe(20)
  })

  it('peak hour at boundary 22 → Gece Dinleyicisi', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 22: 20 })

    const result = await getChronotype('user-1')

    expect(result.label).toBe('Gece Dinleyicisi')
  })

  it('peak hour at boundary 5 → Gece Dinleyicisi', async () => {
    mockRpcResults['user_hourly_play_counts'] = hourRows({ 5: 20 })

    const result = await getChronotype('user-1')

    expect(result.label).toBe('Gece Dinleyicisi')
  })
})

// ---------------------------------------------------------------------------
// getLoyalArtists
// ---------------------------------------------------------------------------

describe('getLoyalArtists (yılın şampiyonu)', () => {
  it('her yıl için o yılın kazananını döner (RPC pass-through)', async () => {
    mockRpcResults['get_yearly_champion_artists'] = [
      { year: 2020, artist_name: 'Aspova', play_count: 697, total_ms: 106_000_000 },
      { year: 2021, artist_name: 'Elyas & Taha', play_count: 1368, total_ms: 203_000_000 },
      { year: 2022, artist_name: 'Mavi Gri', play_count: 1177, total_ms: 206_000_000 },
    ]

    const result = await getLoyalArtists('user-1')

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      year: 2020, artist_name: 'Aspova', play_count: 697, total_ms: 106_000_000,
    })
    expect(rpcMock).toHaveBeenCalledWith('get_yearly_champion_artists', { p_user_id: 'user-1' })
  })

  it('kronolojik sırayı RPC verdiği gibi korur (eski→yeni)', async () => {
    mockRpcResults['get_yearly_champion_artists'] = [
      { year: 2019, artist_name: 'A', play_count: 10, total_ms: 1000 },
      { year: 2020, artist_name: 'B', play_count: 20, total_ms: 2000 },
      { year: 2021, artist_name: 'C', play_count: 30, total_ms: 3000 },
    ]

    const result = await getLoyalArtists('user-1')

    expect(result.map((r) => r.year)).toEqual([2019, 2020, 2021])
  })

  it('DB hatasında boş dizi döner', async () => {
    mockRpcError = { message: 'DB boom' }

    const result = await getLoyalArtists('user-1')
    expect(result).toEqual([])
  })

  it('veri yoksa boş dizi döner', async () => {
    const result = await getLoyalArtists('user-1')
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getGenreDistribution
// ---------------------------------------------------------------------------

describe('getGenreDistribution', () => {
  it('returns available: false when RPC returns no rows', async () => {
    mockRpcResults['user_genre_all_counts'] = []

    const result = await getGenreDistribution('user-1')

    expect(result.available).toBe(false)
  })

  it('returns available: false on DB error', async () => {
    mockRpcError = { message: 'error' }

    const result = await getGenreDistribution('user-1')

    expect(result.available).toBe(false)
  })

  it('computes genre percentages from aggregated counts', async () => {
    mockRpcResults['user_genre_all_counts'] = [
      { genre: 'pop', play_count: 8 },
      { genre: 'rock', play_count: 2 },
    ]

    const result = await getGenreDistribution('user-1')

    expect(result.available).toBe(true)
    const popEntry = result.genres.find((g) => g.genre === 'pop')
    const rockEntry = result.genres.find((g) => g.genre === 'rock')
    expect(popEntry).toBeDefined()
    expect(rockEntry).toBeDefined()
    expect(popEntry!.percentage).toBe(80)
    expect(rockEntry!.percentage).toBe(20)
    expect(rpcMock).toHaveBeenCalledWith('user_genre_all_counts', { p_user_id: 'user-1' })
  })

  it('returns at most 6 genres', async () => {
    mockRpcResults['user_genre_all_counts'] = [
      { genre: 'pop', play_count: 10 },
      { genre: 'rock', play_count: 9 },
      { genre: 'jazz', play_count: 8 },
      { genre: 'classical', play_count: 7 },
      { genre: 'hip-hop', play_count: 6 },
      { genre: 'r&b', play_count: 5 },
      { genre: 'country', play_count: 4 },
      { genre: 'metal', play_count: 3 },
    ]

    const result = await getGenreDistribution('user-1')

    expect(result.available).toBe(true)
    expect(result.genres.length).toBeLessThanOrEqual(6)
  })
})

// ---------------------------------------------------------------------------
// getEraShift
// ---------------------------------------------------------------------------

describe('getEraShift', () => {
  it('returns available: false when fewer than 2 distinct years', async () => {
    mockRpcResults['user_era_shift'] = [
      { year: 2023, top_artist: 'Artist X', top_genre: 'pop' },
    ]

    const result = await getEraShift('user-1')

    expect(result.available).toBe(false)
  })

  it('returns years in RPC order (ascending)', async () => {
    mockRpcResults['user_era_shift'] = [
      { year: 2022, top_artist: 'Artist B', top_genre: null },
      { year: 2023, top_artist: 'Artist A', top_genre: 'rock' },
    ]

    const result = await getEraShift('user-1')

    expect(result.available).toBe(true)
    expect(result.years[0].year).toBe(2022)
    expect(result.years[1].year).toBe(2023)
    expect(rpcMock).toHaveBeenCalledWith('user_era_shift', { p_user_id: 'user-1' })
  })

  it('returns available: false on DB error', async () => {
    mockRpcError = { message: 'DB boom' }

    const result = await getEraShift('user-1')

    expect(result.available).toBe(false)
  })

  it('maps top_artist and top_genre per year', async () => {
    mockRpcResults['user_era_shift'] = [
      { year: 2022, top_artist: 'Artist B', top_genre: 'hip-hop' },
      { year: 2023, top_artist: 'Artist A', top_genre: null },
    ]

    const result = await getEraShift('user-1')

    expect(result.available).toBe(true)
    const year2022 = result.years.find((y) => y.year === 2022)
    const year2023 = result.years.find((y) => y.year === 2023)
    expect(year2022?.top_artist).toBe('Artist B')
    expect(year2022?.top_genre).toBe('hip-hop')
    expect(year2023?.top_artist).toBe('Artist A')
    expect(year2023?.top_genre).toBeNull()
  })
})
