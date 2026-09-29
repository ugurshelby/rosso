'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { moodByKey } from '@/lib/analytics/mood'
import { gecerliMoodEtiketi, type MoodEtiketi } from '@/lib/analytics/mood-etiket'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Mood çalışma alanı eylemleri (migration 0255).
 *
 * ⚠ Server action: kimlik `auth.uid()` üzerinden RPC'nin İÇİNDE çözülüyor,
 *   istemciden `userId` ALINMIYOR. RLS `security invoker` ile uygulanıyor —
 *   kullanıcı başkasının çalışma alanına yazamaz.
 *
 * ⚠ `moodByKey` doğrulaması: DB'de zaten CHECK kısıtı var
 *   (`mood_workspace_key_gecerli`), ama hatayı kullanıcıya SQL hatası olarak
 *   göstermek yerine burada erken kesiyoruz.
 */

type Sonuc = { ok: true } | { ok: false; hata: string }

/** Kullanıcının listeden çıkardığı şarkıları kaydeder (tam liste yazılır). */
export async function moodGizlenenleriKaydet(
  moodKey: string,
  hiddenTrackIds: string[],
): Promise<Sonuc> {
  if (!moodByKey(moodKey)) return { ok: false, hata: 'Invalid moment key.' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('set_mood_hidden_tracks', {
      p_mood_key: moodKey,
      p_hidden: hiddenTrackIds,
    })
    if (error) throw error

    revalidatePath(`/playlists/mood/${moodKey}`)
    return { ok: true }
  } catch (err) {
    console.error('[mood] gizlenenler kaydedilemedi:', err)
    return { ok: false, hata: 'Couldn’t save the change. Try again.' }
  }
}

/**
 * Parçaya uygunluk etiketi verir ya da kaldırır (migration 0338).
 *
 * Kişisel etki (listeden çıkar / onayla) ve katalog etkisi (herkes için
 * uygunluk kuralı) DB tetikleyicisinde yapılır — burada yalnız niyet yazılır.
 * `etiket: null` → etiketi kaldır.
 *
 * ⚠ `revalidatePath` YOK: arayüz iyimser; her etiket tıklamasında sayfayı
 *   yeniden render etmek hızlı etiketlemeyi (Sahip: "işleri hızlandırmak")
 *   yavaşlatırdı. Sonraki ziyaret zaten taze okur.
 */
export async function moodEtiketKaydet(
  moodKey: string,
  trackId: string,
  etiket: MoodEtiketi | null,
): Promise<Sonuc> {
  if (!moodByKey(moodKey)) return { ok: false, hata: 'Invalid moment key.' }
  if (!UUID_RE.test(trackId)) return { ok: false, hata: 'Invalid track.' }
  if (etiket !== null && !gecerliMoodEtiketi(etiket)) return { ok: false, hata: 'Invalid label.' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('set_mood_track_feedback', {
      p_mood_key: moodKey,
      p_track_id: trackId,
      p_etiket: etiket,
    })
    if (error) throw error
    return { ok: true }
  } catch (err) {
    console.error('[mood] etiket kaydedilemedi:', err)
    return { ok: false, hata: 'Etiket kaydedilemedi. Tekrar dene.' }
  }
}

/**
 * Spotify aktarımını damgalar — CTA durumu bunu okur.
 *
 * ⚠ Bu eylem export'u YAPMAZ, yalnız **kaydeder**. Aktarımın kendisi
 *   `/api/mood/create-playlist` üzerinden gidiyor; damga ondan sonra atılır.
 *   Ayrı tutulmasının sebebi: Spotify çağrısı başarısız olursa damga da
 *   atılmamalı, yoksa kullanıcı "eklendi" görüp aslında eklenmemiş olurdu.
 */
export async function moodExportDamgala(
  moodKey: string,
  playlistId?: string,
): Promise<Sonuc> {
  if (!moodByKey(moodKey)) return { ok: false, hata: 'Invalid moment key.' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('mark_mood_exported', {
      p_mood_key: moodKey,
      ...(playlistId ? { p_playlist_id: playlistId } : {}),
    })
    if (error) throw error

    revalidatePath(`/playlists/mood/${moodKey}`)
    return { ok: true }
  } catch (err) {
    console.error('[mood] export damgalanamadı:', err)
    // Aktarım BAŞARILI oldu, yalnız damga atılamadı — kullanıcıya hata
    // göstermek yanıltıcı olur. Sessiz geç, bir sonraki yüklemede düzelir.
    return { ok: false, hata: '' }
  }
}

/**
 * Haftalık senkron tercihini kaydeder (migration 0270, Sahip: "senkron et
 * seçeneğini de açarak haftalık olarak playlistin güncellenmesini
 * seçebilir"). Yalnız daha önce Spotify'a aktarılmış bir mood'ta anlamlıdır
 * — UI bunu zaten `exportedPlaylistId` doluysa gösterir.
 */
export async function moodHaftalikSenkronAyarla(
  moodKey: string,
  enabled: boolean,
): Promise<Sonuc> {
  if (!moodByKey(moodKey)) return { ok: false, hata: 'Invalid moment key.' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('set_mood_weekly_sync', {
      p_mood_key: moodKey,
      p_enabled: enabled,
    })
    if (error) throw error

    revalidatePath(`/playlists/mood/${moodKey}`)
    return { ok: true }
  } catch (err) {
    console.error('[mood] haftalık senkron ayarlanamadı:', err)
    return { ok: false, hata: 'Couldn’t save the change. Try again.' }
  }
}
