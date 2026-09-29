import { hataMetni } from '@/lib/utils/hata-metni'
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { moodByKey, type MoodKey } from '@/lib/analytics/mood'
import { systemLog } from '@/lib/observability/logger'
import type { AiCandidateTrack, MoodCurationRequest, MoodOrnek, MoodTanimi } from './gemini-client'

/**
 * AI kürasyonu için context hazırlar.
 *
 * Sahibin kuralı (2026-09-18, §7): *"Her AI çağrısında bütün kullanıcı
 * datasını göndermek yerine yalnızca gerekli context gönderilmeli."*
 *
 * 🔴 2026-09-20 DENETİMİ — burada ÜÇ ölçülmüş boşluk kapatıldı:
 *
 *  1. `catalog_enrichment_for_tracks` ZATEN `moods` döndürüyordu; bu dosya onu
 *     okuyup ATIYORDU. Modele yalnız `primary_genre` + `energy_character`
 *     gidiyordu. Yani "bu parça hangi türden" sorusunun cevabı gidiyor,
 *     "hangi hissi veriyor" sorusunun cevabı elimizde durup gitmiyordu — Mood
 *     sisteminin tam da yanlış yaptığı soru. Artık mood/vibe/tempo/güven de
 *     gidiyor.
 *
 *  2. `playlistDefinition` tek satırdı: `"Dusk" — The hour when the day starts
 *     letting go.` Modelden "Dusk" ile "Nocturne"ü ayırt etmesini isteyip
 *     farkı ona hiç söylememiştik. Artık `mood_definitions` (migration 0325)
 *     tablosundan kimlik / olmalı / OLMAMALI / enerji bandı / pozitif-negatif
 *     eksenler geliyor.
 *
 *  3. Kullanıcının çıkardığı parçalar yalnız SAYI olarak gidiyordu
 *     ("removed 41 track(s)"). Şimdi hem çıkarılanlar NEGATİF ÖRNEK hem
 *     kullanıcının bıraktıkları POZİTİF ÖRNEK olarak gidiyor (migration 0326).
 *
 * ⚠ Cron bağlamında (service_role) çalışır; `taste-profile.ts`'teki
 * fonksiyonlar kullanıcı oturumuna (`auth.uid()`) dayandığı için burada
 * KULLANILMAZ — tablolar service client ile doğrudan okunur.
 */

/**
 * Aday havuzu boyutu.
 *
 * 🔴 ÖLÇÜLDÜ (2026-09-20): darboğaz aday SAYISI değil, havuzun KALİTESİYDİ.
 * Bazı mood'larda havuz hedefin (50) ALTINA düşüyordu — `gece_217` yalnız 33
 * aday döndürüyordu (sebep: 0272'nin sanatçı blacklist'i; migration 0325'te
 * kaldırıldı, havuz 304'e çıktı).
 *
 * 260 denendi ve GERİ ALINDI: aday satırları mood/vibe/tempo alanlarıyla
 * genişleyince girdi 5.845 → 15.161 token'a, gecikme 2,5 → 5,0 sn'ye çıktı
 * (canlı ölçüm, `ai_generation_logs`). 12 mood'un yalnız 6'sı AI penceresine
 * sığdı, kalanı SQL'e düştü — yani "daha çok aday" kararı, kürasyonun
 * YARISINI kaybettirdi. Aday sayısı 200'e döndü ve satır başına alan sayısı
 * kırpıldı (bkz. `buildMoodAiContext` içindeki `m` tavanı).
 */
export const ADAY_HAVUZU_BOYUTU = 200

/** Prompt'a yazılacak en fazla örnek sayısı (pozitif ve negatif, ayrı ayrı). */
const MAKS_ORNEK = 12

interface MoodPlaylistRow {
  track_id: string | null
  title: string | null
  artist_name: string | null
  play_count: number | string | null
}

export interface MoodAiContextInput {
  supabase: SupabaseClient
  userId: string
  moodKey: MoodKey
  candidates: MoodPlaylistRow[]
  hiddenTrackIds: string[]
  approvedTrackIds: string[]
  previousTrackIds: string[]
  targetCount: number
}

