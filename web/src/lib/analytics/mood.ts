import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { MOOD_TINTS } from '@/lib/mood-tints'
import { gecerliMoodEtiketi, type MoodEtiketi } from '@/lib/analytics/mood-etiket'

/**
 * FAZ MOOD (Sahip 2026-07-26): his/an bazlı öneri playlist'leri.
 * mood_playlist RPC'sine (migration 0137) bağlanır. İçerik kişisel.
 *
 * 2026-09-18 — Katalog yeniden kurgusu (migration 0309): eski 10 mood-key
 * TAMAMEN kaldırıldı, yerine 12 yeni key geldi — "Rosso's Picks" (7 sabit
 * tema) ve "Daily Picks" (5, günün periyoduna göre). Ayrıca "Your Years"
 * eklendi (bkz. `year-pkg.ts`) — bu union'a GİRMEZ, çünkü workspace/export
 * akışına hiç dahil değil, ayrı bir statik arşiv sistemi.
 */

export type MoodKey =
  // Rosso's Picks — 7 sabit tema
  | 'quiet_side'
  | 'full_throttle'
  | 'locked_in'
  | 'no_limit'
  | 'closer'
  | 'miles_away'
  | 'gece_217'
  // Daily Picks — 5, günde bir cron ile içeriği güncellenir
  | 'your_day'
  | 'first_light'
  | 'daylight'
  | 'dusk'
  | 'nocturne'

/**
 * Mood playlist uzunluğu — **ürün kararı** (Sahip, 2026-07-30):
 * *"Rosso'nun kullanıcıya hazırladığı bu playlist'lerin her birinin 50 adet
 * olmasını istiyorum."*
 *
 * Tazelik sınıfı **D · Sabit** (belge §Çerçeve): hiç değişmez, kodda durur.
 *
 * Öncesinde iki farklı değer vardı — liste sayfası 30, detay 40 — yani aynı
 * mood iki yerde iki farklı uzunlukta görünüyordu. Tek sabit bunu bitirir.
 *
 * ⚠ Bu bir ÜST SINIR: `mood_playlist` yeterli veri yoksa daha az döndürür.
 * Ölçüm (2026-07-30, gerçek kullanıcılar): çoğu mood 50, ama biri 32 ve 47;
 * dinlemesi az kullanıcılarda 0–1. Bu yüzden arayüzde "50 şarkı" diye SABİT
 * yazılmaz — gösterilen sayı her zaman gerçek sonuçtan gelir.
 */
export const MOOD_TRACK_LIMIT = 50

/**
 * Listenin altına düşülmemesi gereken en az parça sayısı.
 *
 * 🔴 NEDEN VAR (2026-09-20 kalite denetimi): `MOOD_TRACK_LIMIT` bir ÜST SINIR
 * olarak belgelenmişti ama pratikte bir ALT SINIR gibi davranıyordu —
 * `validateAiSelection` modelin seçimini her koşulda 50'ye TAMAMLIYORDU.
 * Yani model "burada yalnız 30 parça uyuyor" dese bile geri kalan 20 havuzun
 * dibinden ekleniyordu. Ölçülen 7 mood'daki %55 çıkarma oranının bir kısmı
 * doğrudan bunun sonucu.
 *
 * Artık tamamlama YALNIZ buraya kadar yapılıyor: ekranda neredeyse boş bir
 * sayfa çıkmasın diye bir zemin var, ama 50'yi doldurma zorunluluğu YOK.
 * 25 seçildi çünkü ~1,5 saatlik dinleme; kullanıcının "liste hazırlanmamış"
 * hissetmeyeceği en kısa uzunluk.
 */
export const MOOD_MIN_TRACKS = 25

export interface MoodDef {
  key: MoodKey
  emoji: string
  title: string
  /** Kişisel dokunuş — "dinleyen insanı anlatır". */
  tagline: string
  /** Mood atmosfer rengi — SVG kapağın baskın tonuyla uyumlu, hero'yu yıkar. */
  tint: string
}

