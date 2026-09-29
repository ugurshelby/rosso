import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  moodByKey,
  getMoodPackage,
  getMoodPlaylist,
  getMoodWorkspace,
  MOOD_TRACK_LIMIT,
  type MoodKey,
} from '@/lib/analytics/mood'
import { createPlaylistFromTracks } from '@/lib/playlists/generate'
import { uploadMoodCoverToSpotify } from '@/lib/playlists/mood-cover-upload'
import { moodCoverSrc } from '@/lib/analytics/mood-cover-art'
import { checkRateLimit, PAHALI_URETIM_LIMIT, rateLimitRetryAfterSeconds } from '@/lib/security/rate-limit'

/**
 * FAZ MOOD Katman 3: bir mood'u kullanıcının Spotify'ına playlist olarak ekle.
 * Mood şarkı listesi sunucuda üretilir (istemci ID gönderemez — güvenlik),
 * sonra mevcut engine ile Spotify'a yazılır (rate-limit korumalı).
 */

const Schema = z.object({
  moodKey: z.enum([
    'quiet_side', 'full_throttle', 'locked_in', 'no_limit', 'closer', 'miles_away', 'gece_217',
    'your_day', 'first_light', 'daylight', 'dusk', 'nocturne',
  ]),
  platforms: z.array(z.enum(['spotify'])).min(1).default(['spotify']),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  /*
   * 🔴 RATE LIMIT (2026-08-22 güvenlik taraması) — bu uç PAHALI:
   * Spotify'a yeni bir playlist oluşturuyor.
   *
   * Kimlik vardı ama sayı sınırı YOKTU. Kötü niyet gerekmiyor: döngüye
   * giren bir istemci ya da sabırsız çift tıklama dış API kotasını yakar.
   * Rosso bunu yaşadı — Spotify 6,4 saat ceza verdi.
   */
  const limit = checkRateLimit(`mood-create:${user.id}`, PAHALI_URETIM_LIMIT.limit, PAHALI_URETIM_LIMIT.windowMs)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'You tried too often — wait a bit.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitRetryAfterSeconds(limit.resetAt)) } },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 })
  }

  const mood = moodByKey(parsed.data.moodKey)
  if (!mood) return NextResponse.json({ error: 'Bilinmeyen mood' }, { status: 404 })

  /*
   * Mood listesi SUNUCUDA üretilir — istemci track ID'si gönderemez
   * (güvenlik + tutarlılık).
   *
   * 🔴 KAYNAK DEĞİŞTİ (2026-09-20 kalite denetimi): artık ÖNCE `mood_pkg`,
   * yalnız paket yoksa canlı RPC.
   *
   * ESKİSİ: bu uç her zaman `getMoodPlaylist` (canlı `mood_playlist` RPC'si)
   * çağırıyordu. Gerekçe belgede duruyordu — *"Spotify'a bayat liste
   * yazmayalım"*. Ama sonucu şuydu: SAYFA `mood_pkg`'yi (AI kürasyonu)
   * gösteriyor, EXPORT ise başka bir liste (deterministik ham skor sırası)
   * yazıyordu. Kullanıcı ekranda gözden geçirip temizlediği listeyi Spotify'a
   * gönderdiğini sanıyor, oysa hiç görmediği parçalar gidiyordu. AI kürasyonu
   * devreye girdiğinden beri iki listenin ayrışması KURAL, istisna değil.
   *
   * Bayatlık riski bilinçli kabul ediliyor ve sınırı belli: paket günde bir
   * üretiliyor, yani en fazla 24 saatlik. "Kullanıcının gördüğü liste" ile
   * "Spotify'a giden liste" arasındaki farkın maliyeti bundan büyük.
   */
  const paket = await getMoodPackage(user.id, parsed.data.moodKey as MoodKey)
  const tracks =
    paket && paket.length > 0
      ? paket
      : await getMoodPlaylist(user.id, parsed.data.moodKey as MoodKey, MOOD_TRACK_LIMIT)

  /* Kullanıcının ÇIKARDIĞI şarkılar hariç tutulur (migration 0255) —
     Sahip: *"düzenlenmiş final liste Spotify'a gitsin."*
     ⚠ Liste İSTEMCİDEN alınmaz, sunucu `mood_workspace`'ten kendisi okur:
       yukarıdaki "istemci track ID'si gönderemez" kuralının aynısı. */
  const calismaAlani = await getMoodWorkspace(parsed.data.moodKey as MoodKey)
  const gizli = new Set(calismaAlani.hiddenTrackIds)

  const trackUuids = tracks
    .map((t) => t.trackId)
    .filter((x): x is string => Boolean(x) && !gizli.has(x as string))
  if (trackUuids.length === 0) {
    return NextResponse.json({ error: 'No tracks found for this moment' }, { status: 404 })
  }

  try {
    // Ad: sadece mood adı ("Gecenin Üçü") — "Rosso ·" öneki YOK (Sahip 2026-07-27).
    // Açıklama: mood tagline'ı (null yerine anlamlı kısa açıklama — Sahip 2026-07-27).
    const name = mood.title
    // `skipAutoCover: true` — mood'un zaten kendi markalı vibe-kartı var,
    // genel kolaj kapağı burada gereksiz (yükleyip hemen ardından mood
    // kapağıyla ezilirdi).
    const result = await createPlaylistFromTracks(
      user.id, trackUuids, name, parsed.data.platforms, mood.tagline, true,
    )

    // Ürettiğimiz mood kapağını Spotify playlist'ine de yükle (Sahip
    // 2026-07-26: "yaptığın kapak Spotify'a da gelse süper olur"). İKİNCİL —
    // başarısız olsa playlist yine oluştu, hata yutulur (uploadMoodCover... içinde).
    const spotifyOutcome = result.outcomes.find(
      (o) => o.platform === 'spotify' && o.playlistId && o.status !== 'failed',
    )
    if (spotifyOutcome?.playlistId) {
      const kapakSonuc = await uploadMoodCoverToSpotify(user.id, spotifyOutcome.playlistId, parsed.data.moodKey as MoodKey)
      // Rosso'nun kendi detay sayfası da AYNI kapağı göstersin — Spotify'a
      // gidip ayrı bir görsel senkronu beklemeden (bu statik bir public asset,
      // ekstra Storage yüklemesi gerekmiyor).
      if (kapakSonuc.ok && spotifyOutcome.playlistDbId) {
        await supabase
          .from('playlists')
          .update({ cover_url: moodCoverSrc(parsed.data.moodKey as MoodKey) })
          .eq('id', spotifyOutcome.playlistDbId)
      }
    }

    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Playlist couldn’t be created'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
