import { BlogListesi } from '@/components/marketing/sayfalar/BlogListesi'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'

const t = SOZLUK.en.blog

export const metadata = marketingMetadata({
  dil: 'en',
  yol: '/blog',
  baslik: t.metaBaslik,
  aciklama: t.metaAciklama,
})

export default function BlogPageEn() {
  return <BlogListesi dil="en" />
}
