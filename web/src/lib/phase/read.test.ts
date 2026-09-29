import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc: rpcMock }),
}))
// react cache() sunucu bağlamı ister; testte kimlik fonksiyonu yeter.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, cache: <T,>(fn: T) => fn }
})

const { getPhaseState, isRouteUnlocked, sourceFilter } = await import('./read')

function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    phase: 3,
    is_override: false,
    natural_phase: 3,
    has_account_data: false,
    has_technical_log: false,
    processing: false,
    ...over,
  }
}

beforeEach(() => rpcMock.mockReset())

describe('getPhaseState', () => {
  it('Faz 1: hiçbir yetenek açık değil', async () => {
    rpcMock.mockResolvedValue({ data: [row({ phase: 1, natural_phase: 1 })], error: null })
    const s = await getPhaseState('u1')
    expect(s.phase).toBe(1)
    expect(s.capabilities.canSeePlaylists).toBe(false)
    expect(s.capabilities.canSeeRecap).toBe(false)
  })

  it('Faz 2: playlist/beğeni açılır, recap/taste KAPALI', async () => {
    rpcMock.mockResolvedValue({ data: [row({ phase: 2, natural_phase: 2 })], error: null })
    const s = await getPhaseState('u1')
    expect(s.capabilities.canSeePlaylists).toBe(true)
    expect(s.capabilities.canLikeTracks).toBe(true)
    expect(s.capabilities.canSeeRecap).toBe(false)
    expect(s.capabilities.canSeeTaste).toBe(false)
  })

  it('Faz 3: recap/taste/geçmiş açılır, Faz 4 yetenekleri KAPALI', async () => {
    rpcMock.mockResolvedValue({ data: [row()], error: null })
    const s = await getPhaseState('u1')
    expect(s.capabilities.canSeeRecap).toBe(true)
    expect(s.capabilities.canSeeHistory).toBe(true)
    expect(s.capabilities.canSeeLikedSongs).toBe(false)
    expect(s.capabilities.canSeeCar).toBe(false)
  })

  it('Faz 4: hepsi açık', async () => {
    rpcMock.mockResolvedValue({
      data: [row({ phase: 4, natural_phase: 4, has_account_data: true, has_technical_log: true })],
      error: null,
    })
    const s = await getPhaseState('u1')
    expect(s.capabilities.canSeeLikedSongs).toBe(true)
    expect(s.capabilities.canSeePlaylistTimeline).toBe(true)
    expect(s.partialPhase4).toBe(false)
  })

  it('partialPhase4: yalnız BİR ZIP varsa true (Faz 4 açılmaz)', async () => {
    rpcMock.mockResolvedValue({
      data: [row({ phase: 3, natural_phase: 3, has_account_data: true, has_technical_log: false })],
      error: null,
    })
    const s = await getPhaseState('u1')
    expect(s.partialPhase4).toBe(true)
    expect(s.phase).toBe(3)
    expect(s.capabilities.canSeeLikedSongs).toBe(false)
  })

  it('override: görünen faz düşer ama naturalPhase gerçeği korur (friend senaryosu)', async () => {
    rpcMock.mockResolvedValue({
      data: [row({ phase: 2, is_override: true, natural_phase: 3 })],
      error: null,
    })
    const s = await getPhaseState('friend')
    expect(s.phase).toBe(2)
    expect(s.naturalPhase).toBe(3)
    expect(s.isOverride).toBe(true)
    // Veri duruyor ama UI kilitli:
    expect(s.capabilities.canSeeRecap).toBe(false)
  })

  it('RPC hatasında EN KISITLI hâle düşer (açık kalmaktansa kapalı)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const s = await getPhaseState('u1')
    expect(s.phase).toBe(1)
    expect(s.capabilities.canSeeRecap).toBe(false)
  })

  it('boş dizi dönerse de fallback', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    expect((await getPhaseState('u1')).phase).toBe(1)
  })

  it('processing bayrağı taşınır', async () => {
    rpcMock.mockResolvedValue({ data: [row({ processing: true })], error: null })
    expect((await getPhaseState('u1')).processing).toBe(true)
  })
})

