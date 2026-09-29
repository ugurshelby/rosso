'use client'

import Link from 'next/link'
import { yerelYol } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import { useMarketingDil } from './use-marketing-dil'

/**
 * TR ⇄ EN geçişi — aynı sayfanın KARŞI dildeki adresine düz bir bağlantı.
 *
 * Neden düğme + çerez değil: bağlantı olunca Google iki sürümü de bu linkten
 * keşfeder; `hrefLang` ilişkiyi ayrıca bildirir. Tercih saklanmaz — dil,
 * adresin kendisidir.
 */
export function DilDegistirici({ className }: { className?: string }) {
  const { dil, tabanYol } = useMarketingDil()
  const karsi = dil === 'tr' ? 'en' : 'tr'
  const t = SOZLUK[dil].kabuk

  return (
    <Link
      href={yerelYol(karsi, tabanYol)}
      hrefLang={karsi}
      lang={karsi}
      aria-label={t.karsiDilEtiketi}
      className={className}
    >
      {t.karsiDilKisa}
    </Link>
  )
}
