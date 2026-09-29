import { intlLocale, type Locale } from './locales'

/**
 * Dile duyarlı biçimlendirme — SAF. `APP_LOCALE` (sabit 'en-US') yerine bunlar
 * kullanılır: Türkçe kullanıcı "1.234,5" ve "24 Eyl 2026" görür.
 */

export function formatNumber(value: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(value)
}

export function formatDate(
  value: Date | string | number,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(new Date(value))
}

const BIRIMLER: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600 * 1000],
  ['month', 30 * 24 * 3600 * 1000],
  ['day', 24 * 3600 * 1000],
  ['hour', 3600 * 1000],
  ['minute', 60 * 1000],
]

/** "3 hours ago" / "3 saat önce". `simdi` test içindir. */
export function formatRelative(value: Date | string | number, locale: Locale, simdi = Date.now()): string {
  const fark = new Date(value).getTime() - simdi
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' })
  for (const [birim, ms] of BIRIMLER) {
    if (Math.abs(fark) >= ms) return rtf.format(Math.round(fark / ms), birim)
  }
  return rtf.format(0, 'minute')
}
