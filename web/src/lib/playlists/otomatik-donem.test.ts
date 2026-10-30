import { describe, expect, it } from 'vitest'
import { bekleyenDonemler, donemAdi, TELAFI_AY_SINIRI } from './otomatik-donem'

const t = (iso: string) => new Date(iso)
const anahtarlar = (d: { anahtar: string }[]) => d.map((x) => x.anahtar)

describe('bekleyenDonemler — aylık', () => {
  it('kaçan ay telafi edilir: Ağustos var, Ekim sonunda Eylül bekler', () => {
    const d = bekleyenDonemler('top_month', new Set(['2026-08']), t('2026-10-30T12:00:00Z'), t('2026-07-26T00:00:00Z'))
    expect(anahtarlar(d)).toEqual(['2026-09'])
    expect(d[0].from).toBe('2026-09-01T00:00:00.000Z')
    expect(d[0].to).toBe('2026-10-01T00:00:00.000Z')
  })

  it('geç üretim bir sonraki ayı engellemez: Eylül 30 Ekim\'de üretildi, 1 Kasım\'da Ekim bekler', () => {
    const d = bekleyenDonemler('top_month', new Set(['2026-08', '2026-09']), t('2026-11-01T00:25:00Z'))
    expect(anahtarlar(d)).toEqual(['2026-10'])
  })

  it('birden çok kaçan ay en eskiden sıralanır', () => {
    const d = bekleyenDonemler('top_month', new Set(['2026-06']), t('2026-10-02T00:00:00Z'))
    expect(anahtarlar(d)).toEqual(['2026-07', '2026-08', '2026-09'])
  })

  it('kural oluşturulmadan önceki aylar doldurulmaz', () => {
    const d = bekleyenDonemler('top_month', new Set(), t('2026-10-02T00:00:00Z'), t('2026-08-15T00:00:00Z'))
    expect(anahtarlar(d)).toEqual(['2026-08', '2026-09'])
  })

  it(`en çok ${TELAFI_AY_SINIRI} ay geri gidilir`, () => {
    const d = bekleyenDonemler('top_month', new Set(), t('2026-12-05T00:00:00Z'))
    expect(d).toHaveLength(TELAFI_AY_SINIRI)
    expect(d.at(-1)?.anahtar).toBe('2026-11')
  })

  it('ocakta önceki yılın aralığı', () => {
    expect(anahtarlar(bekleyenDonemler('top_month', new Set(['2026-11']), t('2027-01-01T06:00:00Z')))).toEqual(['2026-12'])
  })

  it('ay tamamsa boş', () => {
    expect(bekleyenDonemler('top_month', new Set(['2026-09']), t('2026-10-30T00:00:00Z'))).toEqual([])
  })
})

describe('bekleyenDonemler — yıllık', () => {
  it('yalnız bir önceki yıl, yılda bir kez', () => {
    expect(bekleyenDonemler('top_year', new Set(['2025']), t('2026-10-30T00:00:00Z'))).toEqual([])
    const d = bekleyenDonemler('top_year', new Set(['2025']), t('2027-01-01T06:00:00Z'))
    expect(anahtarlar(d)).toEqual(['2026'])
    expect(d[0].from).toBe('2026-01-01T00:00:00.000Z')
    expect(d[0].to).toBe('2027-01-01T00:00:00.000Z')
  })

  it('içinde bulunulan yılın yarım listesini üretmez', () => {
    const d = bekleyenDonemler('top_year', new Set(), t('2026-09-01T00:00:00Z'))
    expect(anahtarlar(d)).toEqual(['2025'])
  })
})

describe('donemAdi', () => {
  const eylul = bekleyenDonemler('top_month', new Set(['2026-08']), t('2026-10-30T00:00:00Z'))[0]

  it('aylık: kural şablonu + Türkçe ay', () => {
    expect(donemAdi('top_month', eylul, '{month} - {year}', 'tr')).toBe('Eylül - 2026')
  })

  it('aylık: İngilizce tercih', () => {
    expect(donemAdi('top_month', eylul, '{month} - {year}', 'en')).toBe('September - 2026')
  })

  it('aylık: şablon yoksa varsayılan', () => {
    expect(donemAdi('top_month', eylul, null, null)).toBe('Eylül - 2026')
  })

  it('yıllık: yalnız yıl', () => {
    const y = bekleyenDonemler('top_year', new Set(), t('2027-01-02T00:00:00Z'))[0]
    expect(donemAdi('top_year', y, '{month} - {year}', 'tr')).toBe('2026')
  })
})
