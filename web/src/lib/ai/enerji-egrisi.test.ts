import { describe, it, expect } from 'vitest'
import { enerjiEgrisiUygula, hedefEnerji, type EgriAdayi } from './enerji-egrisi'

// ---------------------------------------------------------------------------
// §5.6 enerji eğrisi. Sözleşmeler:
//   1. Parça EKLENMEZ, ATILMAZ — yalnız sıra değişir (liste bütünlüğü).
//   2. Eğri şekli: başı ve sonu, ortadan (zirveden) daha düşük enerjili.
//   3. Modelin kararına saygı: enerjisi bilinmeyen yerinde kalır, aynı enerji
//      katmanındaki parçaların göreli sırası korunur.
//   4. Tek seviyeli (düz) listeye dokunulmaz.
// ---------------------------------------------------------------------------

const SEV = { low: 1, medium: 2, high: 3, explosive: 4 } as const

function aday(id: string, e?: keyof typeof SEV, a = `sanatci-${id}`): EgriAdayi {
  return { id, a, e }
}

const seviyeleri = (ids: string[], adaylar: EgriAdayi[]): number[] =>
  ids.map((id) => SEV[adaylar.find((x) => x.id === id)!.e as keyof typeof SEV])

describe('hedefEnerji', () => {
  it('ısınma → zirve → dingin kapanış şeklini verir', () => {
    expect(hedefEnerji(0)).toBeLessThan(hedefEnerji(0.65))
    expect(hedefEnerji(1)).toBeLessThan(hedefEnerji(0.65))
    expect(hedefEnerji(0.65)).toBeCloseTo(1)
  })
})

describe('enerjiEgrisiUygula', () => {
  // Model sırası: yüksekten düşüğe (eğrinin tam tersi — en kötü durum).
  const adaylar = [
    aday('a', 'explosive'),
    aday('b', 'high'),
    aday('c', 'high'),
    aday('d', 'medium'),
    aday('e', 'medium'),
    aday('f', 'low'),
    aday('g', 'low'),
  ]
  const modelSirasi = adaylar.map((x) => x.id)

  it('parça eklemez ve atmaz — yalnız sırayı değiştirir', () => {
    const sonuc = enerjiEgrisiUygula(modelSirasi, adaylar)
    expect([...sonuc].sort()).toEqual([...modelSirasi].sort())
    expect(sonuc).toHaveLength(modelSirasi.length)
  })

  it('zirve ortada, baş ve son daha sakin', () => {
    const s = seviyeleri(enerjiEgrisiUygula(modelSirasi, adaylar), adaylar)
    const zirve = Math.max(...s)
    const zirveKonumu = s.indexOf(zirve)
    expect(zirveKonumu).toBeGreaterThan(0)
    expect(zirveKonumu).toBeLessThan(s.length - 1)
    expect(s[0]).toBeLessThan(zirve)
    expect(s[s.length - 1]).toBeLessThan(zirve)
  })

  it('aynı enerji katmanında modelin göreli sırasını korur', () => {
    const sonuc = enerjiEgrisiUygula(modelSirasi, adaylar)
    expect(sonuc.indexOf('b')).toBeLessThan(sonuc.indexOf('c'))
    expect(sonuc.indexOf('d')).toBeLessThan(sonuc.indexOf('e'))
    expect(sonuc.indexOf('f')).toBeLessThan(sonuc.indexOf('g'))
  })

  it('enerjisi bilinmeyen parça modelin koyduğu yerde kalır', () => {
    const karisik = [...adaylar.slice(0, 3), aday('x'), ...adaylar.slice(3)]
    const sira = karisik.map((x) => x.id)
    const sonuc = enerjiEgrisiUygula(sira, karisik)
    expect(sonuc.indexOf('x')).toBe(sira.indexOf('x'))
  })

  it('tek enerji seviyeli (düz) listeye dokunmaz', () => {
    const duz = ['p', 'q', 'r', 's'].map((id) => aday(id, 'low'))
    const sira = duz.map((x) => x.id)
    expect(enerjiEgrisiUygula(sira, duz)).toEqual(sira)
  })

  it('3’ten az enerjili parçada dokunmaz (eğri kurulamaz)', () => {
    const az = [aday('p', 'high'), aday('q', 'low'), aday('r')]
    const sira = az.map((x) => x.id)
    expect(enerjiEgrisiUygula(sira, az)).toEqual(sira)
  })

  it('aynı sanatçıyı art arda koymamaya çalışır (eğriyi bozmadan)', () => {
    const tekrarli = [
      aday('a', 'medium', 'X'),
      aday('b', 'medium', 'X'),
      aday('c', 'medium', 'Y'),
      aday('d', 'low', 'Z'),
      aday('e', 'high', 'W'),
    ]
    const sonuc = enerjiEgrisiUygula(tekrarli.map((x) => x.id), tekrarli)
    const sanatcilar = sonuc.map((id) => tekrarli.find((x) => x.id === id)!.a)
    for (let i = 1; i < sanatcilar.length; i += 1) {
      expect(sanatcilar[i] === 'X' && sanatcilar[i - 1] === 'X').toBe(false)
    }
  })

  it('bilinmeyen enerji değerini (uydurma etiket) bilinmiyor sayar', () => {
    const tuhaf = [aday('a', 'high'), aday('b', 'low'), aday('c', 'medium'), { id: 'd', a: 'q', e: 'nükleer' }]
    const sira = tuhaf.map((x) => x.id)
    const sonuc = enerjiEgrisiUygula(sira, tuhaf)
    expect(sonuc.indexOf('d')).toBe(3)
  })
})
