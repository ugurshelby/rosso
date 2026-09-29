import { describe, it, expect } from 'vitest'
import { collectUserDataExport } from './data-export'

/**
 * KVKK export kapsam garantisi. En kritik iki davranış:
 *  1. platform_connections'tan yalnız META alınır — access/refresh TOKEN ASLA.
 *  2. play_events SAYFALANARAK çekilir (§1.65 ~1000 satır kırpması aşılır).
 */

interface Call {
  table: string
  selected: string | undefined
  ranges: Array<[number, number]>
}

/**
 * Sahte Supabase client — hangi tablodan ne select edildiğini ve range
 * çağrılarını kaydeder. play_events için sayfalama simüle eder.
 */
function makeClient(opts: { playEventPages: unknown[][] }) {
  const calls: Call[] = []
  // play_events sayfalama tüm .from() çağrıları arasında ortak sayaç kullanır —
  // fetchAllRows döngüde her sayfa için YENİ .from('play_events') çağırıyor.
  let playPageIndex = 0

  function query(table: string) {
    const rec: Call = { table, selected: undefined, ranges: [] }
    calls.push(rec)
    const q: Record<string, unknown> = {
      select(cols: string) {
        rec.selected = cols
        return q
      },
      eq() {
        return q
      },
      order() {
        return q
      },
      range(from: number, to: number) {
        rec.ranges.push([from, to])
        return q
      },
      then(resolve: (v: { data: unknown[]; error: null }) => void) {
        // play_events sayfalama: her .from() çağrısı sıradaki sayfayı verir.
        if (table === 'play_events') {
          const page = opts.playEventPages[playPageIndex] ?? []
          playPageIndex += 1
          return resolve({ data: page, error: null })
        }
        // Diğer tablolar: tek satır (social_profiles için anlamlı) ya da boş.
        if (table === 'social_profiles') {
          return resolve({ data: [{ user_id: 'u1', display_name: 'Test' }], error: null })
        }
        if (table === 'platform_connections') {
          return resolve({
            data: [{ platform: 'spotify', connected_at: '2026-01-01', is_active: true }],
            error: null,
          })
        }
        return resolve({ data: [], error: null })
      },
    }
    return q
  }

  return {
    client: { from: (table: string) => query(table) } as never,
    calls,
  }
}

describe('collectUserDataExport', () => {
  it('platform_connections\'tan TOKEN alınmaz — yalnız meta', async () => {
    const { client, calls } = makeClient({ playEventPages: [[]] })
    const bundle = await collectUserDataExport(client, 'u1', 'a@b.com')

    const connCall = calls.find((c) => c.table === 'platform_connections')
    expect(connCall).toBeDefined()
    // select ifadesinde access_token / refresh_token GEÇMEMELİ
    expect(connCall!.selected).not.toContain('token')
    expect(connCall!.selected).toBe('platform, connected_at, is_active')

    // Çıktıda da token anahtarı bulunmamalı
    const json = JSON.stringify(bundle)
    expect(json).not.toContain('access_token')
    expect(json).not.toContain('refresh_token')
  })

  it('play_events sayfalanarak çekilir (§1.65 kırpma aşılır)', async () => {
    // 1000'lik iki dolu sayfa + kısa üçüncü sayfa → 3 range çağrısı, sonra durur.
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: i }))
    const tail = [{ id: 9001 }]
    const { client, calls } = makeClient({ playEventPages: [full, full, tail] })

    const bundle = await collectUserDataExport(client, 'u1', null)

    // fetchAllRows her sayfa için ayrı .from('play_events') çağırır → 3 kayıt.
    const peRanges = calls
      .filter((c) => c.table === 'play_events')
      .flatMap((c) => c.ranges)
    // İki dolu sayfa (1000+1000) çekildi, üçüncüde kısa sayfa → durdu.
    expect(peRanges.length).toBe(3)
    expect(peRanges[0]).toEqual([0, 999])
    expect(peRanges[1]).toEqual([1000, 1999])
    expect(bundle.play_events.count).toBe(2001)
  })

  it('meta notu KVKK açıklaması içerir + email geçer', async () => {
    const { client } = makeClient({ playEventPages: [[]] })
    const bundle = await collectUserDataExport(client, 'u1', 'a@b.com')
    expect(bundle.meta.email).toBe('a@b.com')
    expect(bundle.meta.format_version).toBe(1)
    expect(bundle.meta.note).toContain('KVKK')
  })
})
