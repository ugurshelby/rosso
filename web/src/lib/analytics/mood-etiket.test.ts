import { describe, expect, it } from 'vitest'
import {
  MOOD_ETIKETLERI,
  MOOD_ETIKET_BILGISI,
  aiNegatifOrnekleri,
  aiPozitifOrnekSirasi,
  gecerliMoodEtiketi,
  listedenCikarirMi,
  type MoodEtiketi,
} from './mood-etiket'

describe('mood etiket sözlüğü', () => {
  it('her etiketin tek bilgisi var ve DB değerleriyle aynı', () => {
    expect(MOOD_ETIKET_BILGISI.map((b) => b.etiket)).toEqual([...MOOD_ETIKETLERI])
  })

  it('yalnız alakasız katalog uygunluğunu düşürür', () => {
    const negatif = MOOD_ETIKET_BILGISI.filter((b) => b.uygunluk === -1).map((b) => b.etiket)
    expect(negatif).toEqual(['alakasiz'])
  })

  it('"uygun, sevmedim" listeden çıkarır AMA listeye uygun sayılır', () => {
    const b = MOOD_ETIKET_BILGISI.find((x) => x.etiket === 'alakali_sevmedim')!
    expect(b.listedenCikarir).toBe(true)
    expect(b.uygunluk).toBe(1)
  })

  it('listedenCikarirMi etiketsizde false', () => {
    expect(listedenCikarirMi(null)).toBe(false)
    expect(listedenCikarirMi('alakasiz')).toBe(true)
    expect(listedenCikarirMi('cok_sevdim')).toBe(false)
  })

  it('geçersiz değeri reddeder', () => {
    expect(gecerliMoodEtiketi('uygun')).toBe(true)
    expect(gecerliMoodEtiketi('begendim')).toBe(false)
    expect(gecerliMoodEtiketi(null)).toBe(false)
  })
})

describe('AI örnek ayrımı', () => {
  const etiketler = new Map<string, MoodEtiketi>([
    ['a', 'alakasiz'],
    ['s', 'alakali_sevmedim'],
    ['u', 'uygun'],
    ['c', 'cok_sevdim'],
  ])

  it('🔴 "uygun, sevmedim" AI negatif örneğine GİTMEZ', () => {
    expect(aiNegatifOrnekleri(['a', 's', 'x'], etiketler)).toEqual(['a', 'x'])
  })

  it('pozitif örneklerde açık etiketler öne alınır', () => {
    expect(aiPozitifOrnekSirasi(['x', 'u', 'c'], etiketler)).toEqual(['c', 'u', 'x'])
  })
})
