import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// kullanicininMoodlariniUret — AI SÜRE BÜTÇESİ (eski adıyla runMoodPkg).
//
// 2026-09-19 ölçümü: bir Vertex çağrısı 30 sn zaman aşımına, bir diğeri 429'a
// düştü ve cron turu 71 sn sürdü; route `maxDuration` 60 sn. Vercel'de bu,
// turun ortasından kesilmesi ve ardından gelen Spotify senkronunun o gün hiç
// çalışmaması demek — üstelik HATASIZ görünerek (yazılmış mood'lar yerinde).
//
// Çözüm: `aiSonTarih` geçtikten sonra YENİ AI çağrısı başlatılmaz, mood
// doğrudan SQL yoluna düşer. Bu test o garantinin kendisini ölçüyor: bütçe
// dolmuşsa Vertex'e TEK BİR çağrı gitmemeli, ama 12 mood'un hepsi yine
// üretilmeli (AI vazgeçilmez değil — Sahibin ilkesi).
// ---------------------------------------------------------------------------

const rpcCagrilari: string[] = []
const curateMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(async () => ({
    rpc: vi.fn(async (fn: string) => {
      rpcCagrilari.push(fn)
      if (fn === 'recap_real_user_ids') return { data: ['kullanici-1'], error: null }
      if (fn === 'mood_needs_ai_recuration') return { data: true, error: null }
      if (fn === 'mood_playlist') {
        return { data: [{ track_id: 't1', title: 'x', artist_name: 'y', play_count: 1 }], error: null }
      }
      if (fn === 'build_mood_pkg') return { data: true, error: null }
      if (fn === 'save_mood_pkg_payload') return { data: true, error: null }
      return { data: null, error: null }
    }),
    from: () => {
      const zincir = {
        select: () => zincir,
        eq: () => zincir,
        maybeSingle: async () => ({ data: null, error: null }),
      }
      return zincir
    },
  })),
}))

vi.mock('@/lib/services/token-refresh', () => ({ ensureValidToken: vi.fn() }))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn(async () => undefined) }))
vi.mock('@/lib/ai/gemini-client', () => ({
  curateMoodPlaylistWithAi: (...args: unknown[]) => curateMock(...args),
  validateAiSelection: (ids: string[]) => ids,
}))
vi.mock('@/lib/ai/mood-ai-context', () => ({
  ADAY_HAVUZU_BOYUTU: 200,
  buildMoodAiContext: vi.fn(async () => ({
    candidates: [{ id: 't1', t: 'x', a: 'y', pc: 1 }],
  })),
}))
vi.mock('@/lib/ai/catalog-enrichment', () => ({ runCatalogEnrichment: vi.fn() }))
vi.mock('@/lib/ai/user-intelligence', () => ({ runUserIntelligence: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/server'
import { Semafor } from '@/lib/ai/concurrency'
import { kullanicininMoodlariniUret } from './mood-pkg'

/*
 * Kayan sıra (0342): tur artık kullanıcı başına bu fonksiyonu çağırıyor.
 * Bütçe garantisi aynı yerde yaşıyor — test de onu doğrudan ölçüyor.
 */
async function runMoodPkg(force: boolean, aiSonTarih?: number, semafor?: Semafor) {
  const supabase = await createServiceClient()
  return kullanicininMoodlariniUret(supabase, 'kullanici-1', force, aiSonTarih, semafor)
}

beforeEach(() => {
  rpcCagrilari.length = 0
  curateMock.mockReset()
  curateMock.mockResolvedValue({ selectedTrackIds: ['t1'] })
})

describe('kullanicininMoodlariniUret — AI süre bütçesi', () => {
  it('son tarih GEÇMİŞSE Vertex’e hiç çağrı gitmez, 12 mood SQL ile üretilir', async () => {
    const sonuc = await runMoodPkg(false, Date.now() - 1)

    expect(curateMock).not.toHaveBeenCalled()
    expect(sonuc.aiCurated).toBe(0)
    expect(sonuc.moodsWritten).toBe(12)
    expect(sonuc.errors).toBe(0)
    expect(rpcCagrilari.filter((f) => f === 'build_mood_pkg')).toHaveLength(12)
    // Aday havuzu bile çekilmemeli — bütçe dolunca AI yolunun HİÇBİR adımı çalışmaz.
    expect(rpcCagrilari).not.toContain('mood_playlist')
  })

  it('son tarih GELECEKTEYSE her mood AI ile kürasyonlanır', async () => {
    const sonuc = await runMoodPkg(false, Date.now() + 60_000)

    expect(curateMock).toHaveBeenCalledTimes(12)
    expect(sonuc.aiCurated).toBe(12)
    expect(rpcCagrilari).not.toContain('build_mood_pkg')
  })

  it('son tarih verilmezse davranış eskisi gibidir (AI denenir)', async () => {
    const sonuc = await runMoodPkg(false)

    expect(curateMock).toHaveBeenCalledTimes(12)
    expect(sonuc.aiCurated).toBe(12)
  })

  it('AI başarısız olursa (null) yine SQL’e düşülür — bütçeden bağımsız fallback', async () => {
    curateMock.mockResolvedValue(null)

    const sonuc = await runMoodPkg(false, Date.now() + 60_000)

    expect(sonuc.aiCurated).toBe(0)
    expect(sonuc.moodsWritten).toBe(12)
    expect(rpcCagrilari.filter((f) => f === 'build_mood_pkg')).toHaveLength(12)
  })

  it('ortak semafor verilirse AI çağrıları onun sınırında kalır', async () => {
    let ayni = 0
    let enCok = 0
    curateMock.mockImplementation(async () => {
      ayni += 1
      enCok = Math.max(enCok, ayni)
      await new Promise((r) => setTimeout(r, 5))
      ayni -= 1
      return { selectedTrackIds: ['t1'] }
    })
    const semafor = new Semafor(2)
    // İki kullanıcı paralel — toplam AI eşzamanlılığı yine 2'yi geçmemeli.
    await Promise.all([
      runMoodPkg(false, Date.now() + 60_000, semafor),
      runMoodPkg(false, Date.now() + 60_000, semafor),
    ])
    expect(enCok).toBe(2)
  })
})
