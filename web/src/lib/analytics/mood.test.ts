import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// mood.ts — `getMoodPackage` (paket, 0169+0171) ve `getMoodPlaylist` (RPC).
//
// ⚠ Bu dosyanın 2026-08-01'e kadar HİÇ testi yoktu. Paket #6 turunda eklendi.
//
// EN KRİTİK AYRIM: sayfa pakete geçti ama `/api/mood/create-playlist` RPC'de
// KALDI. O uç Spotify'a gerçek playlist yazıyor; pakete bağlansaydı kullanıcı
// "gece yarısı üretilmiş" listeyi Spotify'a yazardı — dış dünyaya taşan, geri
// alınamaz bir bayatlık. Bu ayrım bozulursa hiçbir şey görünür biçimde
// kırılmaz, ama kullanıcının Spotify hesabına yanlış liste gider.
// ---------------------------------------------------------------------------

type MockRow = Record<string, unknown>

let mockSingleData: MockRow | null = null
let mockSingleError: { message: string } | null = null
let mockRpcData: MockRow[] | null = null
let mockRpcError: { message: string } | null = null

let recordedRpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
let recordedFromTables: string[] = []
let recordedEqs: Array<[string, unknown]> = []

const fromMock = vi.fn((table: string) => {
  recordedFromTables.push(table)
  const builder = {
    select: (..._a: unknown[]) => builder,
    eq: (col: string, val: unknown) => {
      recordedEqs.push([col, val])
      return builder
    },
    maybeSingle: () =>
      Promise.resolve({ data: mockSingleData, error: mockSingleError }),
  }
  return builder
})

const rpcMock = vi.fn((fn: string, args: Record<string, unknown>) => {
  recordedRpcCalls.push({ fn, args })
  return Promise.resolve({ data: mockRpcData, error: mockRpcError })
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: fromMock, rpc: rpcMock })),
}))

import { getMoodPackage, getMoodPlaylist, MOOD_TRACK_LIMIT, MOODS } from './mood'

beforeEach(() => {
  mockSingleData = null
  mockSingleError = null
  mockRpcData = null
  mockRpcError = null
  recordedRpcCalls = []
  recordedFromTables = []
  recordedEqs = []
})

const payload = [
  {
    track_id: 't1',
    title: 'Gece Yolu',
    artist_name: 'Sanatçı A',
    album: 'Albüm A',
    image_url: 'https://i.scdn.co/image/x',
    play_count: 42,
  },
  {
    track_id: 't2',
    title: 'Sessizlik',
    artist_name: 'Sanatçı B',
    album: null,
    image_url: null,
    play_count: '17',
  },
]

describe('getMoodPackage', () => {
  it('paketi okur, mood_pkg tablosuna user+mood ile sorar', async () => {
    mockSingleData = { payload }

    const result = await getMoodPackage('user-1', 'gece_217')

    expect(recordedFromTables).toEqual(['mood_pkg'])
    expect(recordedEqs).toEqual([
      ['user_id', 'user-1'],
      ['mood_key', 'gece_217'],
    ])
    expect(recordedRpcCalls).toHaveLength(0) // canlı hesaba DÜŞMEDİ
    expect(result).toHaveLength(2)
    expect(result?.[0].title).toBe('Gece Yolu')
    expect(result?.[0].moodPlayCount).toBe(42)
  })

  it('bigint string gelirse Number ile eşler (RPC yoluyla aynı)', async () => {
    mockSingleData = { payload }

    const result = await getMoodPackage('user-1', 'gece_217')

    expect(result?.[1].moodPlayCount).toBe(17)
    expect(typeof result?.[1].moodPlayCount).toBe('number')
  })

  it('null alanlar güvenli varsayılana düşer', async () => {
    mockSingleData = { payload }

    const result = await getMoodPackage('user-1', 'gece_217')

    expect(result?.[1].album).toBeNull()
    expect(result?.[1].imageUrl).toBeNull()
  })

  it('⚠ paket YOKSA null döner — canlı hesaba DÜŞMEZ', async () => {
    mockSingleData = null

    const result = await getMoodPackage('user-1', 'locked_in')

    expect(result).toBeNull()
    // null = "hazırlanıyor", "hesapla" değil. RPC yedeğine düşerse ~300 ms
    // EN KÖTÜ ANDA (ilk ziyaret) geri gelir.
    expect(recordedRpcCalls).toHaveLength(0)
  })

  it('okuma hatasında da null döner, RPC yedeğine düşmez', async () => {
    mockSingleError = { message: 'DB error' }

    const result = await getMoodPackage('user-1', 'locked_in')

    expect(result).toBeNull()
    expect(recordedRpcCalls).toHaveLength(0)
  })

  it('payload boş dizi ise boş döner (null DEĞİL)', async () => {
    // Boş dizi "veri yok" demek; null "paket yok" demek. İkisi farklı durum.
    mockSingleData = { payload: [] }

    const result = await getMoodPackage('user-1', 'first_light')

    expect(result).toEqual([])
    expect(result).not.toBeNull()
  })
})

