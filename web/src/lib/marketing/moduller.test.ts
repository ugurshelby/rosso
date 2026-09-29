import { describe, it, expect } from 'vitest'
import {
  MODUL_ANAHTARLARI,
  MODUL_ICERIGI,
  MODUL_MERKEZI,
  MODUL_SLUGLARI,
  modulAnahtariBul,
  modulYolu,
} from './moduller'
import { DILLER, yerelYol } from './dil'

describe('modül tanıtım sayfaları — SEO veri bütünlüğü', () => {
  it('slug\'lar benzersiz, iki dilde aynı ve dashboard yollarıyla çakışmaz', () => {
    const sluglar = MODUL_ANAHTARLARI.map((k) => MODUL_SLUGLARI[k])
    expect(new Set(sluglar).size).toBe(sluglar.length)
    for (const k of MODUL_ANAHTARLARI) {
      expect(modulYolu(k)).toBe(`/modules/${MODUL_SLUGLARI[k]}`)
      // /taste /recap /journey /playlists dashboard: robots.ts kapalı → tanıtım sayfası ayrı adreste
      expect(modulYolu(k)).not.toMatch(/^\/(taste|recap|journey|playlists)(\/|$)/)
      expect(modulAnahtariBul(MODUL_SLUGLARI[k])).toBe(k)
    }
    expect(modulAnahtariBul('yok-boyle-bir-sayfa')).toBeNull()
  })

  it('EN yolları /en önekiyle, TR öneksiz', () => {
    expect(yerelYol('tr', modulYolu('recap'))).toBe('/modules/spotify-recap')
    expect(yerelYol('en', modulYolu('recap'))).toBe('/en/modules/spotify-recap')
  })

  for (const dil of DILLER) {
    describe(`içerik (${dil})`, () => {
      for (const k of MODUL_ANAHTARLARI) {
        const c = MODUL_ICERIGI[dil][k]

        it(`${k}: meta uzunlukları arama sonucuna sığar`, () => {
          expect(c.metaBaslik.length).toBeGreaterThanOrEqual(25)
          expect(c.metaBaslik.length).toBeLessThanOrEqual(58) // + " — Rosso" ≈ 66
          expect(c.metaAciklama.length).toBeGreaterThanOrEqual(100)
          expect(c.metaAciklama.length).toBeLessThanOrEqual(165)
        })

        it(`${k}: birincil anahtar kelime başlıkta VE H1'de geçer`, () => {
          const birincil = c.anahtarKelimeler[0]!.toLocaleLowerCase(dil === 'tr' ? 'tr-TR' : 'en-US')
          // Türkçe çekim ekleri nedeniyle ilk kelimeyle ("spotify") ve ikinci kökle eşleşir
          const kok = birincil.split(' ').slice(0, 2).join(' ').slice(0, 14)
          const lc = (s: string) => s.toLocaleLowerCase(dil === 'tr' ? 'tr-TR' : 'en-US')
          expect(lc(c.metaBaslik)).toContain(kok)
          expect(lc(c.baslik)).toContain(kok)
        })

        it(`${k}: yeterli görünür içerik ve SSS`, () => {
          expect(c.ozellikler.length).toBeGreaterThanOrEqual(4)
          expect(c.bolumler.length).toBeGreaterThanOrEqual(2)
          expect(c.sss.length).toBeGreaterThanOrEqual(3)
          expect(c.adimlar.length).toBeGreaterThanOrEqual(3)
          expect(c.anahtarKelimeler.length).toBeGreaterThanOrEqual(4)
        })

        it(`${k}: sosyal/taşıma vaadi ve olmayan özellik YOK (yalnız inkâr cümlesi geçebilir)`, () => {
          const hepsi = JSON.stringify(c).toLowerCase()
          for (const yasak of ['arkadaş', 'friend', 'eşleş', 'matching', 'blend', 'apple music', 'youtube', 'taşıma', 'migrate', 'tempo', 'bpm']) {
            expect(hepsi, `${dil}/${k} içinde "${yasak}"`).not.toContain(yasak)
          }
        })

        it(`${k}: ilgili modüller geçerli ve kendisini göstermez`, () => {
          for (const i of c.ilgili) {
            expect(MODUL_ANAHTARLARI).toContain(i)
            expect(i).not.toBe(k)
          }
        })
      }
    })
  }

  it('iki dilde aynı modül kümesi ve merkez metinleri var', () => {
    expect(Object.keys(MODUL_ICERIGI.tr).sort()).toEqual(Object.keys(MODUL_ICERIGI.en).sort())
    expect(MODUL_MERKEZI.tr.baslik).toBeTruthy()
    expect(MODUL_MERKEZI.en.baslik).toBeTruthy()
  })
})
