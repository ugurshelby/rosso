import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

let govde: { data: { body: unknown } | null; error?: unknown } = { data: null, error: null }
let havuz: Array<{ slug: string; label_tr: string; label_en: string }> = []
const ceptiler: Array<[string, string]> = []

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (t: string) => {
      if (t === 'editorial_tag_pool') {
        return { select: () => ({ in: async () => ({ data: havuz, error: null }) }) }
      }
      expect(t).toBe('editorial_notes')
      const zincir = {
        select: () => zincir,
        eq: (c: string, v: string) => {
          ceptiler.push([c, v])
          return zincir
        },
        maybeSingle: async () => govde,
      }
      return zincir
    },
  }),
}))

import {
  getJourneyKapanisi,
  getJourneyYilNotlari,
  getKuratorNotu,
  getRecapKarakteri,
  getTasteYorumlari,
} from './editorial-read'

beforeEach(() => {
  ceptiler.length = 0
  govde = { data: null, error: null }
  havuz = []
})

describe('editorial-read — AI olmadan da ekran tam', () => {
  it('not yoksa null / boş harita', async () => {
    expect(await getRecapKarakteri('u', 'August 2026')).toBeNull()
    expect(await getJourneyYilNotlari('u')).toEqual({})
    expect(await getKuratorNotu('u', 'nocturne')).toBeNull()
    expect(await getJourneyKapanisi('u')).toBeNull()
    expect(await getTasteYorumlari('u', 'neon-drifter')).toBeNull()
  })

  it('okuma hatasında çökmez', async () => {
    govde = { data: null, error: { message: 'boom' } }
    expect(await getRecapKarakteri('u', 'x')).toBeNull()
  })

  it('bozuk gövdeyi reddeder (şema doğrulaması)', async () => {
    govde = { data: { body: { words: ['a', 'b'] } } }
    expect(await getRecapKarakteri('u', 'x')).toBeNull()
    govde = { data: { body: { years: 'yanlis' } } }
    expect(await getJourneyYilNotlari('u')).toEqual({})
    govde = { data: { body: { tr: { paragraphs: ['tek'], last_line: 'x' } } } }
    expect(await getJourneyKapanisi('u')).toBeNull()
  })
})

describe('editorial-read — geçerli gövdeler', () => {
  it('recap karakteri: kullanıcı/tür/kapsamla filtreler, etiketleri havuzdan iki dilli çözer, sırayı korur', async () => {
    govde = { data: { body: { words: ['A', 'B', 'C'], stat: null, tags: ['hazy', 'hip-hop', 'silinmis'] } } }
    havuz = [
      { slug: 'hip-hop', label_tr: 'Hip-Hop', label_en: 'Hip-Hop' },
      { slug: 'hazy', label_tr: 'Puslu', label_en: 'Hazy' },
    ]
    expect(await getRecapKarakteri('u1', 'August 2026')).toEqual({
      words: ['A', 'B', 'C'],
      stat: null,
      tags: [
        { slug: 'hazy', tr: 'Puslu', en: 'Hazy' },
        { slug: 'hip-hop', tr: 'Hip-Hop', en: 'Hip-Hop' },
      ],
    })
    expect(ceptiler).toEqual([
      ['user_id', 'u1'],
      ['kind', 'recap_character'],
      ['scope', 'August 2026'],
    ])
  })

  it('etiketsiz eski recap notu (tags yok) boş etiketle döner', async () => {
    govde = { data: { body: { words: ['A', 'B', 'C'], stat: 'x y z' } } }
    expect(await getRecapKarakteri('u', 'x')).toMatchObject({ tags: [], stat: 'x y z' })
  })

  it('journey yıl notları: eski tek-cümle biçimi ve yeni hikâye biçimi birlikte okunur', async () => {
    govde = {
      data: {
        body: {
          years: { '2020': 'eski biçim', '2021': { note: 'n', circadian: 'c', comet: 'k', pillar: 'p' }, bozuk: 'x' },
        },
      },
    }
    expect(await getJourneyYilNotlari('u')).toEqual({
      2020: { note: 'eski biçim' },
      2021: { note: 'n', circadian: 'c', comet: 'k', pillar: 'p' },
    })
  })

  it('journey kapanışı: TR zorunlu, EN opsiyonel', async () => {
    const tr = { paragraphs: ['bir', 'iki', 'üç'], last_line: 'son' }
    govde = { data: { body: { tr } } }
    expect(await getJourneyKapanisi('u')).toEqual({ tr })
    govde = { data: { body: { tr, en: tr } } }
    expect(await getJourneyKapanisi('u')).toEqual({ tr, en: tr })
  })

  it('küratör notu', async () => {
    govde = { data: { body: { note: 'Gece boyunca akan bir seçki.' } } }
    expect(await getKuratorNotu('u1', 'nocturne')).toBe('Gece boyunca akan bir seçki.')
  })

  it('taste yorumları: vibe açıklaması yalnız HÂLÂ aynı karta aitse döner', async () => {
    govde = { data: { body: { axes: { Deep: 'yorum' }, vibe: 'You ...', vibe_card: 'neon-drifter' } } }
    expect(await getTasteYorumlari('u', 'neon-drifter')).toEqual({ axes: { Deep: 'yorum' }, vibe: 'You ...' })
    expect(await getTasteYorumlari('u', 'analog-collector')).toEqual({ axes: { Deep: 'yorum' }, vibe: null })
  })
})
