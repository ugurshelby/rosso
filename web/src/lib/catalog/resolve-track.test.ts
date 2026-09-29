import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { resolveOrCreateTrackByIdentity } = await import('./resolve-track')

// ---------------------------------------------------------------------------
// 0335 (2026-09-22, ÖLÇÜLDÜ): ISRC birleştirmesi "B aslında A'dır" bilgisini
// tutmuyordu; B tekrar geldiğinde yeni şarkı açılıyor, dinlemeler bölünüyor,
// ZIP'te aynı çalma ikinci kez yazılıyordu. Kilitlenen sözleşmeler:
//   1. Alias'lı ID → kanonik şarkı, YENİ SATIR AÇILMAZ.
//   2. ISRC ile bulunan varyant alias'a NOT EDİLİR (sonra ISRC'siz gelse de
//      doğru şarkıya bağlansın).
//   3. Birebir spotify_id eşleşmesi alias'tan önce gelir.
// ---------------------------------------------------------------------------

type Durum = {
  tracksBySpotify: Record<string, string>
  tracksByIsrc: Record<string, string>
  alias: Record<string, string>
  inserts: unknown[]
  aliasUpserts: unknown[]
}

function sahteSupabase(d: Durum) {
  return {
    from: (table: string) => {
      if (table === 'track_spotify_alias') {
        return {
          select: () => ({
            eq: (_c: string, v: string) => ({
              maybeSingle: () =>
                Promise.resolve({ data: d.alias[v] ? { track_id: d.alias[v] } : null, error: null }),
            }),
          }),
          upsert: (row: unknown) => {
            d.aliasUpserts.push(row)
            return Promise.resolve({ error: null })
          },
        }
      }
      return {
        select: () => ({
          eq: (col: string, v: string) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: col === 'spotify_id' && d.tracksBySpotify[v] ? { id: d.tracksBySpotify[v], image_url: 'x' } : null,
                error: null,
              }),
            limit: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: d.tracksByIsrc[v] ? { id: d.tracksByIsrc[v] } : null, error: null }),
            }),
          }),
        }),
        insert: (row: unknown) => {
          d.inserts.push(row)
          return { select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'YENI' }, error: null }) }) }
        },
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
    },
  } as unknown as Parameters<typeof resolveOrCreateTrackByIdentity>[0]
}

function durum(over: Partial<Durum> = {}): Durum {
  return { tracksBySpotify: {}, tracksByIsrc: {}, alias: {}, inserts: [], aliasUpserts: [], ...over }
}

describe('resolveOrCreateTrackByIdentity — alias (0335)', () => {
  it('birleştirilmiş eski ID kanonik şarkıya çözülür, yeni satır AÇILMAZ', async () => {
    const d = durum({ alias: { B: 'A_uuid' } })
    const id = await resolveOrCreateTrackByIdentity(sahteSupabase(d), { spotifyId: 'B', title: 'Centuries', artists: ['Fall Out Boy'] })
    expect(id).toBe('A_uuid')
    expect(d.inserts).toHaveLength(0)
  })

  it('ISRC ile bulunan varyant alias olarak NOT EDİLİR', async () => {
    const d = durum({ tracksByIsrc: { ISRC1: 'A_uuid' } })
    const id = await resolveOrCreateTrackByIdentity(sahteSupabase(d), { spotifyId: 'C', isrc: 'ISRC1', title: 't', artists: ['a'] })
    expect(id).toBe('A_uuid')
    expect(d.inserts).toHaveLength(0)
    expect(d.aliasUpserts).toEqual([{ spotify_id: 'C', track_id: 'A_uuid', kaynak: 'isrc' }])
  })

  it('birebir spotify_id eşleşmesi alias’tan önce gelir', async () => {
    const d = durum({ tracksBySpotify: { B: 'B_uuid' }, alias: { B: 'A_uuid' } })
    const id = await resolveOrCreateTrackByIdentity(sahteSupabase(d), { spotifyId: 'B', title: 't', artists: ['a'] })
    expect(id).toBe('B_uuid')
  })

  it('hiçbir yerde yoksa yeni satır açılır', async () => {
    const d = durum()
    const id = await resolveOrCreateTrackByIdentity(sahteSupabase(d), { spotifyId: 'Z', title: 't', artists: ['a'] })
    expect(id).toBe('YENI')
    expect(d.inserts).toHaveLength(1)
  })
})
