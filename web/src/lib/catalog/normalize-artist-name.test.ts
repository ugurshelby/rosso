import { describe, expect, it } from 'vitest'
import { normalizeArtistName } from './normalize-artist-name'

describe('normalizeArtistName', () => {
  it('trims and lowercases with standard (non-Turkish-locale) casing', () => {
    expect(normalizeArtistName('Tame Impala')).toBe('tame impala')
  })

  it('does NOT dot the capital I the way Turkish locale would', () => {
    // Regresyon: toLocaleLowerCase('tr') "Imagine Dragons" -> "ımagine dragons"
    // üretiyordu (worker'ın plain .lower() ile "imagine dragons" üretmesinden
    // farklı) — aynı sanatçı için 2 farklı name_normalized, `artists`
    // tablosunda duplicate satır (bkz. migration 0302).
    expect(normalizeArtistName('Imagine Dragons')).toBe('imagine dragons')
    expect(normalizeArtistName('Uzi')).toBe('uzi')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeArtistName('  Drake  ')).toBe('drake')
  })
})
