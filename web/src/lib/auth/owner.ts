/**
 * Çok kullanıcılı Rosso — Sistem Sahibi / Admin yardımcıları.
 *
 * `OWNER_EMAIL` ortam değişkeni sistem yöneticisini belirler (büyük/küçük harf duyarsız).
 * Çok kullanıcılı mimaride bu kilit artık genel kullanıcıların girişini ENGELLEMEZ.
 * Yalnızca özel admin yetkisi kontrolleri için kullanılır.
 */

export function ownerEmail(raw = process.env.OWNER_EMAIL): string {
  const fromEnv = (raw ?? '').trim().toLowerCase()
  if (fromEnv) return fromEnv
  return ''
}

/**
 * Çok kullanıcılı mimaride kişisel sahip kilidi artık aktif değildir.
 * Geriye dönük uyumluluk için fonksiyon korunur ve false döner.
 */
export function ownerLockActive(): boolean {
  return false
}

export function emailsMatch(
  a: string | null | undefined,
  b: string,
): boolean {
  return (a ?? '').trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Bu kullanıcı sistem sahibi / admin mi?
 * Yalnızca admin paneli / özel sistem işlevleri için kontrol sağlar.
 */
export function isOwner(
  user: { email?: string | null },
  owner = ownerEmail(),
): boolean {
  if (!owner) return false
  return emailsMatch(user.email, owner)
}
