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
    // Eski biçim (düz dizi) İngilizceydi: yalnız İngilizce arayüzde gösterilir.
    expect(await getRecapKarakteri('u1', 'August 2026', 'tr')).toBeNull()
    expect(await getRecapKarakteri('u1', 'August 2026', 'en')).toEqual({
      words: ['A', 'B', 'C'],
      stat: null,
      tags: [
        { slug: 'hazy', tr: 'Puslu', en: 'Hazy' },
        { slug: 'hip-hop', tr: 'Hip-Hop', en: 'Hip-Hop' },
      ],
    })
    expect(ceptiler.slice(-3)).toEqual([
      ['user_id', 'u1'],
      ['kind', 'recap_character'],
      ['scope', 'August 2026'],
    ])
  })

  it('etiketsiz eski recap notu (tags yok) boş etiketle döner', async () => {
    govde = { data: { body: { words: ['A', 'B', 'C'], stat: 'x y z' } } }
    expect(await getRecapKarakteri('u', 'x', 'en')).toMatchObject({ tags: [], stat: 'x y z' })
  })

  it('iki dilli recap karakteri seçili dilde döner', async () => {
    govde = {
      data: { body: { words: { tr: ['Ağır', 'Gelgit', 'Sakin'], en: ['Slow', 'Tidal', 'Calm'] }, stat: { tr: 'tr stat', en: 'en stat' } } },
    }
    expect(await getRecapKarakteri('u', 'x', 'tr')).toMatchObject({ words: ['Ağır', 'Gelgit', 'Sakin'], stat: 'tr stat' })
    expect(await getRecapKarakteri('u', 'x', 'en')).toMatchObject({ words: ['Slow', 'Tidal', 'Calm'], stat: 'en stat' })
  })

  it('journey yıl notları: iki dilli biçim seçili dilde; eski (İngilizce) biçim yalnız İngilizcede', async () => {
    govde = {
      data: {
        body: {
          years: {
            '2020': 'eski biçim',
            '2021': { note: 'n', circadian: 'c' },
            '2022': { tr: { note: 'tr not', story: 'tr hikâye' }, en: { note: 'en note' } },
            bozuk: 'x',
          },
        },
      },
    }
    expect(await getJourneyYilNotlari('u', 'tr')).toEqual({ 2022: { note: 'tr not', story: 'tr hikâye' } })
    expect(await getJourneyYilNotlari('u', 'en')).toEqual({
      2020: { note: 'eski biçim' },
      2021: { note: 'n' },
      2022: { note: 'en note' },
    })
  })

  it('journey kapanışı: iki dilden en az biri yeter', async () => {
    const tr = { paragraphs: ['bir', 'iki', 'üç'], last_line: 'son' }
    govde = { data: { body: { tr } } }
    expect(await getJourneyKapanisi('u')).toEqual({ tr })
    govde = { data: { body: { en: tr } } }
    expect(await getJourneyKapanisi('u')).toEqual({ en: tr })
    govde = { data: { body: { tr, en: tr } } }
    expect(await getJourneyKapanisi('u')).toEqual({ tr, en: tr })
    govde = { data: { body: {} } }
    expect(await getJourneyKapanisi('u')).toBeNull()
  })

  it('küratör notu', async () => {
    govde = { data: { body: { note: 'Gece boyunca akan bir seçki.' } } }
    expect(await getKuratorNotu('u1', 'nocturne')).toBe('Gece boyunca akan bir seçki.')
    expect(await getKuratorNotu('u1', 'nocturne', 'en')).toBeNull()
    govde = { data: { body: { note: 'Gece boyunca akan parçalar.', note_en: 'Tracks that drift through the night.' } } }
    expect(await getKuratorNotu('u1', 'nocturne', 'en')).toBe('Tracks that drift through the night.')
  })

  it('taste yorumları: vibe açıklaması yalnız HÂLÂ aynı karta aitse döner', async () => {
    // Eski biçim: eksenler Türkçe, vibe İngilizce düz metin.
    govde = { data: { body: { axes: { Deep: 'yorum' }, vibe: 'You ...', vibe_card: 'neon-drifter' } } }
    expect(await getTasteYorumlari('u', 'neon-drifter', 'tr')).toEqual({ axes: { Deep: 'yorum' }, vibe: null })
    expect(await getTasteYorumlari('u', 'neon-drifter', 'en')).toEqual({ axes: {}, vibe: 'You ...' })
    // İki dilli biçim.
    govde = {
      data: { body: { axes: { Deep: { tr: 'yorum', en: 'comment' } }, vibe: { tr: 'Sen ...', en: 'You ...' }, vibe_card: 'neon-drifter' } },
    }
    expect(await getTasteYorumlari('u', 'neon-drifter', 'tr')).toEqual({ axes: { Deep: 'yorum' }, vibe: 'Sen ...' })
    expect(await getTasteYorumlari('u', 'neon-drifter', 'en')).toEqual({ axes: { Deep: 'comment' }, vibe: 'You ...' })
    expect(await getTasteYorumlari('u', 'analog-collector', 'en')).toEqual({ axes: { Deep: 'comment' }, vibe: null })
  })
})
