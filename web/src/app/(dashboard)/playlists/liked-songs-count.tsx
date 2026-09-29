import { LikedSongsEntry } from '@/components/playlists/liked-songs-entry'
import { getLikedSongsPage } from '@/lib/library/liked-songs'

interface LikedSongsCountProps {
  userId: string
}

/**
 * "Beğenilen Şarkılar" satırındaki sayı — ayrı bileşende, çünkü `liked_songs_page`
 * RPC'si 2.650 satırlık tabloda sıralama + sayfalama yapıyor (limit:1 olsa da
 * COUNT hâlâ tüm satırları tarıyor). Eskiden page.tsx'in ana `Promise.all`
 * bloğunun DIŞINDA, sıralı (`await`) çağrılıyordu — bu da playlist ızgarasının
 * ilk boyamasını bu tek RPC'ye bağlıyordu. Artık `<Suspense>` ile ayrıca akar;
 * fallback `LikedSongsEntry`'nin kendi `trackCount=null` durumu (bileşen zaten
 * bu durum için tasarlanmış — bkz. liked-songs-entry.tsx), yani iskelet kutusu
 * yerine son haliyle aynı satır anında görünür, sayı gelince yerine oturur.
 */
export async function LikedSongsCount({ userId }: LikedSongsCountProps) {
  const { total } = await getLikedSongsPage(userId, { limit: 1, offset: 0 })
  return <LikedSongsEntry trackCount={total} />
}
