import type { Metadata } from 'next'
import { ModulSayfasi, modulSayfasiMetadata } from '@/components/marketing/sayfalar/ModulSayfasi'
import { MODUL_ANAHTARLARI, MODUL_SLUGLARI } from '@/lib/marketing/moduller'

export function generateStaticParams() {
  return MODUL_ANAHTARLARI.map((k) => ({ slug: MODUL_SLUGLARI[k] }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return modulSayfasiMetadata('tr', slug)
}

export default async function ModulPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <ModulSayfasi dil="tr" slug={slug} />
}
