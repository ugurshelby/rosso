import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { MOOD_COVER_SLUG } from '@/lib/analytics/mood-cover-art'
import type { MoodKey } from '@/lib/analytics/mood'
import { getSpotifyToken } from './spotify-target'
import { fetchWithRetry } from './fetch-retry'

/**
 * FAZ MOOD Katman 4 (Sahip 2026-07-26): "Spotify'a ekle"nce kapak Spotify
 * playlist'ine de gelsin.
 *
 * 2026-08-11 güncellemesi (Sahip: "svg görselleri yerine vibe görselleri
 * kullanılsın"): kaynak artık üretilmiş SVG değil, `public/vibe-cards/*.webp`
 * sanat eseri — `mood-cover-art.ts`'teki mood→dosya eşleştirmesi kullanılır.
 *
 * Spotify KISITI (§1.5 — dokümandan doğrulandı): PUT /v1/playlists/{id}/images
 *   - Body: base64-encoded JPEG (WEBP/PNG KABUL ETMEZ), Content-Type: image/jpeg
 *   - Max ~256 KB (base64'ten SONRA).
 *   - Scope: ugc-image-upload (zaten OAuth'ta, bkz. spotify/connect/route.ts).
 *
 * İKİNCİL iş: kapak yüklenemese bile playlist oluştu + şarkılar eklendi. Bu
 * yüzden hata FIRLATILMAZ, yalnız loglanır — playlist'i düşürmez.
 */

/** Vibe kapağını (`.webp`, 1500×1500) Spotify'ın istediği base64 JPEG'e çevirir.
 * 640px'e küçültülür + JPEG q78 ile sıkıştırılır — Spotify'ın ~256KB (base64
 * sonrası) tavanı için güvenli marj (ölçüldü: 640px q78 JPEG tipik ~40-70KB,
 * base64 ~%33 şişer → ~55-95KB, tavanın çok altında). */
async function renderMoodCoverJpegBase64(moodKey: MoodKey): Promise<string> {
  const slug = MOOD_COVER_SLUG[moodKey]
  const filePath = path.join(process.cwd(), 'public', 'vibe-cards', `${slug}.webp`)
  const source = await readFile(filePath)
  const jpeg = await sharp(source)
    .resize(640, 640, { fit: 'cover' })
    .jpeg({ quality: 78, progressive: false })
    .toBuffer()
  return jpeg.toString('base64')
}

/**
 * Mood kapağını verilen Spotify playlist'ine yükler.
 * Başarısızlık taşımayı DÜŞÜRMEZ — {ok} döner, hata loglanır.
 */
export async function uploadMoodCoverToSpotify(
  userId: string,
  playlistId: string,
  moodKey: MoodKey,
): Promise<{ ok: boolean }> {
  try {
    const token = await getSpotifyToken(userId)
    if (!token) return { ok: false }

    const base64 = await renderMoodCoverJpegBase64(moodKey)

    // Spotify: base64 JPEG string DOĞRUDAN body (JSON değil).
    const res = await fetchWithRetry(
      `https://api.spotify.com/v1/playlists/${playlistId}/images`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'image/jpeg',
        },
        body: base64,
      },
    )
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn(
        `Mood kapak yükleme başarısız: ${res.status} ${detail.slice(0, 160)} — ` +
          `playlist ${playlistId} oluştu ama kapak boş kalabilir`,
      )
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.warn(
      `Mood kapak yükleme exception (playlist ${playlistId}): ` +
        `${err instanceof Error ? err.message : String(err)}`,
    )
    return { ok: false }
  }
}
