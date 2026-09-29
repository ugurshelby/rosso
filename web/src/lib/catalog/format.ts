import { intlLocale, type Locale } from '@/lib/i18n/locales'

/**
 * `locale` opsiyonel ve varsayılanlar geriye dönük uyumlu (eski çağrı yerleri hâlâ
 * çalışır) — ama görünen metin artık kullanıcının seçtiği dile göre değişebilir.
 * Çağıran sunucu bileşeni `getT()`'ten, istemci `useT()`'ten gelen `locale`'i geçirmeli.
 */
export function formatDate(iso: string | null, locale: Locale = 'en'): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Dakikayı insan diline çevirir: 565 → "9s 25dk" (tr) / "9h 25min" (en). */
export function formatMinutes(mins: number, locale: Locale = 'tr'): string {
  const nf = new Intl.NumberFormat(intlLocale(locale))
  if (locale === 'en') {
    if (mins < 60) return `${nf.format(mins)} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m === 0 ? `${nf.format(h)} hr` : `${nf.format(h)}h ${m}min`
  }
  if (mins < 60) return `${nf.format(mins)} dk`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${nf.format(h)} saat` : `${nf.format(h)}s ${m}dk`
}
