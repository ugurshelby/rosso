/**
 * Vibe Kartı — sabit 10'lu kürasyon seti (Sahip kararı, 2026-07-11).
 * Spotify "Club Badge" fikrinden ilham; her kart sinematik bir sanat sahnesiyle
 * dinleyici arketipini temsil eder. Görseller şu an TEMSİLİ (placeholder SVG) —
 * gerçek sanat eserleri Sahip tarafından temin edilince `artSlug` üzerinden
 * `/vibe-cards/<slug>.png` gibi bir yola bağlanacak (henüz kararlaştırılmadı).
 *
 * Eşleştirme kural tablosu (hangi sinyal → hangi kart) henüz yazılmadı — bu dosya
 * yalnız sabit veri seti. `docs/plans/active/rosso-production-continuous-plan.md`
 * → FAZ STORY-DECK + VIBE KARTI.
 */

export type VibeCardId =
  | 'night-melancholist'
  | 'synthwave-romantic'
  | 'twilight-seeker'
  | 'neon-drifter'
  | 'analog-collector'
  | 'quiet-minimalist'
  | 'firehearted'
  | 'memory-collector'
  | 'stormbearer'
  | 'light-chaser'

export interface VibeCard {
  id: VibeCardId
  nameTr: string
  nameEn: string
}

export const VIBE_CARDS: Record<VibeCardId, VibeCard> = {
  'night-melancholist': { id: 'night-melancholist', nameTr: 'Night Melancholist', nameEn: 'Night Melancholist' },
  'synthwave-romantic': { id: 'synthwave-romantic', nameTr: 'Synthwave Romantic', nameEn: 'Synthwave Romantic' },
  'twilight-seeker': { id: 'twilight-seeker', nameTr: 'Twilight Seeker', nameEn: 'Twilight Seeker' },
  'neon-drifter': { id: 'neon-drifter', nameTr: 'Neon Drifter', nameEn: 'Neon Drifter' },
  'analog-collector': { id: 'analog-collector', nameTr: 'Analog Collector', nameEn: 'Analog Collector' },
  'quiet-minimalist': { id: 'quiet-minimalist', nameTr: 'Quiet Minimalist', nameEn: 'Quiet Minimalist' },
  firehearted: { id: 'firehearted', nameTr: 'Firehearted', nameEn: 'Firehearted' },
  'memory-collector': { id: 'memory-collector', nameTr: 'Memory Collector', nameEn: 'Memory Collector' },
  stormbearer: { id: 'stormbearer', nameTr: 'Stormbearer', nameEn: 'Stormbearer' },
  'light-chaser': { id: 'light-chaser', nameTr: 'Light Chaser', nameEn: 'Light Chaser' },
}

export const VIBE_CARD_ORDER: VibeCardId[] = [
  'night-melancholist',
  'synthwave-romantic',
  'twilight-seeker',
  'neon-drifter',
  'analog-collector',
  'quiet-minimalist',
  'firehearted',
  'memory-collector',
  'stormbearer',
  'light-chaser',
]

/**
 * Geçici seçim: eşleştirme kural tablosu yazılana kadar deterministik ama
 * basit bir hash ile kullanıcıya/döneme sabit bir kart atanır (tasarım/demo amaçlı).
 * Backend bağlanınca bu fonksiyon gerçek sinyal tabanlı kural tablosuyla değişecek.
 */
export function pickVibeCardId(seed: string): VibeCardId {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return VIBE_CARD_ORDER[hash % VIBE_CARD_ORDER.length]!
}
