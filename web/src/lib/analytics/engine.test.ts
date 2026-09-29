import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Supabase server client
//
// Yeni şema: engine top-tracks/artists/summary/hourly/platform/weekday/genre
// için RPC kullanır (server-side aggregate, 0106 ile 1000-satır REST kırpması
// düzeltmesi genişledi). getMostSkippedTracks hâlâ play_events'i doğrudan
// sorgular (tracks JOIN'li). Bu yüzden hem .rpc() hem .from() mock'lanır.
// ---------------------------------------------------------------------------

type MockRow = Record<string, unknown>

let mockFromData: MockRow[] | null = null
let mockFromError: { message: string } | null = null
let mockRpcData: MockRow[] | null = null
let mockRpcError: { message: string } | null = null

let recordedEqCalls: Array<[unknown, unknown]> = []
let recordedRpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
let recordedFromTables: string[] = []

// `maybeSingle()` tek satır döndürür — paket okuması (getPatternPackage, 0163)
// bunu kullanır, diziyle çalışan `then` yolundan ayrıdır.
let mockSingleData: MockRow | null = null
let mockSingleError: { message: string } | null = null

function makeFromBuilder(data: MockRow[] | null, error: { message: string } | null) {
  const builder = {
    select: (..._args: unknown[]) => builder,
    eq: (...args: unknown[]) => {
      recordedEqCalls.push([args[0], args[1]])
      return builder
    },
    in: (..._args: unknown[]) => builder,
    neq: (..._args: unknown[]) => builder,
    gte: (..._args: unknown[]) => builder,
    lte: (..._args: unknown[]) => builder,
    not: (..._args: unknown[]) => builder,
    maybeSingle: () =>
      Promise.resolve({ data: mockSingleData, error: mockSingleError }),
    then: (
      resolve: (v: { data: MockRow[] | null; error: { message: string } | null }) => unknown
    ) => Promise.resolve(resolve({ data, error })),
  }
  return builder
}

const fromMock = vi.fn((table: string) => {
  recordedFromTables.push(table)
  return makeFromBuilder(mockFromData, mockFromError)
})
const rpcMock = vi.fn((fn: string, args: Record<string, unknown>) => {
  recordedRpcCalls.push({ fn, args })
  return Promise.resolve({ data: mockRpcData, error: mockRpcError })
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: fromMock,
    rpc: rpcMock,
  })),
  createServiceClient: vi.fn(async () => ({
    from: fromMock,
    rpc: rpcMock,
  })),
}))

import {
  getTopTracks,
  getTotalListeningTime,
  getHourlyPattern,
  getPlatformBreakdown,
  getPatternPackage,
  getDashboardStats,
  getMostSkippedTracks,
  getTopArtists,
  getObsessionTracks,
  getDateRange,
} from './engine'

beforeEach(() => {
  mockFromData = null
  mockFromError = null
  mockRpcData = null
  mockRpcError = null
  mockSingleData = null
  mockSingleError = null
  recordedEqCalls = []
  recordedRpcCalls = []
  recordedFromTables = []
  fromMock.mockImplementation((table: string) => {
    recordedFromTables.push(table)
    return makeFromBuilder(mockFromData, mockFromError)
  })
  rpcMock.mockImplementation((fn: string, args: Record<string, unknown>) => {
    recordedRpcCalls.push({ fn, args })
    return Promise.resolve({ data: mockRpcData, error: mockRpcError })
  })
})

// ---------------------------------------------------------------------------
// getDateRange
// ---------------------------------------------------------------------------

describe('getDateRange', () => {
  it('alltime returns null from', () => {
    expect(getDateRange('alltime').from).toBeNull()
  })

  it('week returns from ~7 days ago', () => {
    const range = getDateRange('week')
    const diff = (range.to.getTime() - (range.from as Date).getTime()) / (1000 * 60 * 60 * 24)
    expect(diff).toBeCloseTo(7, 0)
  })
})

// ---------------------------------------------------------------------------
// getTopTracks — RPC `title`/`artist_name` → UI `raw_track_name`/`raw_artist_name`
// ---------------------------------------------------------------------------

