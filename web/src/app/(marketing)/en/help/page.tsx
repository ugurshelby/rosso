import { YardimSayfasi } from '@/components/marketing/sayfalar/YardimSayfasi'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'

const t = SOZLUK.en.yardim

export const metadata = marketingMetadata({
  dil: 'en',
  yol: '/help',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
})

export default function HelpPageEn() {
  return <YardimSayfasi dil="en" />
}
