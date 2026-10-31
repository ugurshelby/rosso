/**
 * 12 mood tanımı (web `lib/analytics/mood.ts` ROSSO_PICKS + DAILY_PICKS ve
 * `mood-cover-art.ts` MOOD_COVER_SLUG ile birebir). Kapaklar kurulumun kendi
 * web sitesinden gelir: `${webUrl}/vibe-cards/<slug>.webp`.
 */
export type MoodGrubu = 'rosso' | 'gunluk'

export interface MoodTanimi {
  anahtar: string
  baslik: string
  aciklama: string
  kapak: string
  grup: MoodGrubu
}

export const MOODLAR: MoodTanimi[] = [
  { anahtar: 'quiet_side', baslik: 'The Quiet Side', aciklama: 'The songs your hands go to when something in you tightens.', kapak: 'purple-flower-red-background', grup: 'rosso' },
  { anahtar: 'full_throttle', baslik: 'Full Throttle', aciklama: 'High voltage, no brakes — the sound of adrenaline.', kapak: 'firehearted', grup: 'rosso' },
  { anahtar: 'locked_in', baslik: 'Locked In', aciklama: 'No lyrics, nothing to pull you away; just you and the work.', kapak: 'quiet-minimalist', grup: 'rosso' },
  { anahtar: 'no_limit', baslik: 'No Limit', aciklama: 'The songs that carry you through one more rep.', kapak: 'hand-blue-light-streak', grup: 'rosso' },
  { anahtar: 'closer', baslik: 'Closer', aciklama: 'Warm, intimate, and made for the space between two people.', kapak: 'synthwave-romantic', grup: 'rosso' },
  { anahtar: 'miles_away', baslik: 'Miles Away', aciklama: 'For the window seat and the road that keeps unfolding.', kapak: 'light-chaser', grup: 'rosso' },
  { anahtar: 'gece_217', baslik: '2:17 AM', aciklama: 'The sound of the hours when sleep will not come and the world has gone quiet.', kapak: 'stormbearer', grup: 'rosso' },
  { anahtar: 'your_day', baslik: 'Your Day', aciklama: 'If Rosso curated a playlist for today, this is what it would put in.', kapak: 'floating-moss-flower-island', grup: 'gunluk' },
  { anahtar: 'first_light', baslik: 'First Light', aciklama: 'Beside the first coffee, a soft way into the day.', kapak: 'twilight-seeker', grup: 'gunluk' },
  { anahtar: 'daylight', baslik: 'Daylight', aciklama: 'For the active hours, when the day is moving with you.', kapak: 'pastel-valley-river-blossoms', grup: 'gunluk' },
  { anahtar: 'dusk', baslik: 'Dusk', aciklama: 'The hour when the day starts letting go.', kapak: 'warm-sunset-lake-cactus', grup: 'gunluk' },
  { anahtar: 'nocturne', baslik: 'Nocturne', aciklama: 'The wider sound of your nights.', kapak: 'neon-drifter', grup: 'gunluk' },
]

export const moodBul = (anahtar: string) => MOODLAR.find((m) => m.anahtar === anahtar)

export const moodKapakUri = (webUrl: string, m: MoodTanimi) => (webUrl ? `${webUrl}/vibe-cards/${m.kapak}.webp` : null)

export interface MoodSarkisi {
  trackId: string
  ad: string
  sanatci: string
  kapak: string | null
  spotifyId: string | null
  sayi: number
}

/** `mood_pkg.payload` (web 0169/0271 anahtarları) → gizlenenler çıkarılmış şarkılar. */
export function moodSarkilari(payload: unknown, gizli: readonly string[] = []): MoodSarkisi[] {
  if (!Array.isArray(payload)) return []
  const gizlenen = new Set(gizli)
  const sonuc: MoodSarkisi[] = []
  for (const s of payload) {
    if (!s || typeof s !== 'object') continue
    const o = s as Record<string, unknown>
    const trackId = typeof o.track_id === 'string' ? o.track_id : null
    if (!trackId || gizlenen.has(trackId)) continue
    sonuc.push({
      trackId,
      ad: typeof o.title === 'string' ? o.title : '',
      sanatci: typeof o.artist_name === 'string' ? o.artist_name : '',
      kapak: typeof o.image_url === 'string' ? o.image_url : null,
      spotifyId: typeof o.spotify_id === 'string' ? o.spotify_id : null,
      sayi: typeof o.play_count === 'number' ? o.play_count : Number(o.play_count) || 0,
    })
  }
  return sonuc
}

/** Spotify'da aç: uygulama yüklüyse Android uygulama bağlantısı onu açar. */
export const spotifySarkiUrl = (id: string) => `https://open.spotify.com/track/${id}`
export const spotifyListeUrl = (id: string) => `https://open.spotify.com/playlist/${id}`