describe('getTopTracks', () => {
  it('maps RPC title/artist_name to raw_track_name/raw_artist_name', async () => {
    mockRpcData = [
      { track_id: 't1', title: 'Song A', artist_name: 'Artist X', play_count: 2, total_ms: 400000, skip_count: 0 },
      { track_id: 't2', title: 'Song B', artist_name: 'Artist Y', play_count: 1, total_ms: 200000, skip_count: 0 },
    ]

    const result = await getTopTracks('user-1', 'month', 5)

    expect(result).toHaveLength(2)
    expect(result[0].raw_track_name).toBe('Song A')
    expect(result[0].raw_artist_name).toBe('Artist X')
    expect(result[0].play_count).toBe(2)
    expect(result[1].raw_track_name).toBe('Song B')
    // RPC çağrıldı mı?
    expect(recordedRpcCalls[0].fn).toBe('recap_top_tracks')
  })

  it('returns empty array on RPC error (graceful degradation)', async () => {
    mockRpcError = { message: 'DB boom' }
    const result = await getTopTracks('user-1', 'week', 5)
    expect(result).toEqual([])
  })

  it('passes limit to RPC', async () => {
    mockRpcData = []
    await getTopTracks('user-1', 'month', 3)
    expect(recordedRpcCalls[0].args.p_limit).toBe(3)
  })

  it('alltime + Faz 2 sends undefined p_from', async () => {
    // ⚠ 2026-07-31 (paket #5): `alltime` + tam geçmiş artık PAKETE gidiyor,
    // bu sözleşme yalnız RPC yolunda geçerli. Faz 2 (`source` verili) alltime
    // hâlâ RPC'ye düşen tek yol — sözleşme orada sınanıyor.
    mockRpcData = []
    await getTopTracks('user-1', 'alltime', 5, 'api_realtime')
    expect(recordedRpcCalls[0].args.p_from).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getTopArtists
// ---------------------------------------------------------------------------

describe('getTopArtists', () => {
  it('maps RPC rows', async () => {
    mockRpcData = [
      { artist_name: 'Artist X', play_count: 2, total_ms: 300000 },
      { artist_name: 'Artist Y', play_count: 1, total_ms: 50000 },
    ]
    const result = await getTopArtists('user-1', 'month', 5)
    expect(result[0].artist_name).toBe('Artist X')
    expect(result[0].play_count).toBe(2)
    expect(result[0].total_ms).toBe(300000)
    expect(recordedRpcCalls[0].fn).toBe('recap_top_artists')
  })
})

// ---------------------------------------------------------------------------
// getTotalListeningTime
// ---------------------------------------------------------------------------

describe('getTotalListeningTime', () => {
  it('returns zero values when RPC empty', async () => {
    mockRpcData = []
    const result = await getTotalListeningTime('user-1', 'month')
    expect(result).toEqual({ total_ms: 0, total_tracks: 0, total_artists: 0, total_playlists: 0 })
  })

  it('returns zero on RPC error', async () => {
    mockRpcError = { message: 'error' }
    const result = await getTotalListeningTime('user-1', 'month')
    expect(result.total_ms).toBe(0)
  })

  it('maps summary row', async () => {
    // ⚠ 2026-07-31 (paket #5): `alltime` + tam geçmiş pakete geçti; RPC
    // eşlemesi dar pencerelerde (ve Faz 2'de) sınanıyor.
    mockRpcData = [{ total_ms: 450000, total_tracks: 2, total_artists: 2 }]
    const result = await getTotalListeningTime('user-1', 'month')
    expect(result.total_ms).toBe(450000)
    expect(result.total_tracks).toBe(2)
    expect(result.total_artists).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// getHourlyPattern — RPC returns 24 rows; on error 24 empty
// ---------------------------------------------------------------------------

describe('getHourlyPattern', () => {
  it('maps RPC rows', async () => {
    mockRpcData = Array.from({ length: 24 }, (_, hour) => ({
      hour, play_count: hour === 14 ? 5 : 0, total_ms: hour === 14 ? 1000 : 0,
    }))
    const result = await getHourlyPattern('user-1', 'month')
    expect(result).toHaveLength(24)
    expect(result.find((r) => r.hour === 14)?.play_count).toBe(5)
  })

  it('returns 24 empty entries on RPC error', async () => {
    mockRpcError = { message: 'DB error' }
    const result = await getHourlyPattern('user-1', 'week')
    expect(result).toHaveLength(24)
    expect(result.every((r) => r.play_count === 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getPlatformBreakdown
// ---------------------------------------------------------------------------

describe('getPlatformBreakdown', () => {
  it('maps RPC rows', async () => {
    mockRpcData = [
      { source: 'spotify', play_count: 3, percentage: 75 },
      { source: 'youtube', play_count: 1, percentage: 25 },
    ]
    const result = await getPlatformBreakdown('user-1', 'month')
    expect(result.find((r) => r.source === 'spotify')?.percentage).toBe(75)
    expect(result.find((r) => r.source === 'youtube')?.percentage).toBe(25)
  })

  it('returns empty array on RPC error', async () => {
    mockRpcError = { message: 'error' }
    const result = await getPlatformBreakdown('user-1', 'week')
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getPatternPackage — user_pattern_pkg (migration 0163, Aşama 3 · paket #3)
//
// En kritik test `null döner` olanlar: paket yoksa çağıran "hazırlanıyor"
// göstermeli. Bu bozulursa hiçbir şey GÖRÜNÜR biçimde kırılmaz — sayfa sessizce
// canlı hesaba düşer ve 187 ms geri gelir (§12.4-A bağlayıcı kuralı).
// ---------------------------------------------------------------------------

describe('getPatternPackage', () => {
  it('paketi okur ve iki bölümü de eşler', async () => {
    mockSingleData = {
      payload: {
        hourly: [
          { hour: 0, play_count: 3, total_ms: 900 },
          { hour: 14, play_count: 12, total_ms: 4200 },
        ],
        platforms: [{ source: 'spotify', play_count: 15, percentage: 100 }],
      },
      generated_at: '2026-07-31T11:37:19.350Z',
    }

    const result = await getPatternPackage('user-1')

    expect(recordedFromTables).toContain('user_pattern_pkg')
    expect(result?.hourly).toHaveLength(2)
    expect(result?.hourly.find((h) => h.hour === 14)?.play_count).toBe(12)
    expect(result?.platforms[0]).toEqual({
      source: 'spotify',
      play_count: 15,
      percentage: 100,
    })
    expect(result?.generatedAt).toBe('2026-07-31T11:37:19.350Z')
  })

  it('bigint alanları string gelirse Number ile eşler (RPC yoluyla aynı)', async () => {
    // jsonb'den okunan bigint'ler PostgREST'te string olarak gelebilir; iki yol
    // ayrışırsa aynı kullanıcı iki yüzeyde farklı sayı görür.
    mockSingleData = {
      payload: {
        hourly: [{ hour: '9', play_count: '7', total_ms: '2500' }],
        platforms: [{ source: 'spotify', play_count: '7', percentage: '100' }],
      },
      generated_at: '2026-07-31T11:37:19.350Z',
    }

    const result = await getPatternPackage('user-1')

    expect(result?.hourly[0]).toEqual({ hour: 9, play_count: 7, total_ms: 2500 })
    expect(result?.platforms[0].play_count).toBe(7)
    expect(result?.platforms[0].percentage).toBe(100)
  })

  it('paket YOKSA null döner — canlı hesaba DÜŞMEZ', async () => {
    mockSingleData = null

    const result = await getPatternPackage('user-1')

    expect(result).toBeNull()
    // Hiçbir RPC çağrılmamalı: null "hazırlanıyor" demek, "hesapla" demek değil.
    expect(recordedRpcCalls).toHaveLength(0)
  })

  it('okuma hatasında da null döner ve RPC yedeğine düşmez', async () => {
    mockSingleError = { message: 'DB error' }

    const result = await getPatternPackage('user-1')

    expect(result).toBeNull()
    expect(recordedRpcCalls).toHaveLength(0)
  })

  it('payload bölümleri eksikse boş dizi döner, patlamaz', async () => {
    mockSingleData = { payload: {}, generated_at: '2026-07-31T11:37:19.350Z' }

    const result = await getPatternPackage('user-1')

    expect(result?.hourly).toEqual([])
    expect(result?.platforms).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getDashboardStats — user_stats_pkg (migration 0165, Aşama 3 · paket #4)
//
// ⚠ Bu fonksiyonun 2026-07-31'e kadar HİÇ testi yoktu; paket #4 turunda
// davranışı değiştirildiğinde 345 test geçmeye devam etti — yani o yol
// sınanmıyordu. Buradaki testler o boşluğu kapatıyor.
//
// EN KRİTİK OLAN `packageMissing`: paket yokken sayılar SIFIR değil BİLİNMİYOR.
// Bayrak düşerse dashboard "hiç şarkı dinlememişsin" der ve ZIP'i olan
// kullanıcıya "Spotify geçmişini yükle" gösterir — sessiz, görünür kırılma yok.
// ---------------------------------------------------------------------------

describe('getDashboardStats', () => {
  it('Faz 3+ (source yok) paketten okur, RPC çağırmaz', async () => {
    mockSingleData = {
      payload: {
        unique_tracks: 15894,
        unique_artists: 5135,
        total_ms: 14785937724,
        genres: [
          { genre: 'pop', play_count: 30000 },
          { genre: 'rock', play_count: 20000 },
        ],
      },
    }

    const result = await getDashboardStats('user-1')

    expect(recordedFromTables).toContain('user_stats_pkg')
    expect(recordedRpcCalls).toHaveLength(0) // canlı hesaba DÜŞMEDİ
    expect(result.uniqueTracks).toBe(15894)
    expect(result.uniqueArtists).toBe(5135)
    expect(result.favoriteGenre).toBe('pop')
    expect(result.topGenres).toHaveLength(2)
    expect(result.totalMinutes).toBe(Math.round(14785937724 / 60000))
    expect(result.packageMissing).toBeUndefined()
  })

  it('⚠ paket YOKSA packageMissing=true — sıfırlar "veri yok" DEĞİL', async () => {
    mockSingleData = null

    const result = await getDashboardStats('user-1')

    expect(result.packageMissing).toBe(true)
    expect(result.uniqueTracks).toBe(0)
    // Canlı hesaba düşmemeli: paket yok = "hazırlanıyor", "hesapla" değil.
    expect(recordedRpcCalls).toHaveLength(0)
  })

  it('okuma hatasında da packageMissing=true, RPC yedeğine düşmez', async () => {
    mockSingleError = { message: 'DB error' }

    const result = await getDashboardStats('user-1')

    expect(result.packageMissing).toBe(true)
    expect(recordedRpcCalls).toHaveLength(0)
  })

  it('Faz 2 (source verilince) RPC yolunda kalır — paket OKUNMAZ', async () => {
    // Ölçüldü: Faz 2 penceresi küçük (411 şarkı, 109 ms) ve günde 60-180 satır
    // büyüyor; paketlense sürekli bayatlardı. Bilinçli olarak RPC'de kaldı.
    mockRpcData = [{ total_tracks: 411, total_artists: 250, total_ms: 6000000 }]

    const result = await getDashboardStats('user-1', 'api_realtime')

    expect(recordedFromTables).not.toContain('user_stats_pkg')
    expect(recordedRpcCalls.map((c) => c.fn)).toContain('recap_listening_summary')
    expect(result.uniqueTracks).toBe(411)
    expect(result.packageMissing).toBeUndefined()
  })

  it('bigint alanları string gelirse Number ile eşler', async () => {
    mockSingleData = {
      payload: {
        unique_tracks: '15894',
        unique_artists: '5135',
        total_ms: '14785937724',
        genres: [{ genre: 'pop', play_count: '30000' }],
      },
    }

    const result = await getDashboardStats('user-1')

    expect(result.uniqueTracks).toBe(15894)
    expect(result.topGenres[0].count).toBe(30000)
  })

  it('⚠ Faz 2 RPC hatasında packageMissing KOYULMAZ', async () => {
    // Faz 2'nin paketi zaten hiç üretilmeyecek. Bu yola `packageMissing`
    // konsaydı Faz 2 kullanıcısı SONSUZA DEK "hazırlanıyor" görürdü.
    mockRpcError = { message: 'RPC patladı' }

    const result = await getDashboardStats('user-1', 'api_realtime')

    expect(result.packageMissing).toBeUndefined()
    expect(result.uniqueTracks).toBe(0)
  })

  it('payload alanları eksikse sıfırlanır, patlamaz', async () => {
    mockSingleData = { payload: {} }

    const result = await getDashboardStats('user-1')

    expect(result.uniqueTracks).toBe(0)
    expect(result.topGenres).toEqual([])
    expect(result.favoriteGenre).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// user_period_pkg (migration 0167, Aşama 3 · paket #5)
//
// ⚠ Bu paket ÜÇ fonksiyonu birden etkiliyor ve YALNIZ `alltime` + tam geçmiş
// yolunda devreye giriyor. Dönem/kaynak koşulu bozulursa hafta/ay/yıl da
// pakete düşer ve kullanıcı BAYAT veri görür — üstelik "yanlış" değil sadece
// "eski" olduğu için hiçbir test/hata bunu yakalamaz.
// ---------------------------------------------------------------------------

describe('user_period_pkg — alltime yolu', () => {
  const payload = {
    summary: { total_ms: 14785937724, total_tracks: 15894, total_artists: 5135 },
    top_tracks: Array.from({ length: 50 }, (_, i) => ({
      track_id: `t${i}`,
      title: `Şarkı ${i}`,
      artist_name: `Sanatçı ${i}`,
      play_count: 100 - i,
      total_ms: 60000,
      skip_count: 0,
    })),
    top_artists: Array.from({ length: 50 }, (_, i) => ({
      artist_name: `Sanatçı ${i}`,
      play_count: 200 - i,
      total_ms: 90000,
    })),
  }

  it('getTopTracks alltime → paketten, RPC çağırmaz', async () => {
    mockSingleData = { payload }

    const result = await getTopTracks('user-1', 'alltime', 5)

    expect(recordedFromTables).toContain('user_period_pkg')
    expect(recordedRpcCalls).toHaveLength(0)
    // Paket 50 tutar, çağıran limit kadarını alır (§12.4 top-N kuralı).
    expect(result).toHaveLength(5)
    expect(result[0].raw_track_name).toBe('Şarkı 0')
    expect(result[0].play_count).toBe(100)
  })

  it('getTopArtists alltime → paketten', async () => {
    mockSingleData = { payload }

    const result = await getTopArtists('user-1', 'alltime', 5)

    expect(recordedRpcCalls).toHaveLength(0)
    expect(result).toHaveLength(5)
    expect(result[0].artist_name).toBe('Sanatçı 0')
  })

  it('getTotalListeningTime alltime → paketten', async () => {
    mockSingleData = { payload }

    const result = await getTotalListeningTime('user-1', 'alltime')

    expect(recordedRpcCalls).toHaveLength(0)
    expect(result.total_tracks).toBe(15894)
    expect(result.total_artists).toBe(5135)
    expect(result.total_playlists).toBe(0)
  })

  it('⚠ hafta/ay/yıl pakete DÜŞMEZ — RPC yolunda kalır', async () => {
    // Bu koşul bozulursa kullanıcı "bu hafta"da dünkü dinlemelerini göremez:
    // yanlış değil, sadece BAYAT — ve hiçbir hata üretmez.
    mockRpcData = [{ track_id: 't1', title: 'X', artist_name: 'Y', play_count: 3, total_ms: 1, skip_count: 0 }]

    for (const period of ['week', 'month', 'year'] as const) {
      recordedRpcCalls = []
      recordedFromTables = []
      await getTopTracks('user-1', period, 5)

      expect(recordedFromTables).not.toContain('user_period_pkg')
      expect(recordedRpcCalls.map((c) => c.fn)).toContain('recap_top_tracks')
    }
  })

  it('⚠ Faz 2 (source verilince) alltime bile pakete DÜŞMEZ', async () => {
    mockRpcData = [{ track_id: 't1', title: 'X', artist_name: 'Y', play_count: 3, total_ms: 1, skip_count: 0 }]

    await getTopTracks('user-1', 'alltime', 5, 'api_realtime')

    expect(recordedFromTables).not.toContain('user_period_pkg')
    expect(recordedRpcCalls.map((c) => c.fn)).toContain('recap_top_tracks')
  })

  it('paket YOKSA boş döner — canlı hesaba DÜŞMEZ', async () => {
    mockSingleData = null

    const tracks = await getTopTracks('user-1', 'alltime', 5)
    const artists = await getTopArtists('user-1', 'alltime', 5)
    const summary = await getTotalListeningTime('user-1', 'alltime')

    expect(tracks).toEqual([])
    expect(artists).toEqual([])
    expect(summary.total_tracks).toBe(0)
    expect(recordedRpcCalls).toHaveLength(0) // yedek RPC'ye düşmedi
  })

  it('bigint alanları string gelirse Number ile eşler', async () => {
    mockSingleData = {
      payload: {
        summary: { total_ms: '14785937724', total_tracks: '15894', total_artists: '5135' },
        top_tracks: [{ track_id: 't1', title: 'X', artist_name: 'Y', play_count: '42', total_ms: '60000', skip_count: '0' }],
        top_artists: [{ artist_name: 'Y', play_count: '99', total_ms: '90000' }],
      },
    }

    const tracks = await getTopTracks('user-1', 'alltime', 5)
    const summary = await getTotalListeningTime('user-1', 'alltime')

    expect(tracks[0].play_count).toBe(42)
    expect(summary.total_tracks).toBe(15894)
  })
})

// ---------------------------------------------------------------------------
// getMostSkippedTracks — play_events JOIN tracks (raw_* kaldırıldı)
// ---------------------------------------------------------------------------

describe('getMostSkippedTracks', () => {
  // 0110: toplama artık DB'de (user_most_skipped RPC) — eski limitsiz select
  // 1000-satır tavanında yanlış top-5 üretiyordu; test RPC sözleşmesini doğrular.
  it('maps RPC rows to TopTrack shape (skip_count = play_count)', async () => {
    mockRpcData = [
      { track_id: 'a', title: 'Song A', artist_name: 'A', skip_count: 2, total_ms: 12000 },
      { track_id: 'b', title: 'Song B', artist_name: 'B', skip_count: 1, total_ms: 6000 },
    ]
    const result = await getMostSkippedTracks('user-1', 'month', 5)
    expect(result[0].raw_track_name).toBe('Song A')
    expect(result[0].skip_count).toBe(2)
    expect(result[0].play_count).toBe(2)
    expect(recordedRpcCalls.some((c) => c.fn === 'user_most_skipped')).toBe(true)
  })

  it('returns empty array on error', async () => {
    mockRpcError = { message: 'error' }
    const result = await getMostSkippedTracks('user-1', 'week', 5)
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getObsessionTracks — wraps getTopTracks (RPC)
// ---------------------------------------------------------------------------

describe('getObsessionTracks', () => {
  it('only returns tracks with play_count >= 10', async () => {
    mockRpcData = [
      { track_id: 'a', title: 'Song A', artist_name: 'A', play_count: 15, total_ms: 1000, skip_count: 0 },
      { track_id: 'b', title: 'Song B', artist_name: 'B', play_count: 3, total_ms: 100, skip_count: 0 },
    ]
    const result = await getObsessionTracks('user-1', 'month', 5)
    expect(result.every((t) => t.play_count >= 10)).toBe(true)
    expect(result[0].raw_track_name).toBe('Song A')
    expect(result[0].streak_days).toBe(0)
  })

  it('returns empty array when no tracks meet threshold', async () => {
    mockRpcData = [
      { track_id: 'a', title: 'Song A', artist_name: 'A', play_count: 2, total_ms: 100, skip_count: 0 },
    ]
    const result = await getObsessionTracks('user-1', 'month', 5)
    expect(result).toEqual([])
  })
})
