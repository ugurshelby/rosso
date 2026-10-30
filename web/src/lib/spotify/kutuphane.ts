import 'server-only'

import { checkGate, pacedFetch, PRIORITY_HIGH, record429, refund, SCOPE_USER } from '@/lib/spotify/api-gate'

/**
 * Playlist'ler kullanıcının Spotify kütüphanesinde mi?
 *
 * `GET /v1/me/library/contains?uris=spotify:playlist:<id>,...` — Şubat 2026'da
 * kaldırılan `/playlists/{id}/followers/contains`'in yerine geçen uç. Kullanıcı
 * Spotify'da bir listeyi "sildiğinde" liste aslında kütüphaneden çıkar; bu uç
 * `false` döner (2026-10-30 canlı ölçüm: silinen 5 mood listesi false, aynı
 * hesabın Ağustos/Eylül otomatik listeleri true).
 *
 * Bilinmeyen her durum (token yok, bütçe/ceza, 4xx/5xx, ağ) haritaya YAZILMAZ:
 * çağıran yalnız açık `false` gördüğünde durumu değiştirir — yanlış "kaldırıldı"
 * kararı, gerçek bir listeyi koparmaktan daha kötüdür.
 */
const PARTI = 20
const ZAMAN_ASIMI_MS = 4000

export async function playlistlerKutuphanede(token: string, playlistIds: string[]): Promise<Map<string, boolean>> {
  const sonuc = new Map<string, boolean>()
  const benzersiz = [...new Set(playlistIds.filter(Boolean))]

  for (let i = 0; i < benzersiz.length; i += PARTI) {
    const parti = benzersiz.slice(i, i + PARTI)
    const kapi = await checkGate(SCOPE_USER, { priority: PRIORITY_HIGH })
    if (!kapi.allowed) break

    let res: Response
    try {
      const uris = parti.map((id) => `spotify:playlist:${id}`).join(',')
      res = await pacedFetch(`https://api.spotify.com/v1/me/library/contains?uris=${encodeURIComponent(uris)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      })
    } catch {
      await refund(SCOPE_USER)
      break
    }

    if (res.status === 429) {
      await record429(SCOPE_USER, Number(res.headers.get('retry-after')) || null, 'me/library/contains')
      break
    }
    if (!res.ok) break

    const govde = (await res.json().catch(() => null)) as unknown
    if (!Array.isArray(govde) || govde.length !== parti.length) break
    parti.forEach((id, j) => {
      if (typeof govde[j] === 'boolean') sonuc.set(id, govde[j] as boolean)
    })
  }
  return sonuc
}
