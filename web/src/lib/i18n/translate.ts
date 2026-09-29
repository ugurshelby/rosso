import { intlLocale, type Locale } from './locales'
import type { Catalog, MessageKey, PluralKey, PluralMessage } from './messages'

/**
 * Çeviri çekirdeği — SAF (I/O yok), sunucu ve istemci ortak.
 *
 * Tasarım kararları:
 *  • Anahtarlar tip güvenli (`MessageKey`): yazım hatası `tsc` hatasıdır.
 *  • Eksik anahtar çalışma zamanında İngilizce'ye düşer, o da yoksa anahtarın
 *    kendisi döner — arayüz ASLA boş/patlamış görünmez. (Derleme zamanı tip
 *    zorlaması zaten eksik TR anahtarını engeller; bu yalnız son savunma.)
 *  • Yer tutucu `{ad}`; verilmeyen yer tutucu olduğu gibi kalır (yanlış metin
 *    uydurmaktansa eksik olduğu görünür).
 *  • Çoğul: `Intl.PluralRules` — Türkçe yalnız `other` seçer (tekil/çoğul aynı).
 */

export type Params = Readonly<Record<string, string | number>>

function yaprak(catalog: Catalog, key: string): unknown {
  let cur: unknown = catalog
  for (const parca of key.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[parca]
  }
  return cur
}

/** `{ad}` yer tutucularını doldurur. */
export function interpolate(sablon: string, params?: Params): string {
  if (!params) return sablon
  return sablon.replace(/\{(\w+)\}/g, (eslesme, ad: string) =>
    Object.prototype.hasOwnProperty.call(params, ad) ? String(params[ad]) : eslesme,
  )
}

/** Şablondaki yer tutucu adları (test: TR ve EN aynı yer tutucuları taşımalı). */
export function yerTutucular(sablon: string): string[] {
  return Array.from(sablon.matchAll(/\{(\w+)\}/g), (m) => m[1] as string).sort()
}

function metinBul(catalog: PartialCatalog | undefined, key: string): string | undefined {
  if (!catalog) return undefined
  const v = yaprak(catalog as Catalog, key)
  return typeof v === 'string' ? v : undefined
}

function cogulBul(catalog: PartialCatalog | undefined, key: string): PluralMessage | undefined {
  if (!catalog) return undefined
  const v = yaprak(catalog as Catalog, key)
  if (v && typeof v === 'object' && 'one' in v && 'other' in v) return v as PluralMessage
  return undefined
}

/**
 * İstemciye yalnız SEÇİLİ yüzeyler gönderilir (paket boyutu). Eksik yüzeydeki
 * anahtar `yedek` sözlüğe (varsa), o da yoksa anahtarın kendisine düşer.
 */
export type PartialCatalog = Partial<Catalog>

export interface Translator {
  locale: Locale
  /** Düz metin. */
  t: (key: MessageKey, params?: Params) => string
  /** Çoğul metin; `count` yer tutucusu dile göre biçimlenir. */
  tp: (key: PluralKey, count: number, params?: Params) => string
}

/**
 * Sözlüğü DIŞARIDAN alan çevirici — istemci paketine tüm sözlükleri sokmamak
 * için çekirdek sözlüklere doğrudan bağlı DEĞİL. Sunucu tam sözlükle
 * (`createTranslator`, server.ts), istemci seçili yüzeylerle çağırır.
 */
export function createTranslatorFrom(
  locale: Locale,
  katalog: PartialCatalog,
  yedek?: PartialCatalog,
): Translator {
  const sayiBicimi = new Intl.NumberFormat(intlLocale(locale))
  const cogulKurali = new Intl.PluralRules(intlLocale(locale))

  return {
    locale,
    t(key, params) {
      const m = metinBul(katalog, key) ?? metinBul(yedek, key)
      if (m === undefined) {
        if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] eksik anahtar: ${key}`)
        return key
      }
      return interpolate(m, params)
    },
    tp(key, count, params) {
      const c = cogulBul(katalog, key) ?? cogulBul(yedek, key)
      if (!c) {
        if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] eksik çoğul anahtar: ${key}`)
        return key
      }
      const kategori = cogulKurali.select(count) === 'one' ? 'one' : 'other'
      return interpolate(c[kategori], { ...params, count: sayiBicimi.format(count) })
    },
  }
}
