/**
 * Mood atmosfer renkleri — web + mobil ortak kaynak.
 * Mobil kopyası: `mobile/src/lib/mood-tints.ts` (bağımsız dizin; senkron elle korunur).
 * Otorite: docs/design/rosso-kimligi/renk-token-mimari.md §6
 *
 * 2026-09-18 katalog yeniden kurgusu (migration 0309): 12 yeni mood-key.
 */
export type MoodTintKey =
  | 'quiet_side'
  | 'full_throttle'
  | 'locked_in'
  | 'no_limit'
  | 'closer'
  | 'miles_away'
  | 'gece_217'
  | 'your_day'
  | 'first_light'
  | 'daylight'
  | 'dusk'
  | 'nocturne'

/** Triadik dağılımlı sabit tint'ler — kapağın baskın tonuyla uyumlu.
 * Komşu mood'lar bilerek ayrışan tonlarda: `quiet_side` (soğuk mavi-gri,
 * mesafeli) ile `gece_217`/`nocturne` (ikisi de "gece" ama biri dar-mor,
 * diğeri geniş-lacivert) karışmasın diye. */
export const MOOD_TINTS = {
  quiet_side: '#6b7280',
  full_throttle: '#ff5a3c',
  locked_in: '#7fd3c4',
  no_limit: '#e0475a',
  closer: '#ff6f9c',
  miles_away: '#ffb877',
  gece_217: '#5b7ea6',
  your_day: '#a78bfa',
  first_light: '#ffd27f',
  daylight: '#4ade80',
  dusk: '#ff8a5b',
  nocturne: '#4a5b8c',
} as const satisfies Record<MoodTintKey, string>