/**
 * Rosso's Picks — 7 sabit tema, her kullanıcıda var, içerik kişiye özel.
 * 2026-09-18 katalog yeniden kurgusu (migration 0309).
 */
export const ROSSO_PICKS: MoodDef[] = [
  { key: 'quiet_side', emoji: '🌧️', title: 'The Quiet Side', tagline: 'The songs your hands go to when something in you tightens.', tint: MOOD_TINTS.quiet_side },
  { key: 'full_throttle', emoji: '⚡', title: 'Full Throttle', tagline: 'High voltage, no brakes — the sound of adrenaline.', tint: MOOD_TINTS.full_throttle },
  { key: 'locked_in', emoji: '🎯', title: 'Locked In', tagline: 'No lyrics, nothing to pull you away; just you and the work.', tint: MOOD_TINTS.locked_in },
  { key: 'no_limit', emoji: '🔥', title: 'No Limit', tagline: 'The songs that carry you through one more rep.', tint: MOOD_TINTS.no_limit },
  { key: 'closer', emoji: '🌹', title: 'Closer', tagline: 'Warm, intimate, and made for the space between two people.', tint: MOOD_TINTS.closer },
  { key: 'miles_away', emoji: '🧭', title: 'Miles Away', tagline: 'For the window seat and the road that keeps unfolding.', tint: MOOD_TINTS.miles_away },
  { key: 'gece_217', emoji: '🌙', title: '2:17 AM', tagline: 'The sound of the hours when sleep will not come and the world has gone quiet.', tint: MOOD_TINTS.gece_217 },
]

/**
 * Daily Picks — 5, günün periyoduna göre; günde bir cron ile içeriği yenilenir
 * (kimlik/ID sabit kalır, yalnız şarkı içeriği değişir).
 */
export const DAILY_PICKS: MoodDef[] = [
  { key: 'your_day', emoji: '☀️', title: 'Your Day', tagline: 'If Rosso curated a playlist for today, this is what it would put in.', tint: MOOD_TINTS.your_day },
  { key: 'first_light', emoji: '🌅', title: 'First Light', tagline: 'Beside the first coffee, a soft way into the day.', tint: MOOD_TINTS.first_light },
  { key: 'daylight', emoji: '🥊', title: 'Daylight', tagline: 'For the active hours, when the day is moving with you.', tint: MOOD_TINTS.daylight },
  { key: 'dusk', emoji: '🌆', title: 'Dusk', tagline: 'The hour when the day starts letting go.', tint: MOOD_TINTS.dusk },
  { key: 'nocturne', emoji: '🌌', title: 'Nocturne', tagline: 'The wider sound of your nights.', tint: MOOD_TINTS.nocturne },
]

/** Geriye dönük uyum: katalog sayfası dışındaki çağıranlar için birleşik liste. */
export const MOODS: MoodDef[] = [...ROSSO_PICKS, ...DAILY_PICKS]

export function moodByKey(key: string): MoodDef | undefined {
  return MOODS.find((m) => m.key === key)
}

export interface MoodTrack {
  trackId: string | null
  title: string
  artistName: string | null
  album: string | null
  imageUrl: string | null
  moodPlayCount: number
  /** Spotify DELETE için gerekli (migration 0271 payload'a ekledi). */
  spotifyId: string | null
}

/**
 * Mood listesi — PAKETTEN (`mood_pkg`, migration 0169+0171).
 *
 * ÖNCESİ: `mood_playlist` RPC'si ~280–350 ms (kimlikli ölçüm, 2026-08-01;
 * ilk koşum 3061 ms görünüyordu ama o soğuk başlangıçtı).
 * SONRASI: tek `select` → **0,071 ms** · buffer 2 · `Index Scan`.
 *
 * `null` dönerse paket henüz üretilmemiş → çağıran *"hazırlanıyor"* göstermeli,
 * **canlı hesaba düşmemeli** (§12.4-A bağlayıcı kuralı).
 *
 * ⚠ Yalnız SAYFA bunu kullanır. `/api/mood/create-playlist` bilinçli olarak
 * `getMoodPlaylist` (RPC) yolunda kalır — bkz. o fonksiyonun notu.
 */
