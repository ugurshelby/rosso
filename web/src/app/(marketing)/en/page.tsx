import { AnaSayfa } from '@/components/marketing/sayfalar/AnaSayfa'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'

const t = SOZLUK.en.anaSayfa

/** Ana sayfa (İngilizce). Türkçe asıl: `(marketing)/page.tsx`. */
export const metadata = marketingMetadata({
  dil: 'en',
  yol: '/',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
  paylasimAciklamasi: t.paylasimAciklamasi,
  mutlakBaslik: true,
})

export default function LandingPageEn() {
  return <AnaSayfa dil="en" />
}
