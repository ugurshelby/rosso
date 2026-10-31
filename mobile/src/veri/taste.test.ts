import { saatlikDagilim, turPaylari, yuzdeMetni } from './taste'

describe('turPaylari', () => {
  it('payları büyükten küçüğe, sınırla, sıfırları atarak', () => {
    const p = { genres: [{ genre: 'rock', play_count: 30 }, { genre: 'pop', play_count: 60 }, { genre: 'jazz', play_count: 10 }, { genre: 'x', play_count: 0 }] }
    expect(turPaylari(p, 2)).toEqual([
      { tur: 'pop', oran: 0.6 },
      { tur: 'rock', oran: 0.3 },
    ])
    expect(turPaylari({ genres: 'bozuk' })).toEqual([])
    expect(turPaylari(null)).toEqual([])
  })
})

describe('saatlikDagilim', () => {
  it('24 hücre, eksik saat 0, en yoğun saat', () => {
    const { saatler, enYogun } = saatlikDagilim({ hourly: [{ hour: 23, play_count: 9 }, { hour: 2, play_count: 4 }, { hour: 30, play_count: 99 }] })
    expect(saatler).toHaveLength(24)
    expect(saatler[23]).toBe(9)
    expect(enYogun).toBe(23)
    expect(saatlikDagilim({}).enYogun).toBeNull()
  })

  it('yüzde metni', () => {
    expect(yuzdeMetni(0.345)).toBe('%35')
  })
})