/** `user_taste_profile` + `user_genre_vectors`'ten kısa bir zevk özeti. */
async function buildTasteSummary(supabase: SupabaseClient, userId: string): Promise<string> {
  const parcalar: string[] = []
  try {
    /*
     * ⚠ 2026-09-19'da DÜZELTİLDİ: buradaki select `dominant_genre` da
     * istiyordu — ama o kolon `user_taste_profile`'da YOK, `user_genre_vectors`
     * tablosunda. PostgREST bilinmeyen kolon için satır değil HATA döndürür;
     * kod yalnız `data`ya baktığı ve `error`ı yok saydığı için blok sessizce
     * boş geçiyordu. Artık `error` açıkça kontrol ediliyor.
     */
    const { data: profil, error } = await supabase
      .from('user_taste_profile')
      .select('identity_words, is_night_owl, peak_hour, entropy, exploration_rate')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)

    if (profil) {
      const p = profil as {
        identity_words?: string[] | null
        is_night_owl?: boolean | null
        peak_hour?: number | null
        entropy?: number | null
        exploration_rate?: number | null
      }
      if (p.identity_words?.length) parcalar.push(`Listener identity: ${p.identity_words.slice(0, 5).join(', ')}`)
      if (p.peak_hour != null) parcalar.push(`Peak listening hour: ${p.peak_hour}:00`)
      if (p.is_night_owl) parcalar.push('Night owl listener')
      if (p.entropy != null) {
        parcalar.push(
          Number(p.entropy) >= 3 ? 'Taste is broad and scattered' : 'Taste is focused on a few genres',
        )
      }
      if (p.exploration_rate != null && Number(p.exploration_rate) >= 0.5) {
        parcalar.push('Open to unfamiliar tracks')
      }
    }
  } catch (err) {
    // Taste profili ikincil — yoksa AI diğer sinyallerle çalışır. Ama artık
    // SESSİZ değil: şema kayması bir daha fark edilmeden geçmesin.
    void systemLog({
      operation: 'mood_ai_context',
      userId,
      severity: 'warn',
      errorMessage: `taste profili okunamadi: ${hataMetni(err)}`,
    })
  }

  try {
    const { data: vektor, error } = await supabase
      .from('user_genre_vectors')
      .select('vector, dominant_genre')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)

    const v = vektor as { vector?: Record<string, number> | null; dominant_genre?: string | null } | null
    if (v?.dominant_genre) parcalar.push(`Dominant genre: ${v.dominant_genre}`)
    if (v?.vector) {
      const top = Object.entries(v.vector)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([g]) => g)
      if (top.length) parcalar.push(`Top genres: ${top.join(', ')}`)
    }
  } catch (err) {
    void systemLog({
      operation: 'mood_ai_context',
      userId,
      severity: 'warn',
      errorMessage: `tur vektoru okunamadi: ${hataMetni(err)}`,
    })
  }

  /*
   * Katman B davranış metrikleri (§4.1, migration 0315). Tamamen deterministik
   * ve AI'dan bağımsız üretilir — burada yalnız OKUNUYOR. Eşik altında
   * kalan metrikler NULL gelir ve prompt'a HİÇ yazılmaz: modele "bilmiyorum"u
   * sayı gibi sunmak, onu uydurmaya davet etmek olurdu.
   */
  try {
    const { data: zeka, error } = await supabase
      .from('user_music_intelligence')
      .select('night_ratio, repeat_intensity, skip_rate, album_orientation, sonic_affinities, musical_paradox')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)

    const z = zeka as {
      night_ratio?: number | null
      repeat_intensity?: number | null
      skip_rate?: number | null
      album_orientation?: number | null
      sonic_affinities?: string[] | null
      musical_paradox?: string | null
    } | null

    if (z) {
      if (z.night_ratio != null && z.night_ratio >= 0.25) {
        parcalar.push(`${Math.round(z.night_ratio * 100)}% of listening happens late at night (23:00-05:00)`)
      }
      if (z.repeat_intensity != null && z.repeat_intensity >= 0.4) {
        parcalar.push('Tends to replay the same tracks obsessively rather than seeking novelty')
      }
      if (z.skip_rate != null && z.skip_rate >= 0.35) {
        parcalar.push('Skips often — impatient listener, front-load the strongest tracks')
      }
      if (z.album_orientation != null && z.album_orientation >= 0.3) {
        parcalar.push('Listens to albums end to end rather than single tracks')
      }
      if (z.sonic_affinities?.length) {
        parcalar.push(`Sonic affinities: ${z.sonic_affinities.slice(0, 6).join(', ')}`)
      }
      if (z.musical_paradox) parcalar.push(`Musical paradox: ${z.musical_paradox.slice(0, 300)}`)
    }
  } catch (err) {
    void systemLog({
      operation: 'mood_ai_context',
      userId,
      severity: 'warn',
      errorMessage: `muzik zekasi okunamadi: ${hataMetni(err)}`,
    })
  }

  return parcalar.length ? parcalar.join('. ') : 'No taste profile computed yet.'
}

