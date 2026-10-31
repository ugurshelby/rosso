import { ayBaslangici, sanatciMetni, sureMetni, tekillestir } from './bicim'

describe('ana sayfa yardımcıları', () => {
  it('sanatçı alanı dizi ya da metin olabilir', () => {
    expect(sanatciMetni(['A', 'B', 3])).toBe('A, B')
    expect(sanatciMetni('Tek')).toBe('Tek')
    expect(sanatciMetni(null)).toBe('')
  })

  it('süre metni', () => {
    expect(sureMetni(0)).toBe('0 dk')
    expect(sureMetni(125 * 60000)).toBe('2 sa 5 dk')
    expect(sureMetni((26 * 60 + 10) * 60000)).toBe('1 g 2 sa')
    expect(sureMetni(undefined)).toBe('0 dk')
  })

  it('ayın ilk günü yerel saatle', () => {
    const b = ayBaslangici(new Date(2026, 9, 31, 3, 40))
    expect([b.getFullYear(), b.getMonth(), b.getDate(), b.getHours()]).toEqual([2026, 9, 1, 0])
  })

  it('art arda dinlenen şarkı rayda bir kez, sınır korunur', () => {
    const l = ['a', 'a', 'b', 'c', 'b', 'd'].map((trackId) => ({ trackId }))
    expect(tekillestir(l, 3).map((o) => o.trackId)).toEqual(['a', 'b', 'c'])
  })
})
