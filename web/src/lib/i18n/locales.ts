/**
 * Diller — saf, bağımlılıksız (sunucu ve istemci ortak).
 *
 * İngilizce ANA dildir (docs/plans/yeni-kullanici-deneyimi-quick-start.md §13):
 * sözlüğün tek doğruluk kaynağı, çözümlemenin son çaresi. Türkçe, İngilizce
 * sözlükle AYNI yapıya derleme zamanında uymak zorundadır.
 */

export const LOCALES = ['en', 'tr'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** Dil seçimini tutan çerez (işlevsel/zorunlu — analitik rızasına tabi DEĞİL). */
export const LOCALE_COOKIE = 'rosso-locale'
export const LOCALE_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** `Intl` / `toLocaleString` için BCP-47 etiketi. */
export function intlLocale(locale: Locale): string {
  return locale === 'tr' ? 'tr-TR' : 'en-US'
}

/**
 * `Accept-Language` başlığından en uygun dil. Yalnız `tr*` → 'tr'; başlık
 * yoksa/tanınmıyorsa `null` (çağıran varsayılana düşer). q-değerlerine göre
 * sıralar: "en;q=0.5, tr;q=0.9" → 'tr'.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null
  const adaylar = header
    .split(',')
    .map((parca) => {
      const [etiket, ...parametreler] = parca.trim().split(';')
      const q = parametreler.map((p) => p.trim()).find((p) => p.startsWith('q='))
      const agirlik = q ? Number.parseFloat(q.slice(2)) : 1
      return { dil: (etiket ?? '').trim().toLowerCase(), agirlik: Number.isFinite(agirlik) ? agirlik : 0 }
    })
    .filter((a) => a.dil.length > 0 && a.agirlik > 0)
    .sort((a, b) => b.agirlik - a.agirlik)

  for (const { dil } of adaylar) {
    const taban = dil.split('-')[0]
    if (taban === 'tr') return 'tr'
    if (taban === 'en') return 'en'
  }
  return null
}
