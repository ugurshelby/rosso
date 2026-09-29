/**
 * Marketing yüzeyinin dil altyapısı (2026-09-22, Sahibin kararı).
 *
 * ─── Yapı ───────────────────────────────────────────────────────────────
 * Türkçe ANA dil ve öneksiz kökte yaşar (`/`, `/pricing`, `/blog/...`).
 * İngilizce `/en` altında (`/en`, `/en/pricing`, `/en/blog/...`).
 *
 * Neden çerezli "dil düğmesi" değil de ayrı adres: aynı adreste iki dil
 * olursa Google yalnız birini görür, diğeri hiç indekslenmez. Ayrı adres +
 * `hreflang` ile iki dil ayrı ayrı aranabilir.
 *
 * Neden dinamik `[lang]` segmenti değil: Türkçe öneksiz; `[lang]` her
 * adrese önek zorlar ve dashboard'u da aynı ağaca sokardı. Sabit bir `en/`
 * klasörü marketing sayfalarını ince sarmalayıcılarla yeniden kullanır.
 */

export type Dil = 'tr' | 'en'

export const DILLER: readonly Dil[] = ['tr', 'en']

/** Open Graph `locale` değerleri. */
export const OG_LOCALE: Record<Dil, string> = { tr: 'tr_TR', en: 'en_US' }

/** `hreflang` / `inLanguage` değerleri. */
export const DIL_ETIKETI: Record<Dil, string> = { tr: 'tr-TR', en: 'en-US' }

/** Tarih/sayı biçimlendirme yereli. */
export const TARIH_YERELI: Record<Dil, string> = { tr: 'tr-TR', en: 'en-US' }

/**
 * Dile göre marketing yolu. `yol` her zaman TÜRKÇE (öneksiz) biçimde verilir.
 *   yerelYol('tr', '/pricing') → '/pricing'
 *   yerelYol('en', '/pricing') → '/en/pricing'
 *   yerelYol('en', '/')        → '/en'
 */
export function yerelYol(dil: Dil, yol: string): string {
  const temiz = yol.startsWith('/') ? yol : `/${yol}`
  if (dil === 'tr') return temiz
  return temiz === '/' ? '/en' : `/en${temiz}`
}

/** Yolun dilini ve öneksiz (Türkçe) karşılığını çözer. */
export function yolCoz(pathname: string): { dil: Dil; tabanYol: string } {
  if (pathname === '/en' || pathname === '/en/') return { dil: 'en', tabanYol: '/' }
  if (pathname.startsWith('/en/')) return { dil: 'en', tabanYol: pathname.slice(3) }
  return { dil: 'tr', tabanYol: pathname || '/' }
}

/**
 * Bir marketing sayfasının `alternates` alanı: kendi dilinde canonical +
 * iki dilin `hreflang` eşleşmesi. `x-default` Türkçe — dili belirsiz
 * ziyaretçi ana dile düşer.
 *
 * ⚠ Canonical HER DİLDE KENDİ adresini gösterir. İngilizce sayfa Türkçeyi
 * canonical gösterirse Google onu kopya sayar ve İngilizceyi indekslemez.
 */
export function dilAlternatifleri(dil: Dil, yol: string) {
  return {
    canonical: yerelYol(dil, yol),
    languages: {
      [DIL_ETIKETI.tr]: yerelYol('tr', yol),
      [DIL_ETIKETI.en]: yerelYol('en', yol),
      'x-default': yerelYol('tr', yol),
    },
  }
}
