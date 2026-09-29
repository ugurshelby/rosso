import { FiyatSayfasi } from '@/components/marketing/sayfalar/FiyatSayfasi'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'

const t = SOZLUK.en.fiyat

export const metadata = marketingMetadata({
  dil: 'en',
  yol: '/pricing',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
})

export default function PricingPageEn() {
  return <FiyatSayfasi dil="en" />
}
