/**
 * Test profili / sentetik hesap kontrolü.
 * test-fixtures/ üzerinden üretilen profiller @rosso-test.local uzantılı e-posta
 * veya is_test=true meta verisi taşır.
 */
export function isTestUser(user: {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
} | null | undefined): boolean {
  if (!user) return false
  if (user.user_metadata?.is_test === true) return true
  if (user.email && user.email.toLowerCase().endsWith('@rosso-test.local')) return true
  return false
}
