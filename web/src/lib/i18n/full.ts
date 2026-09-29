import { DEFAULT_LOCALE, type Locale } from './locales'
import { catalogs } from './messages'
import { createTranslatorFrom, type Translator } from './translate'

/**
 * Tam sözlüklü çevirici — YALNIZ sunucu tarafında kullan. İstemci bileşenleri
 * bunu import ederse iki dilin TÜM sözlüğü paket'e girer; onlar `useT()` kullanır
 * (seçili yüzeyler, `provider.tsx`).
 */
export function createTranslator(locale: Locale): Translator {
  return createTranslatorFrom(locale, catalogs[locale], catalogs[DEFAULT_LOCALE])
}