describe('getMoodPlaylist — RPC yolu (create-playlist için DURUYOR)', () => {
  it('⚠ RPC çağırır, PAKETE bakmaz', async () => {
    // Bu ayrım bozulursa Spotify'a bayat liste yazılır (geri alınamaz).
    mockRpcData = [
      {
        track_id: 't1',
        title: 'X',
        artist_name: 'Y',
        album: null,
        image_url: null,
        play_count: 3,
      },
    ]

    const result = await getMoodPlaylist('user-1', 'gece_217')

    expect(recordedFromTables).not.toContain('mood_pkg')
    expect(recordedRpcCalls[0].fn).toBe('mood_playlist')
    expect(result).toHaveLength(1)
  })

  it('varsayılan limit MOOD_TRACK_LIMIT (50) — paketle aynı', async () => {
    // Paket 50 tutuyor (0169). Limit ayrışırsa sayfa ve Spotify listesi
    // farklı uzunlukta olur.
    mockRpcData = []

    await getMoodPlaylist('user-1', 'gece_217')

    expect(recordedRpcCalls[0].args.p_limit).toBe(MOOD_TRACK_LIMIT)
    expect(MOOD_TRACK_LIMIT).toBe(50)
  })

  it('RPC hatasında boş dizi döner (sayfa patlamaz)', async () => {
    mockRpcError = { message: 'boom' }

    const result = await getMoodPlaylist('user-1', 'gece_217')

    expect(result).toEqual([])
  })
})

describe('MOODS sabiti', () => {
  it('on iki sabit an — DB CHECK ile aynı anahtarlar', async () => {
    // `build_mood_pkg` (0309) geçersiz anahtarı reddediyor; ayrışırsa cron
    // patlar. Bu test kod tarafının bekçisi.
    // 2026-09-18 (migration 0309): katalog yeniden kurgusu — eski 10 key
    // kaldırıldı, 12 yeni key (7 Rosso's Picks + 5 Daily Picks) geldi.
    expect(MOODS).toHaveLength(12)
    expect(MOODS.map((m) => m.key).sort()).toEqual(
      [
        'quiet_side', 'full_throttle', 'locked_in', 'no_limit', 'closer',
        'miles_away', 'gece_217', 'your_day', 'first_light', 'daylight',
        'dusk', 'nocturne',
      ].sort(),
    )
  })
})

describe('Mood rota sözleşmesi', () => {
  /**
   * 🔴 2026-08-08: mood kartları `/mood/${key}` adresine bağlıydı ama o sayfa
   *    HİÇ YOKTU — `/mood` yalnız dizin kökünü yönlendiriyordu, alt rotalar
   *    kapsam dışıydı. Her mood kartı **404** veriyordu (Sahip bildirdi).
   *
   *    Bu test o kırığın bekçisi: link ile sayfa dosyası ayrışırsa yakalar.
   *    `build`/`lint`/`type-check` bunu YAKALAMAZ — Next rotaları dosya
   *    sisteminden çözülür, `href` bir dizedir.
   */
  it('her mood anahtarı için detay sayfası dosyası var', async () => {
    const { existsSync } = await import('node:fs')
    const { join } = await import('node:path')

    // Dinamik segment: tek dosya tüm anahtarlara hizmet eder.
    const detay = join(process.cwd(), 'src/app/(dashboard)/playlists/mood/[key]/page.tsx')
    expect(existsSync(detay), 'mood detay sayfası bulunamadı').toBe(true)

    // Eski adres kırılmamalı — yer imleri ve paylaşılan bağlantılar için.
    const yonlendirme = join(process.cwd(), 'src/app/(dashboard)/mood/[key]/page.tsx')
    expect(existsSync(yonlendirme), 'eski /mood/[key] yönlendirmesi yok').toBe(true)
  })

  it('liste kartları /playlists/mood/[key] adresine bağlanıyor', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(process.cwd(), 'src/app/(dashboard)/playlists/mood/page.tsx'),
      'utf8',
    )
    // Eski kırık desen geri gelmesin.
    expect(src).not.toMatch(/href=\{`\/mood\/\$\{/)
    expect(src).toMatch(/href=\{`\/playlists\/mood\/\$\{/)
  })
})
