import { AnaSayfa } from '@/components/marketing/sayfalar/AnaSayfa'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'

const t = SOZLUK.tr.anaSayfa

/**
 * Ana sayfa (Türkçe — ana dil). İngilizcesi: `en/page.tsx`.
 *
 * Başlık ŞABLONA girmez (`mutlakBaslik`): kök şablon "%s — Rosso" ekliyor
 * ve "Rosso — … — Rosso" çıkarırdı. Metin hero'nun sesiyle aynı —
 * arama sonucunda gördüğü cümleyle sayfada karşılaştığı cümlenin aynı
 * olması, tıklayan kişiye "doğru yere geldim" dedirtir.
 */
export const metadata = marketingMetadata({
  dil: 'tr',
  yol: '/',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
  paylasimAciklamasi: t.paylasimAciklamasi,
  mutlakBaslik: true,
})

export default function LandingPage() {
  return <AnaSayfa dil="tr" />
}
