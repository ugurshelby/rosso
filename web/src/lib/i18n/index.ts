/**
 * Dil altyapısı — kullanım: `lib/i18n/README.md`.
 *
 * ⚠ Bu dosya YALNIZ saf, istemci-güvenli parçaları dışa aktarır. Sunucuya özel
 *   olanlar doğrudan içe aktarılır (`@/lib/i18n/server`, `@/lib/i18n/actions`,
 *   `@/lib/i18n/server-provider`); istemci `useT` için `@/lib/i18n/provider`.
 */
export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, intlLocale, localeFromAcceptLanguage } from './locales'
export type { Locale } from './locales'
export { formatNumber, formatDate, formatRelative } from './format'
export type { MessageKey, PluralKey, Namespace } from './messages'
