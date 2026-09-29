import type { MoodKey } from './mood'

/**
 * Mood kapakları — gerçek sanat eseri, `/vibe-cards/*.webp` havuzundan.
 *
 * 2026-09-18 katalog yeniden kurgusu (migration 0309): eski 10 mood-key
 * kaldırıldı, onların kullandığı 10 görsel + daha önce hiç kullanılmayan
 * 11 görsel dahil TÜM 21 görsel havuzu yeniden değerlendirildi, 12 yeni
 * mood-key'e en yakın atmosfer eşleştirildi (görseller tek tek incelendi).
 *
 * Vibe Kartı ("dinleyici arketipi", `/taste`) ile Mood kapağı ("an",
 * `/playlists/mood`) AYRI özellikler — burada yalnız görsel havuzu
 * paylaşılıyor, veri modeli paylaşılmıyor.
 *
 *   quiet_side     melankolik/mor-kırmızı        → purple-flower-red-background
 *   full_throttle  sıcak/ateşli/enerjik           → firehearted
 *   locked_in      sade/minimal/dingin            → quiet-minimalist
 *   no_limit       enerjik/kinetik/hareket        → hand-blue-light-streak
 *   closer         synthwave/romantik (isim dahi) → synthwave-romantic
 *   miles_away     ışık kovalayan/hareket         → light-chaser
 *   gece_217       sakin/kozmik/fırtına, dar       → stormbearer
 *   your_day       portal/eşik, yeni bir gün       → floating-moss-flower-island
 *   first_light    alacakaranlık/yumuşak           → twilight-seeker
 *   daylight       pastel/açık/gündüz              → pastel-valley-river-blossoms
 *   dusk           gün batımı/sıcak-soğuk geçiş    → warm-sunset-lake-cactus
 *   nocturne       hızlı/neon/şehir gecesi, geniş  → neon-drifter
 */
export const MOOD_COVER_SLUG: Record<MoodKey, string> = {
  quiet_side: 'purple-flower-red-background',
  full_throttle: 'firehearted',
  locked_in: 'quiet-minimalist',
  no_limit: 'hand-blue-light-streak',
  closer: 'synthwave-romantic',
  miles_away: 'light-chaser',
  gece_217: 'stormbearer',
  your_day: 'floating-moss-flower-island',
  first_light: 'twilight-seeker',
  daylight: 'pastel-valley-river-blossoms',
  dusk: 'warm-sunset-lake-cactus',
  nocturne: 'neon-drifter',
}

/** Web/mobil `<img>` veya `next/image` için genel yol. */
export function moodCoverSrc(moodKey: MoodKey): string {
  return `/vibe-cards/${MOOD_COVER_SLUG[moodKey]}.webp`
}
