import type { Locale } from '../locales'
import { en } from './en'
import { tr } from './tr'
import type { Catalog } from './types'

export type { Catalog, MessageKey, PluralKey, PluralMessage, Namespace } from './types'

export const catalogs: Record<Locale, Catalog> = { en, tr }
