import 'server-only'

import { triggerSmartSyncIfNeeded } from '@/lib/services/spotify-sync-recently-played'

/**
 * Anlık tazeleme tetikleyici (FAZ 3 — Sıfır Maliyet Mimarisi).
 *
 * Worker konteyneri (7/24) kaldırılmıştır. 
 * 'recently_played' veya 'both' taleplerinde doğrudan Next.js içi akıllı
 * senkronizasyon (triggerSmartSyncIfNeeded) tetiklenir.
 * 
 * İlke: FIRE-AND-FORGET. Sayfayı ASLA bloklamaz, hata fırlatmaz,
 * 30 dakikalık veritabanı kota koruması sayesinde Spotify kota aşımını engeller.
 */

type RefreshKind = 'recently_played' | 'playlists' | 'both'

export async function triggerUserRefresh(
  userId: string,
  kind: RefreshKind = 'both',
): Promise<void> {
  if (kind === 'recently_played' || kind === 'both') {
    void triggerSmartSyncIfNeeded(userId).catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[trigger-refresh] akıllı senkronizasyon sessiz hata:', err)
      }
    })
  }
}

