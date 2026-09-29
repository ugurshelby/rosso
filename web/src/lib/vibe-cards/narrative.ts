import type { VibeCardId } from './data'

/**
 * Vibe Kartı hikâye metinleri — Taste hero'sundaki "bu kart neden bana
 * seçildi?" açıklaması. Sahip 2026-07-17: "görselin altındaki açıklama
 * kartın hikâyesini anlatsın, kullanıcı için neden seçildi anlatsın."
 *
 * Sabit, elle küratlı 10 metin (kart sayısı kadar). 2026-09-19'dan beri bunlar YEDEK:
 * Sahip kişiye özel AI açıklamasını istedi (`editorial-taste.ts`, `editorial_notes`
 * kind='taste_identity'); not yoksa bu metinler eskisi gibi çizilir. match.ts'teki
 * SIGNATURES tanımlarından türetildi: her metin o arketipin imza sinyalini
 * ("gece kuşu", "niyetli", "keşifçi" vb.) ikinci tekil şahıs sesle anlatır.
 */
export const VIBE_CARD_NARRATIVE: Record<VibeCardId, string> = {
  'night-melancholist':
    'You listen late at night, when the quiet settles — and you choose with intention, not at random. Popular lists barely pull you; you have a corner of your own, less known.',
  'synthwave-romantic':
    'You belong to the night, but you return to a familiar current, not to chaos. You do not leave songs unfinished — you find ease in loyalty, not in the middle of the road.',
  'twilight-seeker':
    'Late afternoon is when you hunt. You look for the new, but in a narrow geography — you travel deep, not wide.',
  'neon-drifter':
    'You let go of control and give yourself to the flow — shuffle is your natural state. Popular does not bother you; moving is enough.',
  'analog-collector':
    "You choose every song on purpose; you do not trust shuffle. Your taste is niche, and once you love something you do not let it go — this is your collection, not a random draw.",
  'quiet-minimalist':
    'You go deeper instead of wider. You stay loyal to a few songs, a few genres — you prefer a familiar quiet over noise.',
  firehearted:
    'Your energy is high: you listen a lot, you discover often, and you are open to the flow. Music does not keep you in one place — you are always in motion.',
  'memory-collector':
    'You rarely visit the new — you return to old, familiar songs and listen to them all the way through. For you, music is an archive of nostalgia.',
  stormbearer:
    'You listen across a wide geography, and you discover often — sounds from different corners of the world sit side by side on your list.',
  'light-chaser':
    'You are a daytime listener, always looking for something new, and you do not shy away from sharing what you find. Your ear is open, curious, facing forward.',
}

export function getVibeCardNarrative(id: VibeCardId): string {
  return (
    VIBE_CARD_NARRATIVE[id] ??
    'Your listening history carries this vibe — a long-term listener identity that can shift over time.'
  )
}
