import { FiyatSayfasi } from '@/components/marketing/sayfalar/FiyatSayfasi'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'

const t = SOZLUK.tr.fiyat

export const metadata = marketingMetadata({
  dil: 'tr',
  yol: '/pricing',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
})

export default function PricingPage() {
  return <FiyatSayfasi dil="tr" />
}
