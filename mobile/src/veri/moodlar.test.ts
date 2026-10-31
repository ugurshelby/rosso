import { MOODLAR, moodBul, moodKapakUri, moodSarkilari } from './moodlar'

describe('mood tanımları', () => {
  it('12 mood: 7 Rosso + 5 günlük, anahtarlar tekil', () => {
    expect(MOODLAR).toHaveLength(12)
    expect(MOODLAR.filter((m) => m.grup === 'rosso')).toHaveLength(7)
    expect(new Set(MOODLAR.map((m) => m.anahtar)).size).toBe(12)
  })

  it('kapak kurulumun kendi sitesinden; adres yoksa null', () => {
    const m = moodBul('closer')!
    expect(moodKapakUri('https://rosso.example', m)).toBe('https://rosso.example/vibe-cards/synthwave-romantic.webp')
    expect(moodKapakUri('', m)).toBeNull()
  })
})

describe('moodSarkilari', () => {
  const payload = [
    { track_id: 't1', title: 'A', artist_name: 'X', image_url: 'u', spotify_id: 's1', play_count: 3 },
    { track_id: 't2', title: 'B', artist_name: 'Y', image_url: null, spotify_id: null, play_count: '2' },
    { title: 'kimliksiz' },
    null,
  ]

  it('payload satırlarını eşler, sayıyı sayıya çevirir, bozuk satırı atlar', () => {
    expect(moodSarkilari(payload)).toEqual([
      { trackId: 't1', ad: 'A', sanatci: 'X', kapak: 'u', spotifyId: 's1', sayi: 3 },
      { trackId: 't2', ad: 'B', sanatci: 'Y', kapak: null, spotifyId: null, sayi: 2 },
    ])
  })

  it('gizlenenleri çıkarır; dizi değilse boş', () => {
    expect(moodSarkilari(payload, ['t1']).map((s) => s.trackId)).toEqual(['t2'])
    expect(moodSarkilari({ yanlis: true })).toEqual([])
  })
})
