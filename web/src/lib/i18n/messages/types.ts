import type { en } from './en'

/** Çoğul biçimli sözlük yaprağı. Türkçe de `one`/`other` verir (ikisi aynı olabilir). */
export interface PluralMessage {
  one: string
  other: string
}

/** Yaprakları `string` (ya da `PluralMessage`) olan, İngilizce yapının birebir şekli. */
type DeepShape<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends { readonly one: string; readonly other: string }
      ? PluralMessage
      : DeepShape<T[K]>
}

/** Her dilin sözlüğü bu şekle UYMAK zorunda — eksik/fazla anahtar `tsc` hatasıdır. */
export type Catalog = DeepShape<typeof en>

type Leaf<T, P extends string> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends { readonly one: string; readonly other: string }
      ? never
      : Leaf<T[K], `${P}${K}.`>
}[keyof T & string]

type PluralLeaf<T, P extends string> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends { readonly one: string; readonly other: string }
      ? `${P}${K}`
      : PluralLeaf<T[K], `${P}${K}.`>
}[keyof T & string]

/** `t()` anahtarları: yalnız düz metin yaprakları (yazım hatası derlemede yakalanır). */
export type MessageKey = Leaf<typeof en, ''>
/** `tp()` anahtarları: yalnız çoğul yaprakları. */
export type PluralKey = PluralLeaf<typeof en, ''>
/** Sözlüğün üst düzey yüzeyleri (istemciye seçilerek gönderilir). */
export type Namespace = keyof Catalog