/** Son 30 günün en çok dinlenen sanatçıları — kısa metin. */
async function buildRecentListening(supabase: SupabaseClient, userId: string): Promise<string> {
  try {
    const otuzGunOnce = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('play_events')
      .select('track_id, tracks(artists)')
      .eq('user_id', userId)
      .gte('played_at', otuzGunOnce)
      .limit(500)

    const sayac = new Map<string, number>()
    for (const satir of (data ?? []) as Array<{ tracks?: { artists?: string[] } | null }>) {
      const sanatci = satir.tracks?.artists?.[0]
      if (sanatci) sayac.set(sanatci, (sayac.get(sanatci) ?? 0) + 1)
    }
    const top = [...sayac.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([a]) => a)

    return top.length ? `Most played artists in the last 30 days: ${top.join(', ')}` : 'No recent listening data.'
  } catch {
    return 'No recent listening data.'
  }
}

/**
 * Sanatçı ceza notu — `hidden_track_ids`'ten türetilir (SQL'deki
 * `mood_artist_penalty_carpan` ile AYNI kaynak, migration 0311).
 * AI'ın yumuşak önceliklendirme yapması için; hard rule DEĞİL —
 * Sahibin §14 kuralı: "Artist kötü ≠ artistin bütün şarkıları kötü."
 */
async function buildArtistPenaltyNote(
  supabase: SupabaseClient,
  hiddenTrackIds: string[],
): Promise<string> {
  if (hiddenTrackIds.length === 0) return ''
  try {
    const { data } = await supabase
      .from('tracks')
      .select('artists')
      .in('id', hiddenTrackIds.slice(0, 200))

    const sayac = new Map<string, number>()
    for (const satir of (data ?? []) as Array<{ artists?: string[] | null }>) {
      const sanatci = satir.artists?.[0]
      if (sanatci) sayac.set(sanatci, (sayac.get(sanatci) ?? 0) + 1)
    }
    const cezali = [...sayac.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([a, n]) => `${a} (${n} removed)`)

    return cezali.length
      ? `Artists the user has removed MORE THAN ONE track from (lower their priority, but never exclude them outright — a different track by the same artist can still be exactly right): ${cezali.join(', ')}.`
      : ''
  } catch {
    return ''
  }
}

/**
 * `başlık — sanatçı` biçiminde örnek listesi. Prompt'a POZİTİF ve NEGATİF
 * örnek olarak girer; Sahibin elle yaptığı temizlik burada modele
 * doğrudan gösterilen kanıta dönüşür (§8, §12).
 */
async function buildOrnekler(
  supabase: SupabaseClient,
  trackIds: string[],
): Promise<MoodOrnek[]> {
  if (trackIds.length === 0) return []
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('title, artists')
      .in('id', trackIds.slice(0, MAKS_ORNEK))
    if (error) throw new Error(error.message)
    return ((data ?? []) as Array<{ title?: string | null; artists?: string[] | null }>)
      .map((t) => ({
        t: (t.title ?? '').slice(0, 90),
        a: (t.artists?.[0] ?? '').slice(0, 60),
      }))
      .filter((o) => o.t.length > 0)
  } catch {
    return []
  }
}

