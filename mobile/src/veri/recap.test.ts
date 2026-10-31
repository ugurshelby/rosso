import { hikayeSayfalari, tarihMetni } from './recap'

const ornek = {
  cover: { issue_label: 'No. 9', period_label: 'Eylül 2026' },
  manifesto: { minutes: 1250, tracks: 412, artists: 120, dominant_genre: 'indie' },
  top_tracks: [
    { title: 'A', artist: 'X', image_url: 'u1', plays: 40 },
    { title: 'B', artist: 'Y', image_url: '', plays: 30 },
  ],
  top_artists: [{ name: 'X', image_url: 'a1', plays: 90 }],
  obsession: { title: 'A', artist: 'X', plays: 18, span_days: 2, hours: 1 },
  streak: { days: 12, start: '2026-09-03', end: '2026-09-14' },
  peak_day: { day: '2026-09-20', minutes: 240, plays: 61, tracks: [] },
  extras: { number_one: {} },
}

describe('hikayeSayfalari', () => {
  it('canlı biçimden sırayla sayfa üretir', () => {
    const s = hikayeSayfalari(ornek, 'September 2026')
    expect(s.map((x) => x.tur)).toEqual(['kapak', 'sayilar', 'bir-numara', 'liste', 'liste', 'buyuk-sayi', 'buyuk-sayi', 'buyuk-sayi'])
    expect(s[0]).toEqual({ tur: 'kapak', ust: 'No. 9', baslik: 'Eylül 2026' })
    expect(s[1]).toMatchObject({ satirlar: expect.arrayContaining([{ etiket: 'Dinleme', deger: '20 sa 50 dk' }]) })
    expect(s[2]).toMatchObject({ oge: { ad: 'A', kapak: 'u1', sayi: 40 } })
    expect(s[3]).toMatchObject({ ogeler: [{ ad: 'A' }, { ad: 'B', kapak: null }] })
    expect(s[6]).toMatchObject({ deger: '12 gün', alt: '3 Eylül – 14 Eylül' })
  })

  it('eksik bölüm sayfa üretmez; keşif varsa eklenir', () => {
    expect(hikayeSayfalari({ cover: {} }, 'Ekim 2026')).toEqual([{ tur: 'kapak', ust: 'Recap', baslik: 'Ekim 2026' }])
    const k = hikayeSayfalari({ discovery: { new_tracks: 5, new_artists: 0 } }, 'x')
    expect(k.at(-1)).toMatchObject({ baslik: 'İlk kez' })
    expect(hikayeSayfalari(null, 'x')).toEqual([])
  })

  it('tarih metni', () => {
    expect(tarihMetni('2026-12-01')).toBe('1 Aralık')
    expect(tarihMetni('bozuk')).toBe('bozuk')
  })
})
