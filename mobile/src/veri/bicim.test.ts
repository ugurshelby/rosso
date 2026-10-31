import { ayBaslangici, sanatciMetni, sureMetni, tekillestir , donemBaslangici, gunBasligi, gunlereBol, saatMetni } from './bicim'


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

describe('geçmiş yardımcıları', () => {
  const simdi = new Date(2026, 9, 31, 4, 30)

  it('dönem başlangıçları yerel saatle', () => {
    expect(donemBaslangici('bugun', simdi).getDate()).toBe(31)
    expect(donemBaslangici('7gun', simdi).getDate()).toBe(25)
    expect(donemBaslangici('30gun', simdi).getDate()).toBe(2)
    expect(donemBaslangici('yil', simdi).getMonth()).toBe(0)
  })

  it('gün başlığı', () => {
    expect(gunBasligi(new Date(2026, 9, 31, 1).toISOString(), simdi)).toBe('Bugün')
    expect(gunBasligi(new Date(2026, 9, 30, 23).toISOString(), simdi)).toBe('Dün')
    expect(gunBasligi(new Date(2026, 9, 28, 12).toISOString(), simdi)).toBe('28 Ekim')
    expect(gunBasligi(new Date(2025, 11, 31, 12).toISOString(), simdi)).toBe('31 Aralık 2025')
  })

  it('saat metni iki haneli', () => {
    expect(saatMetni(new Date(2026, 0, 1, 7, 5).toISOString())).toBe('07:05')
  })

  it('gün başlıkları araya girer, başlık indeksleri yapışkan liste için döner', () => {
    const l = [new Date(2026, 9, 31, 3), new Date(2026, 9, 31, 2), new Date(2026, 9, 30, 22)].map((d) => ({ zaman: d.toISOString() }))
    const { ogeler, basliklar } = gunlereBol(l, simdi)
    expect(ogeler.map((o) => (o.tur === 'baslik' ? o.baslik : 'x'))).toEqual(['Bugün', 'x', 'x', 'Dün', 'x'])
    expect(basliklar).toEqual([0, 3])
  })
})
