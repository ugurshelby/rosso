/**
 * Recap yıllık kapak sanat havuzu (FAZ R0, 2026-07-20 — Sahip kararı).
 *
 * `public/vibe-cards/` altındaki 11 serbest sanat eseri (taste'in 10 arketip
 * kartından AYRI — kod tabanında henüz hiç referanslanmıyordu). Kullanıcı+yıl
 * deterministik hash ile seçilir: aynı kullanıcı aynı yılı her açtığında aynı
 * görseli görür, farklı yıllar farklı görsel alır. `vibe-cards/data.ts`
 * `pickVibeCardId` ile aynı desen — backend bağlanana kadar geçici değil,
 * bilinçli sabit seçim (Sahip: "public klasöründeki webp'lerden seçilecek").
 */

export const RECAP_COVER_ART_POOL = [
  'cloud-spiral-staircase',
  'floating-moss-flower-island',
  'hand-blue-light-streak',
  'pastel-pink-ringed-planet',
  'pastel-valley-river-blossoms',
  'purple-flower-red-background',
  'ringed-planets-moons-space',
  'statue-rainbow-prism',
  'twilight-terraced-hills-monolith',
  'warm-sunset-lake-cactus',
  'white-pink-peony-macro',
] as const

export type RecapCoverArtId = (typeof RECAP_COVER_ART_POOL)[number]

/** userId+periodLabel tohumuyla deterministik seçim — bkz. pickVibeCardId. */
export function pickRecapCoverArt(seed: string): RecapCoverArtId {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return RECAP_COVER_ART_POOL[hash % RECAP_COVER_ART_POOL.length]!
}

export function recapCoverArtSrc(id: RecapCoverArtId): string {
  return `/vibe-cards/${id}.webp`
}
