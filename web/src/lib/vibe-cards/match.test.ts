import { describe, it, expect } from 'vitest'
import { matchVibeCard } from './match'
import { VIBE_CARD_ORDER } from './data'
import type { TasteProfile } from '@/lib/analytics/taste-profile'

function profile(partial: Partial<TasteProfile>): TasteProfile {
  return {
    available: true,
    explorationRate: null, shuffleReliance: null, completionLoyalty: null,
    intentionality: null, peakHour: null, isNightOwl: null, countryDiversity: null,
    entropy: null, dominantGenre: null, mainstreamNess: null, mainstreamSource: null,
    identityWords: [], identityBlurb: null,
    hasL2: true, hasL3: false, genreCoveragePct: 100, isMature: true,
    ...partial,
  }
}

describe('matchVibeCard', () => {
  it('profil yoksa hash fallback verir (deterministik)', () => {
    const a = matchVibeCard(null, 'user-1')
    const b = matchVibeCard(null, 'user-1')
    expect(a).toBe(b)
    expect(VIBE_CARD_ORDER).toContain(a)
  })

  it('available=false ise fallback', () => {
    const card = matchVibeCard(profile({ available: false }), 'seed-x')
    expect(VIBE_CARD_ORDER).toContain(card)
  })

  it('hiç sinyal yoksa fallback (tüm eksenler null)', () => {
    const card = matchVibeCard(profile({}), 'seed-y')
    expect(VIBE_CARD_ORDER).toContain(card)
  })

  it('gece + niyetli + niş → gece melankolisti', () => {
    const card = matchVibeCard(profile({
      isNightOwl: true, shuffleReliance: 0.15, mainstreamNess: 0.2, intentionality: 0.8,
    }), 's')
    expect(card).toBe('night-melancholist')
  })

  it('yüksek niyet + düşük shuffle + sadık + niş → analog koleksiyoncusu', () => {
    const card = matchVibeCard(profile({
      intentionality: 0.95, shuffleReliance: 0.05, mainstreamNess: 0.15, completionLoyalty: 0.9,
    }), 's')
    expect(card).toBe('analog-collector')
  })

  it('shuffle bağımlı + popüler + pasif → neon yolcusu', () => {
    const card = matchVibeCard(profile({
      shuffleReliance: 0.9, mainstreamNess: 0.75, intentionality: 0.15,
    }), 's')
    expect(card).toBe('neon-drifter')
  })

  it('gündüz + keşifçi + popüler → ışık arayıcısı', () => {
    const card = matchVibeCard(profile({
      isNightOwl: false, explorationRate: 0.85, mainstreamNess: 0.6, intentionality: 0.55,
    }), 's')
    expect(card).toBe('light-chaser')
  })

  it('yüksek coğrafi çeşitlilik baskın sinyal → fırtına taşıyan', () => {
    // stormbearer'ı ayıran ana eksen countryDiversity (0.85); onu izole ederiz.
    const card = matchVibeCard(profile({
      countryDiversity: 6, explorationRate: 0.75, shuffleReliance: 0.5, isNightOwl: true,
    }), 's')
    expect(card).toBe('stormbearer')
  })

  it('aynı profil her zaman aynı kartı verir (deterministik)', () => {
    const p = profile({ isNightOwl: true, intentionality: 0.7 })
    expect(matchVibeCard(p, 'a')).toBe(matchVibeCard(p, 'b'))
  })
})
