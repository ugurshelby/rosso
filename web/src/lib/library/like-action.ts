'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getPhaseState } from '@/lib/phase/read'
import { setTrackLiked, type LikeResult } from './like-track'
import { syncLikedSongs, type SyncLikedResult } from './sync-liked'

/**
 * A5 — Beğeni butonu server action'ı.
 *
 * Faz kapısı burada da var: `like-track.ts` Spotify disiplinini korur,
 * bu katman **yetkiyi** korur. İstemciye güvenilmez — biri action'ı doğrudan
 * çağırabilir, sayfada butonu görmese de.
 */
export async function toggleTrackLike(
  spotifyTrackId: string,
  liked: boolean,
): Promise<LikeResult> {
  const user = await requireAuth()

  const phase = await getPhaseState(user.id)
  if (!phase.capabilities.canLikeTracks) {
    // Faz 2'den itibaren açık (plan P1/A5). Kapalıysa sessizce değil,
    // açıkça reddet — istemci doğru mesajı gösterebilsin.
    return { ok: false, reason: 'no_token' }
  }

  const result = await setTrackLiked(user.id, spotifyTrackId, liked)

  // Beğeni değişince iki yerdeki sayı birden kayar: sanal listenin kendisi
  // (üç görünümün toplamları) ve playlist sayfasındaki giriş satırı. İkisi de
  // tazelenmezse kullanıcı az önce eklediği şarkıyı sayıda göremez.
  if (result.ok) {
    revalidatePath('/playlists/liked')
    revalidatePath('/playlists')
  }

  return result
}

/**
 * "Beğenileri tazele" — Spotify'daki gerçekle Rosso'yu eşitler.
 *
 * ⚠ KULLANICI TETİKLER, cron DEĞİL. Sebep: 2.700 beğeni ≈ 54 istek; her
 * kullanıcı için saatlik koşan bir cron Spotify kotasını hızla yer
 * (§4.2: "Bu kaç istek atıyor?"). Kullanıcı sayısını gördüğünde tetikler.
 *
 * Faz kapısı `canSeeLikedSongs`: beğeni listesini göremeyen biri onu
 * tazeleyemez de.
 */
export async function refreshLikedSongs(): Promise<SyncLikedResult> {
  const user = await requireAuth()

  const phase = await getPhaseState(user.id)
  if (!phase.capabilities.canSeeLikedSongs) {
    return { ok: false, reason: 'no_token' }
  }

  const result = await syncLikedSongs(user.id)

  if (result.ok) {
    revalidatePath('/playlists/liked')
    revalidatePath('/playlists')
  }

  return result
}