/**
 * P0.6 — Faz 2 "boş ekran" regresyonunun bekçisi.
 *
 * Sahip 30 Tem'de ölçtü: faz kilidi ZIP'i kapatırken canlı API verisini de
 * kapatmıştı. Faz 2'nin ayırt edici özelliği "veri yok" DEĞİL, "yalnız
 * `api_realtime` var". Bu blok o ayrımı kilitler.
 */
describe('kaynak-farkındalıklı geçmiş penceresi (P0.6)', () => {
  it('Faz 1 hiç veri okumaz', async () => {
    rpcMock.mockResolvedValue({ data: [row({ phase: 1, natural_phase: 1 })], error: null })
    const s = await getPhaseState('w1')
    expect(s.capabilities.historyWindow).toBe('none')
    expect(s.capabilities.canSeeRecentPlays).toBe(false)
    expect(s.capabilities.canSeeShortTermStats).toBe(false)
  })

  it('Faz 2 canlı API verisini GÖRÜR ama uzun geçmiş KAPALI', async () => {
    rpcMock.mockResolvedValue({ data: [row({ phase: 2, natural_phase: 2 })], error: null })
    const s = await getPhaseState('w2')
    expect(s.capabilities.historyWindow).toBe('api')
    // Faz 2'nin dolu görünmesini sağlayan yetenekler:
    expect(s.capabilities.canSeeRecentPlays).toBe(true)
    expect(s.capabilities.canSeeShortTermStats).toBe(true)
    // ...ama ZIP gerektiren yüzeyler hâlâ kilitli:
    expect(s.capabilities.canSeeHistory).toBe(false)
    expect(s.capabilities.canSeeRecap).toBe(false)
  })

  it('Faz 3+ tüm kaynakları okur', async () => {
    rpcMock.mockResolvedValue({ data: [row()], error: null })
    expect((await getPhaseState('w3')).capabilities.historyWindow).toBe('full')
  })

  it('RPC hatasında pencere de en kısıtlı hâle düşer', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    expect((await getPhaseState('w4')).capabilities.historyWindow).toBe('none')
  })
})

describe('sourceFilter', () => {
  it("yalnız 'api' penceresi DB süzgecine çevrilir", () => {
    expect(sourceFilter('api')).toBe('api_realtime')
  })

  it("'full' süzgeç uygulamaz — Faz 3/4 davranışı değişmez (regresyon bekçisi)", () => {
    expect(sourceFilter('full')).toBeUndefined()
  })

  it("'none' de süzgeç döndürmez — o durumda sorgu hiç çalışmaz, kilit üstte", () => {
    expect(sourceFilter('none')).toBeUndefined()
  })
})

describe('isRouteUnlocked', () => {
  /**
   * Yetenekleri GERÇEK `getPhaseState`'ten üretir — elle kopyalanmış bir
   * yetenek listesi tutmuyoruz. Kopya liste, `PhaseCapabilities`'e her yeni
   * alan eklendiğinde testi kırıyordu (P0.6'da `historyWindow` +
   * `canSeeRecentPlays` + `canSeeShortTermStats` eklenince oldu) ve daha
   * kötüsü: kopya, ürün kodundaki faz eşlemesinden SESSİZCE sapabilirdi.
   */
  const state = async (phase: 1 | 2 | 3 | 4) => {
    rpcMock.mockResolvedValue({ data: [row({ phase, natural_phase: phase })], error: null })
    return getPhaseState(`route-u${phase}`)
  }

  it('Faz 2 kullanıcısı /recap göremez, /playlists görür', async () => {
    const s = await state(2)
    expect(isRouteUnlocked('/recap', s)).toBe(false)
    expect(isRouteUnlocked('/playlists', s)).toBe(true)
  })

  it('Faz 3 kullanıcısı /recap ve /gecmis görür', async () => {
    const s = await state(3)
    expect(isRouteUnlocked('/recap', s)).toBe(true)
    expect(isRouteUnlocked('/gecmis', s)).toBe(true)
  })

  it('haritada olmayan rota her zaman açık (/dashboard, /settings)', async () => {
    const s = await state(1)
    expect(isRouteUnlocked('/dashboard', s)).toBe(true)
    expect(isRouteUnlocked('/settings', s)).toBe(true)
  })
})
