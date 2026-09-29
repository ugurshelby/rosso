import { describe, it, expect } from 'vitest'
import { revealItemProps } from './progressive-reveal'

describe('revealItemProps — katman katman yükleme animasyon girdisi', () => {
  it('ilk parti (SSR) animasyonsuzdur', () => {
    expect(revealItemProps(0, 24, 24)).toEqual({})
    expect(revealItemProps(23, 24, 24)).toEqual({})
  })

  it('sonraki partiler sınıf + stagger değişkeni alır (parti içi sıra)', () => {
    const a = revealItemProps(24, 24, 24)
    expect(a.className).toBeTruthy()
    expect((a.style as Record<string, number>)['--reveal-i']).toBe(0)
    expect((revealItemProps(29, 24, 24).style as Record<string, number>)['--reveal-i']).toBe(5)
    // ikinci parti: sıra yeniden 0'dan başlar
    expect((revealItemProps(48, 24, 24).style as Record<string, number>)['--reveal-i']).toBe(0)
  })
})
