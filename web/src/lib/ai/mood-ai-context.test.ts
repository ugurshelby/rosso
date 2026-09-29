import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn(async () => undefined) }))

import { buildMoodAiContext } from './mood-ai-context'

// ---------------------------------------------------------------------------
// mood-ai-context.ts — Katman A (katalog zekâsı) → Katman C (kürasyon) köprüsü.
//
// Bu köprü 2026-09-19'da kuruldu. Öncesinde `catalog_ai_enrichment` DOLUYORDU
// ama hiçbir kod OKUMUYORDU: AI çağrılarına para ödeniyor, üretilen etiketler
// hiçbir kararı etkilemiyordu. Testin asıl işi o oku canlı tutmak.
//
// İki kural sessizce bozulabilir ve bozulduğunda hiçbir şey patlamaz:
//   1. Etiketi olmayan adaya `g`/`e` alanı EKLENMEMELİ. Boş string göndermek
//      hem token harcar hem modele "türü yok" diye YANLIŞ sinyal verir
//      ("bilinmiyor" ile "nötr" aynı şey değildir).
//   2. Etiket sorgusu patlarsa kürasyon durmamalı — etiketler bir iyileştirme,
//      bir bağımlılık değil (Sahibin "AI vazgeçilmez olmasın" ilkesinin
//      katalog katmanındaki karşılığı).
// ---------------------------------------------------------------------------

type EnrichmentSatiri = {
  track_id: string
  primary_genre: string | null
  energy_character: string | null
}

let enrichmentSonucu: { data: EnrichmentSatiri[] | null; error: { message: string } | null }
let rpcCagrilari: Array<{ fn: string; args: unknown }>

/** `from(...).select(...).eq(...).maybeSingle()` zincirini karşılayan minimal sahte. */
function sahteTablo() {
  const zincir = {
    select: () => zincir,
    eq: () => zincir,
    gte: () => zincir,
    in: () => zincir,
    limit: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  }
  return zincir
}

function sahteSupabase(): SupabaseClient {
  return {
    from: () => sahteTablo(),
    rpc: (fn: string, args: unknown) => {
      rpcCagrilari.push({ fn, args })
      if (fn === 'catalog_enrichment_for_tracks') return Promise.resolve(enrichmentSonucu)
      return Promise.resolve({ data: null, error: null })
    },
  } as unknown as SupabaseClient
}

const ADAYLAR = [
  { track_id: 't1', title: 'Birinci', artist_name: 'A', play_count: 9 },
  { track_id: 't2', title: 'İkinci', artist_name: 'B', play_count: 4 },
  { track_id: 't3', title: 'Üçüncü', artist_name: 'C', play_count: 1 },
]

async function context(ek?: Partial<Parameters<typeof buildMoodAiContext>[0]>) {
  return buildMoodAiContext({
    supabase: sahteSupabase(),
    userId: 'u1',
    moodKey: 'quiet_side',
    candidates: ADAYLAR,
    hiddenTrackIds: [],
    approvedTrackIds: [],
    previousTrackIds: [],
    targetCount: 50,
    ...ek,
  })
}

beforeEach(() => {
  rpcCagrilari = []
  enrichmentSonucu = { data: [], error: null }
})

describe('buildMoodAiContext — katalog etiketleri', () => {
  it('etiketi olan adaya tür ve enerji ekler', async () => {
    enrichmentSonucu = {
      data: [{ track_id: 't1', primary_genre: 'neo-psychedelia', energy_character: 'medium' }],
      error: null,
    }

    const ctx = await context()
    const t1 = ctx?.candidates.find((c) => c.id === 't1')

    expect(t1?.g).toBe('neo-psychedelia')
    expect(t1?.e).toBe('medium')
  })

  it('etiketi OLMAYAN adaya alan hiç eklemez (boş string DEĞİL)', async () => {
    enrichmentSonucu = {
      data: [{ track_id: 't1', primary_genre: 'post-punk', energy_character: 'high' }],
      error: null,
    }

    const ctx = await context()
    const t2 = ctx?.candidates.find((c) => c.id === 't2')

    // `in` ile kontrol: alan VAR ama undefined olursa JSON.stringify onu atar,
    // yani token maliyeti doğmaz — asıl önemli olan bu.
    expect(t2?.g).toBeUndefined()
    expect(t2?.e).toBeUndefined()
    expect(JSON.stringify(t2)).not.toContain('"g"')
    expect(JSON.stringify(t2)).not.toContain('"e"')
  })

  it('tür var enerji yoksa yalnız türü ekler', async () => {
    enrichmentSonucu = {
      data: [{ track_id: 't3', primary_genre: 'ambient', energy_character: null }],
      error: null,
    }

    const ctx = await context()
    const t3 = ctx?.candidates.find((c) => c.id === 't3')

    expect(t3?.g).toBe('ambient')
    expect(t3?.e).toBeUndefined()
  })

  it('etiket sorgusu patlarsa context yine üretilir (kürasyon durmaz)', async () => {
    enrichmentSonucu = { data: null, error: { message: 'boom' } }

    const ctx = await context()

    expect(ctx).not.toBeNull()
    expect(ctx?.candidates).toHaveLength(3)
    expect(ctx?.candidates.every((c) => c.g === undefined)).toBe(true)
  })

  it('etiket RPC’sine TÜM aday id’leri gönderilir', async () => {
    await context()

    const cagri = rpcCagrilari.find((r) => r.fn === 'catalog_enrichment_for_tracks')
    expect(cagri).toBeDefined()
    expect((cagri?.args as { p_track_ids: string[] }).p_track_ids).toEqual(['t1', 't2', 't3'])
  })

  it('aday yoksa null döner ve etiket sorgusu hiç yapılmaz', async () => {
    const ctx = await context({ candidates: [] })

    expect(ctx).toBeNull()
    expect(rpcCagrilari.some((r) => r.fn === 'catalog_enrichment_for_tracks')).toBe(false)
  })

  it('userId context’e taşınır (loglama kullanıcıya bağlanabilsin)', async () => {
    const ctx = await context()
    expect(ctx?.userId).toBe('u1')
  })
})
