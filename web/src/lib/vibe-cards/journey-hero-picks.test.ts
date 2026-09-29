import { describe, expect, it } from 'vitest'
import { pickJourneyHeroCompanions, JOURNEY_HERO_COMPANION_COUNT } from './journey-hero-picks'

describe('pickJourneyHeroCompanions', () => {
  it('primary kartı eşlik listesine almaz', () => {
    const picks = pickJourneyHeroCompanions('night-melancholist', 'user-a')
    expect(picks).toHaveLength(JOURNEY_HERO_COMPANION_COUNT)
    expect(picks).not.toContain('night-melancholist')
  })

  it('aynı seed ile deterministik seçer', () => {
    const a = pickJourneyHeroCompanions('firehearted', 'seed-1')
    const b = pickJourneyHeroCompanions('firehearted', 'seed-1')
    expect(a).toEqual(b)
  })
})
