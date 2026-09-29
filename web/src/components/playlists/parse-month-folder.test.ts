import { describe, it, expect } from 'vitest'
import { parseMonthFolder } from './parse-month-folder'

describe('parseMonthFolder', () => {
  describe('klasörlenmeli — ay + yıl birlikte', () => {
    it('canlı format "2021 · Ağustos" (yıl · TR ay)', () => {
      expect(parseMonthFolder('2021 · Ağustos')).toEqual({
        year: '2021', month: 8, monthLabel: 'August',
      })
    })

    it('Sahip örneği "November 2023" (EN ay + yıl)', () => {
      expect(parseMonthFolder('November 2023')).toEqual({
        year: '2023', month: 11, monthLabel: 'November',
      })
    })

    it('ters sıra "Ağustos 2021" (ay + yıl) da tanınır', () => {
      expect(parseMonthFolder('Ağustos 2021')).toEqual({
        year: '2021', month: 8, monthLabel: 'August',
      })
    })

    it('ters sıra "2023 November" (yıl + EN ay)', () => {
      expect(parseMonthFolder('2023 November')).toEqual({
        year: '2023', month: 11, monthLabel: 'November',
      })
    })

    it('aksansız yazım "2022 agustos" (i-noktası/şapka toleransı)', () => {
      expect(parseMonthFolder('2022 agustos')).toEqual({
        year: '2022', month: 8, monthLabel: 'August',
      })
    })

    it('EN kısaltma "Dec 2024"', () => {
      expect(parseMonthFolder('Dec 2024')).toEqual({
        year: '2024', month: 12, monthLabel: 'December',
      })
    })

    it('tüm canlı TR ayları doğru indekslenir', () => {
      const cases: [string, number][] = [
        ['2021 · Ocak', 1], ['2021 · Şubat', 2], ['2021 · Mart', 3],
        ['2021 · Nisan', 4], ['2021 · Mayıs', 5], ['2021 · Haziran', 6],
        ['2021 · Temmuz', 7], ['2021 · Ağustos', 8], ['2021 · Eylül', 9],
        ['2021 · Ekim', 10], ['2021 · Kasım', 11], ['2021 · Aralık', 12],
      ]
      for (const [name, expectedMonth] of cases) {
        expect(parseMonthFolder(name)?.month).toBe(expectedMonth)
      }
    })
  })

  describe('klasörlenmemeli — null döner', () => {
    it('yıllık "2021" (yalnız yıl, ay yok)', () => {
      expect(parseMonthFolder('2021')).toBeNull()
    })

    it('yalnız ay "August" (yıl yok)', () => {
      expect(parseMonthFolder('August')).toBeNull()
    })

    it('rastgele isim "RÜYA"', () => {
      expect(parseMonthFolder('RÜYA')).toBeNull()
    })

    it('boş isim', () => {
      expect(parseMonthFolder('')).toBeNull()
    })

    it('yıl gibi görünen ama aralık dışı "3000 Ocak"', () => {
      expect(parseMonthFolder('3000 Ocak')).toBeNull()
    })

    it('"Gece Sürüşü" gibi ay kelimesi içermeyen serbest isim', () => {
      expect(parseMonthFolder('Gece Sürüşü')).toBeNull()
    })
  })

  describe('kenar durumlar', () => {
    it('ilk yılı alır, ikinci yılı yok sayar ("2021 Ağustos 2022")', () => {
      // İlk eşleşen yıl kazanır — belirsiz isimlerde deterministik davranış.
      expect(parseMonthFolder('2021 Ağustos 2022')?.year).toBe('2021')
    })

    it('ay kelimesi bir cümlenin içindeyse yine yakalar ("Best of Ağustos 2021")', () => {
      expect(parseMonthFolder('Best of Ağustos 2021')).toEqual({
        year: '2021', month: 8, monthLabel: 'August',
      })
    })
  })
})
