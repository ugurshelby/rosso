import { permanentRedirect } from 'next/navigation'

/**
 * `/mood` → `/playlists/mood` (308 kalıcı yönlendirme).
 *
 * Sahip kararı (2026-08-07): *"/mood sayfası ek bir sayfa olmamalı,
 * playlist sayfasında olmalı — tıpkı automations ve playlist oluştur gibi."*
 * Artık Playlists hero'sundaki **Mood** kartından giriliyor; sidebar'daki
 * "Anlar" maddesi kalktı.
 */
export default function MoodRedirect() {
  permanentRedirect('/playlists/mood')
}
