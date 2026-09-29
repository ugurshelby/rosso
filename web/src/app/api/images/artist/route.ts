import { after, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import {
  cacheArtistImageInBackground,
  cacheDeezerImageInBackground,
  deezerDenendiIsaretle,
} from '@/lib/images/catalog-cache'
import { deezerSanatciGorseli, DeezerGeciciHata } from '@/lib/cover/deezer'
import { ZAMAN_ASIMI_VERI } from '@/lib/fetch/zaman-asimi'
import { normalizeArtistName } from '@/lib/catalog/normalize-artist-name'

// Basit in-memory çözümleme önbelleği (cold startlar arası silinir)
const _artistImageCache = new Map<string, { url: string; timestamp: number }>()
const CACHE_TTL = 3600 * 1000 // 1 saat

/*
 * Rota süre sınırı (2026-08-21 refine).
 *
 * Vercel varsayılanı **300 saniye**. Bu rota dış API çağırıyor; oradaki
 * `AbortSignal.timeout` isteği keser ama rotanın KENDİSİ (yeniden denemeler,
 * DB yazımı, arka plan işi) hâlâ dakikalarca sürebilir. `maxDuration` ikinci
 * ve son sınır: kullanıcı sonsuz bekleyen bir istekle kalmaz, fonksiyon
 * boşuna faturalanmaz.
 *
 * Değer, fetch zaman aşımının ÜSTÜNDE seçildi ki normal yavaşlık burada
 * değil, kendi katmanında yakalansın ve hata mesajı anlamlı olsun.
 */
export const maxDuration = 30

/**
 * Deezer yedeği (0349, 2026-09-24): Spotify bağlantısı yoksa ya da Spotify köprüsü
 * sonuç vermezse. Ada TAM eşleşen sanatçı aranır (yanlış görsel yazmamak için
 * `deezerSanatciGorseli` yaklaşık eşleşme KABUL ETMEZ). `null` = Deezer'da da yok.
 */
async function deezerYedek(
  sanatciId: string | undefined,
  ad: string,
  nameNormalized: string,
): Promise<NextResponse | null> {
  try {
    const url = await deezerSanatciGorseli(ad)
    if (!url) {
      if (sanatciId) after(() => deezerDenendiIsaretle('artists', sanatciId))
      return null
    }
    _artistImageCache.set(nameNormalized, { url, timestamp: Date.now() })
    if (sanatciId) {
      after(() => cacheDeezerImageInBackground({ table: 'artists', rowId: sanatciId, sourceUrl: url }))
    }
    return NextResponse.json(
      { images: [{ url, width: 500, height: 500 }] },
      { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
    )
  } catch (err) {
    if (err instanceof DeezerGeciciHata) return null
    throw err
  }
}

/**
 * Sanatçı görseli — isim-tabanlı, kota-güvenli köprü + lazy cache
 * (2026-07-05, genişletildi 2026-07-14).
 *
 * Önce `artists.image_url` (name_normalized eşleşmesiyle) kontrol edilir —
 * doluysa Spotify'a hiç gidilmez. Boşsa: Recap/Taste'te sanatçı ADLA gelir
 * (Spotify id yok). Kota-güvenli çözüm: `/search` KULLANMA (Dev Mode'da 19s
 * 429 riski). Bunun yerine o sanatçının bir şarkısındaki
 * `tracks.spotify_artist_ids[0]`'ı DB'den bul → `/artists/{id}` → images,
 * sonra arka planda `artists.image_url`'e kaydet (otorite:
 * gorsel-kalici-altyapi-oneri.md).
 *
 * Query: ?name=<sanatçı adı>
 */
export async function GET(req: Request) {
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response
  const user = oturum.user
  const name = new URL(req.url).searchParams.get('name')?.trim()
  if (!name) {
    return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const nameNormalized = normalizeArtistName(name)

  const cached = _artistImageCache.get(nameNormalized)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(
      { images: [{ url: cached.url, width: 640, height: 640 }] },
      { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
    )
  }

  const { data: artistRow } = await supabase
    .from('artists')
    .select('id, image_url')
    .eq('name_normalized', nameNormalized)
    .maybeSingle()

  if (artistRow?.image_url) {
    return NextResponse.json(
      { images: [{ url: artistRow.image_url, width: 640, height: 640 }] },
      { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
    )
  }

  // Köprü: sanatçının adını taşıyan bir track'in spotify_id'si → /tracks/{id} →
  // yanıttaki artists[] içinden ada eşleşen artist.id → /artists/{id} → görsel.
  // (spotify_artist_ids alanı DB'de doldurulmadığı için track üzerinden köprü.)
  // 2026-07-20: Köprü track seçimi artık kör değil. Eskiden `.limit(1)` ile
  // rastgele bir track alınıyordu; çok-sanatçılı bir track (feat./remix)
  // gelirse aşağıdaki ad eşleşmesi tutmaz ve sanatçı görselsiz kalırdı.
  // Birkaç aday çekip **tek sanatçılı** olanı tercih ediyoruz — aranan kişinin
  // o track'in sahibi olduğu kesin.
  const { data: candidates } = await supabase
    .from('tracks')
    .select('spotify_id, artists')
    .contains('artists', [name])
    .not('spotify_id', 'is', null)
    .limit(10)

  const rows = candidates ?? []
  const soloTrack = rows.find((t) => (t.artists ?? []).length === 1)
  const track = soloTrack ?? rows[0]

  if (!track?.spotify_id) {
    return (
      (await deezerYedek(artistRow?.id, name, nameNormalized)) ??
      NextResponse.json({ error: 'Sanatçı için Spotify track köprüsü bulunamadı' }, { status: 404 })
    )
  }

  const token = await ensureValidToken(user.id, 'spotify')
  if (!token) {
    // Spotify bağlantısı olmayan (ZIP-only) kullanıcı: Deezer yedeği.
    return (
      (await deezerYedek(artistRow?.id, name, nameNormalized)) ??
      NextResponse.json({ error: 'No image' }, { status: 404 })
    )
  }

  // Track'ten sanatçı Spotify id'sini çöz.
  const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${track.spotify_id}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(ZAMAN_ASIMI_VERI),
  })
  if (!trackRes.ok) {
    return (
      (await deezerYedek(artistRow?.id, name, nameNormalized)) ??
      NextResponse.json({ error: `Spotify HTTP ${trackRes.status}` }, { status: 502 })
    )
  }
  const trackData = (await trackRes.json()) as {
    artists?: Array<{ id: string; name: string }>
  }
  const artists = trackData.artists ?? []
  // 2026-07-20 (FAZ İ1) — YANLIŞ SANATÇI GÖRSELİ BUG'ININ KÖK NEDENİ:
  // Eskiden `artists.find(...) ?? artists[0]` idi. Ad eşleşmezse listedeki
  // İLK sanatçıya düşüyor ve o yabancı görseli `artists.image_url`'e KALICI
  // yazıyordu. Sahibin bildirdiği "Currents'ta Tame Impala görseli"
  // senaryosu tam bu: köprü track'i çok-sanatçılı olduğunda (feat./remix/
  // derleme) ilk sanatçı aranan kişi olmuyor.
  //
  // Kural: eşleşme kesin değilse GÖRSEL YOK. Yanlış görsel kalıcı olarak
  // yazılıp sessizce yanlış kalmaktansa, görselsiz kalmak doğrudur —
  // bir sonraki tur başka bir track'le doğru eşleşmeyi deneyebilir.
  const matched = artists.find(
    (a) => normalizeArtistName(a.name) === nameNormalized,
  )
  if (!matched?.id) {
    return (
      (await deezerYedek(artistRow?.id, name, nameNormalized)) ??
      NextResponse.json(
        {
          error:
            'Sanatçı adı track yanıtındaki sanatçılarla eşleşmedi — yanlış görsel yazmamak için atlandı',
        },
        { status: 404 },
      )
    )
  }

  const res = await fetch(`https://api.spotify.com/v1/artists/${matched.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(ZAMAN_ASIMI_VERI),
  })

  if (!res.ok) {
    return (
      (await deezerYedek(artistRow?.id, name, nameNormalized)) ??
      NextResponse.json({ error: `Spotify HTTP ${res.status}` }, { status: 502 })
    )
  }

  const data = (await res.json()) as {
    images?: Array<{ url: string; width: number; height: number }>
  }
  const images = data.images ?? []

  if (images.length === 0) {
    return (
      (await deezerYedek(artistRow?.id, name, nameNormalized)) ??
      NextResponse.json({ error: 'No image' }, { status: 404 })
    )
  }

  const bestImage = images[0]
  if (bestImage) {
    _artistImageCache.set(nameNormalized, { url: bestImage.url, timestamp: Date.now() })
    void cacheArtistImageInBackground({
      nameNormalized,
      name,
      sourceUrl: bestImage.url,
    })
  }

  return NextResponse.json(
    { images },
    { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
  )
}
