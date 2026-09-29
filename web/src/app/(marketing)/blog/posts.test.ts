import { describe, it, expect } from 'vitest'
import { YAZI_SLUGLARI, getPost, yazilar } from './posts'
import { MODUL_ANAHTARLARI } from '@/lib/marketing/moduller'
import { DILLER } from '@/lib/marketing/dil'

describe('blog yazıları — SEO bütünlüğü', () => {
  it('iki dilde aynı slug kümesi (hreflang slug üzerinden eşleşir)', () => {
    const tr = yazilar('tr').map((p) => p.slug).sort()
    const en = yazilar('en').map((p) => p.slug).sort()
    expect(en).toEqual(tr)
    expect(new Set(YAZI_SLUGLARI).size).toBe(YAZI_SLUGLARI.length)
  })

  for (const dil of DILLER) {
    for (const slug of YAZI_SLUGLARI) {
      it(`${dil}/${slug}: özet meta açıklamaya sığar, başlık dolu, gövde yeterli`, () => {
        const p = getPost(slug, dil)!
        expect(p.title.length).toBeGreaterThan(10)
        expect(p.excerpt.length).toBeGreaterThanOrEqual(60)
        expect(p.excerpt.length).toBeLessThanOrEqual(165)
        expect(p.body.length).toBeGreaterThanOrEqual(3)
        for (const k of p.moduller ?? []) expect(MODUL_ANAHTARLARI).toContain(k)
      })
    }
  }

  it('modül sayfalarını besleyen iki yazı var ve iki dilde aynı modüllere bağlanır', () => {
    for (const slug of ['spotify-gecmis-verini-indir', 'spotify-wrapped-alternatifi-aylik-recap']) {
      const tr = getPost(slug, 'tr')!
      const en = getPost(slug, 'en')!
      expect(tr.moduller?.length ?? 0).toBeGreaterThan(0)
      expect(en.moduller).toEqual(tr.moduller)
    }
  })
})
