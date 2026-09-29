import type { Metadata } from 'next'
import { OG_LOCALE, dilAlternatifleri, yerelYol, type Dil } from './dil'

/**
 * Marketing sayfası metadata'sı — iki dilin tek üreticisi.
 *
 * ⚠ `openGraph` ve `twitter` burada TAMAMEN yazılıyor: Next bu nesneleri
 * kök layout'unkiyle BİRLEŞTİRMEZ, değiştirir (2026-08-21'de ölçüldü: eksik
 * yazılan `openGraph` ana sayfayı görselsiz bıraktı). Kökteki İngilizce
 * varsayılan da ancak böyle ezilir — yoksa Türkçe sayfa İngilizce
 * paylaşım kartıyla çıkardı.
 */
export function marketingMetadata({
  dil,
  yol,
  baslik,
  aciklama,
  mutlakBaslik = false,
  paylasimAciklamasi,
}: {
  dil: Dil
  /** Türkçe (öneksiz) yol — `/`, `/pricing`, `/blog/slug`. */
  yol: string
  baslik: string
  aciklama: string
  /** true → kök şablon (`%s — Rosso`) uygulanmaz; ana sayfa için. */
  mutlakBaslik?: boolean
  /** Paylaşım kartında daha kısa bir cümle istenirse. */
  paylasimAciklamasi?: string
}): Metadata {
  const tamBaslik = mutlakBaslik ? baslik : `${baslik} — Rosso`
  const kartAciklamasi = paylasimAciklamasi ?? aciklama
  const gorsel = { url: '/opengraph-image', width: 1200, height: 630, alt: tamBaslik }

  return {
    title: mutlakBaslik ? { absolute: baslik } : baslik,
    description: aciklama,
    alternates: dilAlternatifleri(dil, yol),
    openGraph: {
      type: 'website',
      siteName: 'Rosso',
      locale: OG_LOCALE[dil],
      alternateLocale: OG_LOCALE[dil === 'tr' ? 'en' : 'tr'],
      title: tamBaslik,
      description: kartAciklamasi,
      url: yerelYol(dil, yol),
      images: [gorsel],
    },
    twitter: {
      card: 'summary_large_image',
      title: tamBaslik,
      description: kartAciklamasi,
      images: ['/opengraph-image'],
    },
  }
}
