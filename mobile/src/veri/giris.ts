import type { AuthError } from '@supabase/supabase-js'

/**
 * Supabase kimlik hatalarını hikâye diline çevirir (web'in giriş metinleriyle
 * aynı ton). Davet kapısı (0359) kayıtta `auth.users` tetikleyicisinde reddeder;
 * Supabase bunu "Database error saving new user" olarak döndürür.
 */
export function girisHatasiMetni(hata: Pick<AuthError, 'message' | 'status'> | null | undefined): string | null {
  if (!hata) return null
  const m = hata.message.toLowerCase()
  if (m.includes('database error saving new user') || m.includes('kayit_kapali')) {
    return 'Kayıt yalnız davetle açık. Bu e-postayı Rosso sahibinin davet etmesi gerekiyor.'
  }
  if (m.includes('invalid login credentials')) return 'E-posta ya da şifre yanlış.'
  if (m.includes('email not confirmed')) return 'Önce e-postandaki doğrulama bağlantısına dokun.'
  if (m.includes('rate limit') || hata.status === 429) return 'Çok fazla deneme oldu. Biraz bekleyip yeniden dene.'
  if (m.includes('network') || m.includes('fetch')) return 'Sunucuya ulaşılamadı. Bağlantını kontrol et.'
  if (m.includes('password') && m.includes('6')) return 'Şifre en az 6 karakter olmalı.'
  return 'Giriş şu an olmadı. Biraz sonra yeniden dene.'
}

export function epostaGecerliMi(eposta: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta.trim())
}