export async function getMoodPackage(
  userId: string,
  moodKey: MoodKey,
): Promise<MoodTrack[] | null> {
  try {
    const supabase = await createClient()
    // NOT: tablo migration 0169 ile eklendi; üretilmiş tip dosyası henüz
    // tanımıyor — diğer paket okumalarıyla aynı desen.
    const { data, error } = await (
      supabase.from as unknown as (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: unknown) => {
            eq: (c: string, v: unknown) => {
              maybeSingle: () => Promise<{
                data: {
                  payload: Array<{
                    track_id: string | null
                    title: string | null
                    artist_name: string | null
                    album: string | null
                    image_url: string | null
                    play_count: number | string
                    spotify_id?: string | null
                  }>
                } | null
                error: unknown
              }>
            }
          }
        }
      }
    )('mood_pkg')
      .select('payload')
      .eq('user_id', userId)
      .eq('mood_key', moodKey)
      .maybeSingle()

    if (error) throw error
    if (!data) return null // paket YOK → "hazırlanıyor"

    // Eşleme RPC yoluyla BİREBİR aynı — ayrışırsa aynı kullanıcı sayfada ve
    // Spotify'a yazılan listede farklı veri görür.
    return (data.payload ?? []).map((r) => ({
      trackId: r.track_id ?? null,
      title: r.title ?? '',
      artistName: r.artist_name ?? null,
      album: r.album ?? null,
      imageUrl: r.image_url ?? null,
      moodPlayCount: Number(r.play_count),
      spotifyId: r.spotify_id ?? null,
    }))
  } catch (err) {
    console.error('[mood] getMoodPackage başarısız — paket yok sayıldı:', err)
    return null
  }
}

/**
 * ⚠ 2026-08-01 (paket #6): `/playlists/mood/[key]` SAYFASI artık bunu ÇAĞIRMIYOR —
 * `getMoodPackage` kullanıyor.
 *
 * Bu fonksiyon **paket üreticisinin dayandığı RPC'yi** sarmalıyor ve
 * `/api/mood/create-playlist` için DURUYOR. O uç kullanıcının Spotify
 * hesabına gerçek playlist yazıyor; pakete bağlansaydı kullanıcı "gece yarısı
 * üretilmiş" listeyi Spotify'a yazardı — dış dünyaya taşan, geri alınamaz bir
 * bayatlık. Sayfada bayat liste kabul edilebilir, Spotify'a bayat yazmak değil.
 *
 * Silmeden önce `grep` ile tüm çağıranlar aranmalı (§12.3).
 */
