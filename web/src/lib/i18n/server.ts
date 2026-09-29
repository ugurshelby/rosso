import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from './locales'
import { createTranslator } from './full'
import type { Translator } from './translate'

/**
 * Sunucu tarafı dil çözümleme.
 *
 * SIRA: giriş yapmış kullanıcının kayıtlı tercihi (`user_preferences.locale`)
 *       → `rosso-locale` çerezi → `Accept-Language` → 'en'.
 *
 * Kayıtlı tercih ÇEREZDEN önce: kullanıcı cihaz A'da dili değiştirdiyse cihaz
 * B'nin bayat çerezi kazanmamalı. Bedel: giriş yapmış her istekte tek, indeksli
 * satır sorgusu (`cache()` ile istek başına BİR) — layout zaten çok daha ağır
 * sorgular çalıştırıyor.
 *
 * ⚠ Dil çerezi işlevsel bir tercihtir (çerez rızası banner'ındaki analitik
 *   ölçümüne tabi DEĞİL; kullanıcı bunu kendisi seçer ve arayüz onsuz çalışmaz).
 */

/** Kayıtlı tercih; hiç seçilmemişse `null` (onboarding dil adımı gösterilir). */
export const getStoredLocale = cache(async (userId: string): Promise<Locale | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_preferences')
    .select('locale')
    .eq('user_id', userId)
    .maybeSingle()
  return isLocale(data?.locale) ? data.locale : null
})

async function tarayiciTercihi(): Promise<Locale | null> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(c)) return c
  return localeFromAcceptLanguage((await headers()).get('accept-language'))
}

/** Bu istek için geçerli dil. */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUser()
  if (user) {
    const kayitli = await getStoredLocale(user.id)
    if (kayitli) return kayitli
  }
  return (await tarayiciTercihi()) ?? DEFAULT_LOCALE
})

/** Sunucu bileşenleri için çevirici: `const { t, tp, locale } = await getT()`. */
export const getT = cache(async (): Promise<Translator> => createTranslator(await getLocale()))

export interface DilDurumu {
  /** Şu an geçerli dil. */
  locale: Locale
  /** Kullanıcı dilini AÇIKÇA seçti mi? `false` → onboarding dil adımı zorunlu ilk adım. */
  secildi: boolean
  /** Dil adımında önerilecek dil (çerez → tarayıcı dili → 'en'). */
  onerilen: Locale
}

/** Onboarding dil adımı için durum. */
export async function getDilDurumu(userId: string): Promise<DilDurumu> {
  const kayitli = await getStoredLocale(userId)
  const onerilen = (await tarayiciTercihi()) ?? DEFAULT_LOCALE
  return { locale: kayitli ?? onerilen, secildi: kayitli !== null, onerilen }
}
