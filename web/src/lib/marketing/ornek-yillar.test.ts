import { describe, it, expect } from 'vitest'
import { ornekYillar } from './ornek-yillar'

describe('ornekYillar', () => {
  it('verilen yılda biter ve artan sırada gider', () => {
    expect(ornekYillar(5, 2026)).toEqual([2022, 2023, 2024, 2025, 2026])
  })

  it('tek yıl istenirse yalnız o yılı döndürür', () => {
    expect(ornekYillar(1, 2031)).toEqual([2031])
  })

  it('geçersiz adet en az 1 yıla düşer', () => {
    expect(ornekYillar(0, 2026)).toEqual([2026])
  })

  it('yıl verilmezse bugünün yılında biter', () => {
    const yillar = ornekYillar(3)
    expect(yillar.at(-1)).toBe(new Date().getFullYear())
    expect(yillar).toHaveLength(3)
  })
})
