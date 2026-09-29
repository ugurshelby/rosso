import { describe, it, expect } from 'vitest'
import { groupByYear, hasFoldablePlaylists } from './group-by-year'
import type { PlaylistCardData } from './playlist-card'

function pl(name: string): PlaylistCardData {
  return {
    id: name, name, platform: 'spotify',
    track_count: 0, cover_url: null, synced_at: null,
  }
}

describe('groupByYear', () => {
  it('ay+yıl playlist\'lerini yıl klasörlerine, yıllığı klasörsüze koyar', () => {
    const { folders, unfoldered } = groupByYear([
      pl('2021 · Ağustos'), pl('2021 · Ocak'), pl('2021'), pl('RÜYA'),
    ])
    expect(folders).toHaveLength(1)
    expect(folders[0].year).toBe('2021')
    expect(folders[0].playlists.map((p) => p.name)).toEqual([
      '2021 · Ocak', '2021 · Ağustos', // ay indeksine göre artan (Ocak<Ağustos)
    ])
    expect(unfoldered.map((p) => p.name)).toEqual(['2021', 'RÜYA'])
  })

  it('yılları azalan sıralar (en yeni üstte)', () => {
    const { folders } = groupByYear([
      pl('2021 · Ocak'), pl('2023 · Ocak'), pl('2022 · Ocak'),
    ])
    expect(folders.map((f) => f.year)).toEqual(['2023', '2022', '2021'])
  })

  it('yıl içinde ayları Ocak→Aralık sıralar (giriş sırası bozuk olsa da)', () => {
    const { folders } = groupByYear([
      pl('2022 · Aralık'), pl('2022 · Mart'), pl('2022 · Ocak'),
    ])
    expect(folders[0].playlists.map((p) => p.name)).toEqual([
      '2022 · Ocak', '2022 · Mart', '2022 · Aralık',
    ])
  })

  it('hiç ay+yıl yoksa folders boş, hepsi unfoldered', () => {
    const { folders, unfoldered } = groupByYear([pl('RÜYA'), pl('2021')])
    expect(folders).toHaveLength(0)
    expect(unfoldered).toHaveLength(2)
  })

  it('boş girdide ikisi de boş', () => {
    const { folders, unfoldered } = groupByYear([])
    expect(folders).toHaveLength(0)
    expect(unfoldered).toHaveLength(0)
  })
})

describe('hasFoldablePlaylists', () => {
  it('en az bir ay+yıl varsa true', () => {
    expect(hasFoldablePlaylists([pl('RÜYA'), pl('2021 · Ağustos')])).toBe(true)
  })

  it('hiç ay+yıl yoksa false (toggle gösterilmez)', () => {
    expect(hasFoldablePlaylists([pl('RÜYA'), pl('2021'), pl('Night')])).toBe(false)
  })

  it('boş listede false', () => {
    expect(hasFoldablePlaylists([])).toBe(false)
  })
})
