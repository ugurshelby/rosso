import { describe, it, expect } from 'vitest'
import { ayAdi, donemEtiketi, donemler, doluYilMi, eslikcileriCoz, type EslikciAy } from './eslikciler'

const ay = (month: number, artist: string, plays = 10, title = `${artist} şarkı`): EslikciAy => ({
  month,
  plays: plays * 3,
  track: { trackId: `${artist}-${month}`, title, artist, imageUrl: null, plays },
})

describe('doluYilMi', () => {
  it('kullanım öncesi kırıntı yıllar bölüm olmaz', () => {
    expect(doluYilMi({ plays: 10, activeMonths: 1 })).toBe(false)
    expect(doluYilMi({ plays: 49, activeMonths: 2 })).toBe(false)
  })
  it('az ayda yoğun dinleme yetmez, en az 3 ay gerekir', () => {
    expect(doluYilMi({ plays: 900, activeMonths: 2 })).toBe(false)
  })
  it('dolu yıl kabul edilir', () => {
    expect(doluYilMi({ plays: 8636, activeMonths: 12 })).toBe(true)
  })
})

describe('donemler', () => {
  it('ardışık aylardaki aynı sanatçı tek döneme birleşir, en çok çalınan şarkı kahraman olur', () => {
    const d = donemler([ay(1, 'Dedublüman', 20), ay(2, 'dedublüman', 35, 'Belki'), ay(3, 'Madrigal')])
    expect(d).toHaveLength(2)
    expect(d[0]).toMatchObject({ from: 1, to: 2, artist: 'Dedublüman' })
    expect(d[0]!.track.title).toBe('Belki')
    expect(d[1]).toMatchObject({ from: 3, to: 3, artist: 'Madrigal' })
  })
  it('atlanan ay dönemi koparır', () => {
    const d = donemler([ay(1, 'A'), ay(3, 'A')])
    expect(d.map((x) => [x.from, x.to])).toEqual([[1, 1], [3, 3]])
  })
  it('sırasız girdi sıralanır', () => {
    expect(donemler([ay(5, 'B'), ay(4, 'B')])[0]).toMatchObject({ from: 4, to: 5 })
  })
})

describe('ay etiketleri', () => {
  it('seçili dilde ay adı', () => {
    expect(ayAdi(1, 'tr', 'long')).toBe('Ocak')
    expect(ayAdi(1, 'en', 'long')).toBe('January')
  })
  it('dönem etiketi tek ay / aralık', () => {
    expect(donemEtiketi({ from: 4, to: 4 }, 'en')).toBe('Apr')
    expect(donemEtiketi({ from: 1, to: 3 }, 'en')).toBe('Jan–Mar')
  })
})

describe('eslikcileriCoz', () => {
  it('bozuk girdi null', () => {
    expect(eslikcileriCoz(null)).toBeNull()
    expect(eslikcileriCoz('x')).toBeNull()
  })
  it('ham paketi tipli yapıya çevirir', () => {
    const r = eslikcileriCoz({
      years: [
        {
          year: 2021,
          plays: 1200,
          minutes: 3000,
          active_months: 12,
          top_artists: [{ name: 'A', plays: 100, minutes: 300, image_url: 'x.jpg' }],
          top_albums: [{ album: 'Al', artist: 'A', plays: 50, image_url: null }],
          top_tracks: [{ track_id: 't1', title: 'T', artist: 'A', image_url: '', plays: 40 }],
          months: [{ month: 2, plays: 90, track_id: 't1', title: 'T', artist: 'A', image_url: null, track_plays: 12 }],
          yogun_ay: { month: 2, track_id: 't1', title: 'T', artist: 'A', image_url: null, plays: 12 },
        },
      ],
      lifetime: {
        artists: [{ name: 'A', plays: 900, first_year: 2020, last_year: 2026, years_active: 7, image_url: null }],
        enduring: [{ track_id: 't1', title: 'T', artist: 'A', image_url: null, plays: 300, years: [2020, 2021, 2022] }],
      },
    })!
    expect(r.years[0]!.topTracks[0]!.imageUrl).toBeNull()
    expect(r.years[0]!.months[0]!.track.plays).toBe(12)
    expect(r.years[0]!.yogunAy).toMatchObject({ month: 2, plays: 12 })
    expect(r.lifetime.artists[0]).toMatchObject({ firstYear: 2020, yearsActive: 7 })
    expect(r.lifetime.enduring[0]!.years).toEqual([2020, 2021, 2022])
  })
})
