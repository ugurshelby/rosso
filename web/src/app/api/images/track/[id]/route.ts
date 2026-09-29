import { after, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { ensureValidToken } from '@/lib/services/token-refresh'
import {
  cacheDeezerImageInBackground,
  cacheImageInBackground,
  deezerDenendiIsaretle,
} from '@/lib/images/catalog-cache'
import { deezerSarkiKapagi, DeezerGeciciHata } from '@/lib/cover/deezer'
import { ZAMAN_ASIMI_VERI } from '@/lib/fetch/zaman-asimi'

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

const ONBELLEK = { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' }

/**
 * Track albüm kapağı — runtime proxy + lazy cache (2026-07-05, genişletildi 2026-07-14,
 * Deezer yedeği 2026-09-24).
 *
 * SIRA (Sahip §14, "kullanıcı en hızlı biçimde görsün"):
 *   1. `tracks.image_url` — DB'de zaten varsa (Spotify kopyamız YA DA daha önce
 *      Deezer'dan gelip tetikleyicinin doldurduğu kapak; migration 0349). Hiçbir dış
 *      servise gidilmez.
 *   2. Kullanıcının Spotify bağlantısı varsa Spotify'dan canlı çek (mevcut davranış).
 *   3. Spotify yoksa/başarısızsa Deezer (ISRC → başlık+sanatçı). Yanıt HEMEN döner;
 *      DB'ye yazma (`deezer_image_url`) ve Storage kopyası arka planda.
 * Spotify kapağı sonradan gelirse DB tetikleyicisi Spotify'ı öne alır — burada
 * çakışma yönetimi YOK, çünkü gerekmiyor.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response
  const user = oturum.user
  const { id: trackId } = await params

  const supabase = await createServiceClient()
  const { data: track } = await supabase
    .from('tracks')
    .select('spotify_id, image_url, isrc, title, artists')
    .eq('id', trackId)
    .single()

  if (!track) {
    return NextResponse.json({ error: 'Track bulunamadı' }, { status: 404 })
  }

  if (track.image_url) {
    return NextResponse.json(
      { images: [{ url: track.image_url, width: 640, height: 640 }] },
      { headers: ONBELLEK },
    )
  }

  // ── Spotify (kullanıcının bağlantısı varsa) ────────────────────────────────
  if (track.spotify_id) {
    const token = await ensureValidToken(user.id, 'spotify')
    if (token) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/tracks/${track.spotify_id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(ZAMAN_ASIMI_VERI),
        })
        if (res.ok) {
          const data = (await res.json()) as {
            album?: { images?: Array<{ url: string; width: number; height: number }> }
          }
          const images = data.album?.images ?? []
          const bestImage = images[0]
          if (bestImage) {
            void cacheImageInBackground({ table: 'tracks', rowId: trackId, sourceUrl: bestImage.url })
            return NextResponse.json({ images }, { headers: ONBELLEK })
          }
        }
        // Spotify başarısız/kapaksız → Deezer'a düş (kullanıcı görselsiz kalmasın).
      } catch {
        // Ağ/zaman aşımı → Deezer'a düş.
      }
    }
  }

  // ── Deezer yedeği (bağlantısız / ZIP-only kullanıcı ya da Spotify'da yok) ─────
  try {
    const dz = await deezerSarkiKapagi({
      isrc: track.isrc,
      title: track.title ?? '',
      artists: track.artists ?? [],
    })
    if (dz) {
      after(() => cacheDeezerImageInBackground({ table: 'tracks', rowId: trackId, sourceUrl: dz.url }))
      return NextResponse.json(
        { images: [{ url: dz.url, width: 500, height: 500 }] },
        { headers: ONBELLEK },
      )
    }
    after(() => deezerDenendiIsaretle('tracks', trackId))
    return NextResponse.json({ error: 'No image' }, { status: 404 })
  } catch (err) {
    // Geçici (ağ/kota): damga vurulmaz, bir sonraki istek yeniden dener.
    if (err instanceof DeezerGeciciHata) {
      return NextResponse.json({ error: 'Cover source unavailable' }, { status: 502 })
    }
    throw err
  }
}
