import { BlogListesi } from '@/components/marketing/sayfalar/BlogListesi'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'

const t = SOZLUK.tr.blog

export const metadata = marketingMetadata({
  dil: 'tr',
  yol: '/blog',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
})

export default function BlogPage() {
  return <BlogListesi dil="tr" />
}