/** `mood_definitions` (migration 0325) satırını okur. */
async function buildMoodTanimi(
  supabase: SupabaseClient,
  moodKey: MoodKey,
): Promise<MoodTanimi | null> {
  try {
    const { data, error } = await supabase.rpc('mood_definition_for_key', { p_mood_key: moodKey })
    if (error) throw new Error(error.message)
    const row = (Array.isArray(data) ? data[0] : null) as {
      energy_allow?: string[] | null
      energy_ideal?: string[] | null
      pozitif_tags?: string[] | null
      negatif_tags?: string[] | null
      enstrumantal?: string | null
      kimlik?: string | null
      olmali?: string | null
      olmamali?: string | null
      pozitif_genres?: string[] | null
      negatif_genres?: string[] | null
    } | null
    if (!row?.kimlik) return null
    return {
      kimlik: row.kimlik,
      olmali: row.olmali ?? '',
      olmamali: row.olmamali ?? '',
      energyAllow: row.energy_allow ?? [],
      energyIdeal: row.energy_ideal ?? [],
      pozitif: row.pozitif_tags ?? [],
      negatif: row.negatif_tags ?? [],
      enstrumantal: (row.enstrumantal as MoodTanimi['enstrumantal']) ?? 'none',
      pozitifGenres: row.pozitif_genres ?? [],
      negatifGenres: row.negatif_genres ?? [],
    }
  } catch (err) {
    // Tanım okunamazsa prompt eski (zayıf) tek satırlık tanımla çalışır —
    // kürasyon durmaz, yalnız kalitesi düşer. Ama SESSİZ kalmaz.
    void systemLog({
      operation: 'mood_ai_context',
      severity: 'warn',
      errorMessage: `mood tanimi okunamadi (${moodKey}): ${hataMetni(err)}`,
    })
    return null
  }
}