export async function getMoodPlaylist(
  userId: string,
  moodKey: MoodKey,
  limit: number = MOOD_TRACK_LIMIT,
): Promise<MoodTrack[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('mood_playlist', {
      p_user_id: userId,
      p_mood_key: moodKey,
      p_limit: limit,
    })
    if (error || !data) return []
    return (data as Array<{
      track_id: string | null
      title: string | null
      artist_name: string | null
      album: string | null
      image_url: string | null
      play_count: number
      spotify_id?: string | null
    }>).map((r) => ({
      trackId: r.track_id ?? null,
      title: r.title ?? '',
      artistName: r.artist_name ?? null,
      album: r.album ?? null,
      imageUrl: r.image_url ?? null,
      moodPlayCount: Number(r.play_count),
      spotifyId: r.spotify_id ?? null,
    }))
  } catch (err) {
    console.error('[mood] getMoodPlaylist başarısız:', err)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ÇALIŞMA ALANI (migration 0255) — kullanıcının mood listesi üzerindeki niyeti
//
// ⚠ `mood_pkg` CRON'un ürettiği paket; her tazelemede `payload` yeniden
//   yazılır. Kullanıcı düzenlemesi oraya yazılsaydı bir sonraki turda
//   sessizce silinirdi. Bu yüzden ayrı tablo: `mood_workspace`.
// ═══════════════════════════════════════════════════════════════════════════

export interface MoodWorkspace {
  /** Kullanıcının listeden çıkardığı şarkılar. */
  hiddenTrackIds: string[]
  /**
   * Kullanıcının bir temizlik turunda listede BIRAKTIĞI şarkılar
   * (migration 0326). `hiddenTrackIds`'in pozitif ikizi: skorda ödüllendirilir
   * ve AI prompt'una pozitif örnek olarak gider.
   */
  approvedTrackIds: string[]
  /** Spotify'a en son aktarım zamanı — `null` ise hiç aktarılmadı. */
  exportedAt: string | null
  /** Aktarılan Spotify playlist kimliği ("Spotify'da aç" için). */
  exportedPlaylistId: string | null
  /**
   * Haftalık senkron açık mı (migration 0270). `true` ise `mood_pkg_runner`
   * bu playlist'i haftada bir yeni pakete göre Spotify'da GÜNCELLER
   * (`replaceTracksOnSpotify`). Yalnız `exportedPlaylistId` doluysa anlamlı —
   * hiç aktarılmamış bir mood'da senkron edecek playlist yok.
   */
  weeklySyncEnabled: boolean
}

const BOS_CALISMA_ALANI: MoodWorkspace = {
  hiddenTrackIds: [],
  approvedTrackIds: [],
  exportedAt: null,
  exportedPlaylistId: null,
  weeklySyncEnabled: false,
}

/**
 * Mood çalışma alanını okur. Kayıt yoksa boş varsayılan döner — çağıran
 * taraf ayrıca "var mı" kontrolü yapmasın diye RPC `LEFT JOIN` kullanıyor.
 *
 * ⚠ Hata yutuluyor ve boş dönüyor: çalışma alanı **ikincil** veridir.
 *   Okunamazsa mood listesi yine de gösterilmeli — kullanıcı şarkılarını
 *   göremez hâle gelmemeli. (Kaybolan tek şey: gizleme ve export damgası.)
 */
export async function getMoodWorkspace(moodKey: MoodKey): Promise<MoodWorkspace> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_mood_workspace', {
      p_mood_key: moodKey,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return BOS_CALISMA_ALANI
    return {
      hiddenTrackIds: row.hidden_track_ids ?? [],
      approvedTrackIds: row.approved_track_ids ?? [],
      exportedAt: row.exported_at ?? null,
      exportedPlaylistId: row.exported_playlist_id ?? null,
      weeklySyncEnabled: row.weekly_sync_enabled ?? false,
    }
  } catch (err) {
    console.error('[mood] getMoodWorkspace başarısız:', err)
    return BOS_CALISMA_ALANI
  }
}

/**
 * Kullanıcının bu mood'daki uygunluk etiketleri (migration 0338) —
 * `trackId → etiket`. RLS yalnız kendi satırlarını döndürür. Okunamazsa boş
 * döner: etiketler bir iyileştirmedir, sayfa onlarsız da eksiksiz çalışır.
 */
export async function getMoodEtiketleri(moodKey: MoodKey): Promise<Record<string, MoodEtiketi>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('mood_track_feedback')
      .select('track_id, etiket')
      .eq('mood_key', moodKey)
    if (error) throw error
    const sonuc: Record<string, MoodEtiketi> = {}
    for (const satir of (data ?? []) as Array<{ track_id: string; etiket: string }>) {
      if (gecerliMoodEtiketi(satir.etiket)) sonuc[satir.track_id] = satir.etiket
    }
    return sonuc
  } catch (err) {
    console.error('[mood] getMoodEtiketleri başarısız:', err)
    return {}
  }
}

/**
 * Haftalık senkron tercihini açar/kapatır (migration 0270, `set_mood_weekly_sync`).
 * Yalnız Spotify'a en az bir kez aktarılmış (`exportedPlaylistId` dolu) bir
 * mood'ta anlamlıdır — çağıran taraf bunu UI'da zaten kısıtlar.
 */
export async function setMoodWeeklySync(moodKey: MoodKey, enabled: boolean): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('set_mood_weekly_sync', {
      p_mood_key: moodKey,
      p_enabled: enabled,
    })
    if (error) throw error
    return true
  } catch (err) {
    console.error('[mood] setMoodWeeklySync başarısız:', err)
    return false
  }
}
