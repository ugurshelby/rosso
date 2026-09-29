import { RECAP_COVER_ART_POOL } from '@/lib/recap/cover-art'
import { VIBE_CARD_ORDER, type VibeCardId } from './data'

/** Journey hero'da kullanılabilen tüm 1:1 sanat slugu'ları. */
export const JOURNEY_VIBE_ART_POOL = [
  ...VIBE_CARD_ORDER,
  ...RECAP_COVER_ART_POOL.filter((id) => !(VIBE_CARD_ORDER as readonly string[]).includes(id)),
] as const

export type JourneyVibeArtSlug = (typeof JOURNEY_VIBE_ART_POOL)[number]

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

export const JOURNEY_HERO_COMPANION_COUNT = 8

/**
 * Kullanıcının kimlik kartı merkezde; 8 eşlik kartı deterministik seçilir.
 * Aynı kullanıcı her açılışta aynı kompozisyonu görür.
 */
export function pickJourneyHeroCompanions(
  primaryId: VibeCardId,
  seed: string,
  count = JOURNEY_HERO_COMPANION_COUNT,
): JourneyVibeArtSlug[] {
  const pool = JOURNEY_VIBE_ART_POOL.filter((id) => id !== primaryId)
  if (pool.length === 0 || count <= 0) return []

  let state = hashSeed(`${seed}:journey-hero-companions`)
  const picks: JourneyVibeArtSlug[] = []
  const remaining = [...pool]

  while (picks.length < count && remaining.length > 0) {
    state = (state * 1664525 + 1013904223) >>> 0
    const idx = state % remaining.length
    picks.push(remaining[idx]!)
    remaining.splice(idx, 1)
  }

  return picks
}

export function journeyVibeArtSrc(slug: JourneyVibeArtSlug): string {
  return `/vibe-cards/${slug}.webp`
}
