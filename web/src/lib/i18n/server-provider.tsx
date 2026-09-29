import 'server-only'
import type { ReactNode } from 'react'
import { catalogs, type Namespace } from './messages'
import { getLocale } from './server'
import { I18nProvider } from './provider'
import type { PartialCatalog } from './translate'

/**
 * Sunucu → istemci köprüsü. Dili çözer, YALNIZ istenen yüzeyleri istemciye
 * gönderir ve alt ağacı `<div lang>` ile sarar (`text-transform: uppercase`
 * ve ekran okuyucu doğru dil kurallarını kullansın — Türkçe `i/İ`).
 *
 *   <I18nServerProvider namespaces={['common', 'nav', 'quickStart']}>…</…>
 *
 * İç içe kullanılabilir: içteki provider kendi yüzeylerini ekler.
 * `display: contents` — sarmalayıcı düzeni etkilemez.
 */
export async function I18nServerProvider({
  namespaces,
  children,
}: {
  namespaces: readonly Namespace[]
  children: ReactNode
}) {
  const locale = await getLocale()
  const secili: Record<string, unknown> = {}
  for (const ns of namespaces) secili[ns] = catalogs[locale][ns]

  return (
    <div lang={locale} style={{ display: 'contents' }}>
      <I18nProvider locale={locale} messages={secili as PartialCatalog}>
        {children}
      </I18nProvider>
    </div>
  )
}
