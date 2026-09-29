'use server'

import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_S, isLocale, type Locale } from './locales'

export type DilSonucu = { ok: true; data: { locale: Locale } } | { ok: false; error: string }

/**
 * Dili kalıcı seçer (onboarding'in dil adımı ve Ayarlar).
 *
 * Çerez (giriş öncesi sayfalar ve hızlı okuma) + giriş yapmışsa
 * `user_preferences.locale` (cihazlar arası, öncelikli). Çağırdıktan sonra
 * arayüz `router.refresh()` ile yeni dilde yeniden çizilir — yeniden yükleme yok.
 */
export async function setLocale(locale: string): Promise<DilSonucu> {
  if (!isLocale(locale)) return { ok: false, error: 'Unsupported language.' }

  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE_S,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  })

  const user = await getCurrentUser()
  if (user) {
    const supabase = await createClient()
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, locale }, { onConflict: 'user_id' })
    if (error) return { ok: false, error: 'Could not save your language.' }
  }

  return { ok: true, data: { locale } }
}
