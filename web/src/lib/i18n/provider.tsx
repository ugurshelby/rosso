'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Locale } from './locales'
import type { PartialCatalog, Translator } from './translate'
import { createTranslatorFrom } from './translate'

/**
 * İstemci tarafı çeviri bağlamı. Sunucu, yalnız SEÇİLİ yüzeyleri (`Namespace`)
 * bu bileşene geçirir (`server-provider.tsx`) — bkz. README "paket boyutu".
 */
const I18nContext = createContext<{ locale: Locale; translator: Translator } | null>(null)

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale
  messages: PartialCatalog
  children: ReactNode
}) {
  const value = useMemo(
    () => ({ locale, translator: createTranslatorFrom(locale, messages) }),
    [locale, messages],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

const DEFAULT_FALLBACK_TRANSLATOR: Translator = createTranslatorFrom('en', {})

/** İstemci bileşenlerinde: `const { t, tp, locale } = useT()`. */
export function useT(): Translator {
  const ctx = useContext(I18nContext)
  if (!ctx) return DEFAULT_FALLBACK_TRANSLATOR
  return ctx.translator
}
