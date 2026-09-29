import { GizlilikSayfasi } from '@/components/marketing/sayfalar/GizlilikSayfasi'
import { GIZLILIK_METNI } from '@/components/marketing/sayfalar/gizlilik-metni'
import { marketingMetadata } from '@/lib/marketing/metadata'

const t = GIZLILIK_METNI.en

export const metadata = marketingMetadata({
  dil: 'en',
  yol: '/privacy',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
})

export default function PrivacyPageEn() {
  return <GizlilikSayfasi dil="en" />
}
