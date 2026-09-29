'use client'

import type { ReactNode } from 'react'
import { useMarketingDil } from './use-marketing-dil'

/**
 * Marketing içeriğinin dil kapsamı — `<div lang="tr|en">`.
 *
 * Kök `<html lang="en">` dashboard için doğru (uygulama arayüzü İngilizce),
 * ama marketing ağırlıkla Türkçe. İç öğedeki `lang` kökü geçerli biçimde
 * ezer: ekran okuyucu doğru telaffuzla okur, tarayıcı doğru heceleme ve
 * çeviri önerisi yapar. (Google `lang` özniteliğini sıralama için
 * kullanmıyor; onun için `hreflang` var — bkz. `lib/marketing/dil.ts`.)
 */
export function MarketingDilKapsami({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const { dil } = useMarketingDil()
  return (
    <div lang={dil} className={className}>
      {children}
    </div>
  )
}