/** AI context'ini kurar. */
export async function buildMoodAiContext(
  input: MoodAiContextInput,
): Promise<MoodCurationRequest | null> {
  const mood = moodByKey(input.moodKey)
  if (!mood) return null

  const candidates: AiCandidateTrack[] = input.candidates
    .filter((c) => c.track_id)
    .map((c) => ({
      id: c.track_id as string,
      t: (c.title ?? '').slice(0, 120),
      a: (c.artist_name ?? '').slice(0, 80),
      pc: Number(c.play_count ?? 0),
    }))

  if (candidates.length === 0) return null

  /*
   * 🔴 ONAY BAYRAĞI (`k`) — sistemin sahip olduğu EN GÜÇLÜ sinyal.
   *
   * ÖLÇÜLDÜ (2026-09-20): deterministik havuzun ilk 50'si kullanıcının
   * bıraktığı parçaların %91'ini taşırken, AI kürasyonundan sonra bu oran
   * %48'e düşüyordu. Sebep basit: modele o parçaların onaylı olduğunu HİÇ
   * söylemiyorduk — yalnız 12 tanesini "pozitif örnek" olarak gösteriyorduk,
   * aday listesinde işaretlenmiş değillerdi. Model de kendi tercihini
   * kullanıcının kararının önüne koyuyordu.
   *
   * Bayrak modele gider; zorunluluk ise `validateAiSelection`'daki onay
   * kotasında uygulanır (AI prompt'u ezemez — Sahibin hard rule kuralı).
   */
  const onaySeti = new Set(input.approvedTrackIds)
  if (onaySeti.size > 0) {
    for (const aday of candidates) {
      if (onaySeti.has(aday.id)) aday.k = true
    }
  }

  /*
   * KATMAN A → KATMAN C bağlantısı (migration 0319, 0325'te genişletildi).
   *
   * Etiketi olmayan adaya alan EKLENMEZ — boş string hem token harcar hem
   * modele yanlış sinyal verir ("türü yok" ≠ "bilmiyoruz"). Etiket YOKLUĞU
   * modele `unknown_metadata` listesiyle AYRICA söylenir (§16): model
   * "bu parça hakkında yeterince güvenilir metaveri yok"u bilebilsin.
   *
   * Hata yutulur: etiketler bir iyileştirmedir, olmazsa kürasyon eskisi gibi
   * başlık+sanatçı ile çalışır.
   */
  try {
    const { data: etiketler, error } = await input.supabase.rpc('catalog_enrichment_for_tracks', {
      p_track_ids: candidates.map((c) => c.id),
    })
    if (error) throw new Error(error.message)

    const harita = new Map<string, Partial<AiCandidateTrack>>()
    for (const satir of (etiketler ?? []) as Array<{
      track_id: string | null
      primary_genre: string | null
      energy_character: string | null
      tempo_character: string | null
      moods: string[] | null
      vibe: string[] | null
      language: string | null
      confidence: number | null
      kaynak: string | null
    }>) {
      if (!satir.track_id) continue
      // mood + vibe TEK listede: model için ikisi de "bu parça ne hissettirir"
      // sorusunun cevabı; ayrı iki alan token harcar, ayrım bilgi taşımıyor.
      // ⚠ TAVAN 4, ölçümle: 6 etiket × 200 aday, girdiyi 15k token'a çıkardı
      // ve çağrıyı 2 kat yavaşlattı (12 mood'un 6'sı AI'sız kaldı). Kanonik
      // eksenler önce geliyor (`moods`), serbest `vibe` kuyrukta — kırpma
      // önce renk bilgisini atar, karakteri korur.
      const his = [...(satir.moods ?? []), ...(satir.vibe ?? [])]
        .map((x) => x.slice(0, 20))
        .filter(Boolean)
      harita.set(satir.track_id, {
        g: satir.primary_genre?.slice(0, 40) || undefined,
        e: satir.energy_character || undefined,
        tc: satir.tempo_character || undefined,
        m: his.length ? Array.from(new Set(his)).slice(0, 4) : undefined,
        l: satir.language?.slice(0, 20) || undefined,
        // Yalnız DÜŞÜK güven yazılır: 0.9 yazmak token harcar, 0.4 bilgi taşır.
        lc: satir.confidence != null && satir.confidence < 0.5 ? true : undefined,
        // Sanatçıdan devşirilen etiket parça bazlı olandan zayıftır (§17):
        // model "bu etiket parçanın kendisinden mi geliyor" ayrımını bilmeli.
        src: satir.kaynak === 'artist' ? 'artist' : undefined,
      })
    }

    for (const aday of candidates) {
      const etiket = harita.get(aday.id)
      if (!etiket) continue
      if (etiket.g) aday.g = etiket.g
      if (etiket.e) aday.e = etiket.e
      if (etiket.tc) aday.tc = etiket.tc
      if (etiket.m) aday.m = etiket.m
      if (etiket.l) aday.l = etiket.l
      if (etiket.lc) aday.lc = etiket.lc
      if (etiket.src) aday.src = etiket.src
    }
  } catch (err) {
    void systemLog({
      operation: 'mood_ai_context',
      userId: input.userId,
      severity: 'warn',
      errorMessage: `katalog etiketleri okunamadi: ${hataMetni(err)}`,
    })
  }

  const [userTasteSummary, recentListening, artistPenaltyNote, moodTanimi, negatifOrnekler, pozitifOrnekler] =
    await Promise.all([
      buildTasteSummary(input.supabase, input.userId),
      buildRecentListening(input.supabase, input.userId),
      buildArtistPenaltyNote(input.supabase, input.hiddenTrackIds),
      buildMoodTanimi(input.supabase, input.moodKey),
      buildOrnekler(input.supabase, input.hiddenTrackIds),
      buildOrnekler(input.supabase, input.approvedTrackIds),
    ])

  const metaverisizOran =
    candidates.length > 0
      ? candidates.filter((c) => !c.g && !c.e && !c.m).length / candidates.length
      : 0

  return {
    playlistTitle: mood.title,
    playlistDefinition: `"${mood.title}" — ${mood.tagline}`,
    moodTanimi,
    userTasteSummary,
    recentListening,
    previousTrackIds: input.previousTrackIds,
    hiddenCount: input.hiddenTrackIds.length,
    artistPenaltyNote,
    negatifOrnekler,
    pozitifOrnekler,
    metaverisizOran,
    candidates,
    targetCount: input.targetCount,
    userId: input.userId,
  }
}
