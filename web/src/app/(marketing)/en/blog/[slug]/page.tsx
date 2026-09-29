import type { Metadata } from 'next'
import { BlogYazisi, blogYazisiMetadata } from '@/components/marketing/sayfalar/BlogYazisi'
import { YAZI_SLUGLARI } from '@/app/(marketing)/blog/posts'

export function generateStaticParams() {
  return YAZI_SLUGLARI.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return blogYazisiMetadata('en', slug)
}

export default async function BlogPostPageEn({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <BlogYazisi dil="en" slug={slug} />
}
