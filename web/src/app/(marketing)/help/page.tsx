import { YardimSayfasi } from '@/components/marketing/sayfalar/YardimSayfasi'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'

const t = SOZLUK.tr.yardim

export const metadata = marketingMetadata({
  dil: 'tr',
  yol: '/help',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
})

export default function HelpPage() {
  return <YardimSayfasi dil="tr" />
}
