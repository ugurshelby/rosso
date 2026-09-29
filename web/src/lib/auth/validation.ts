import { z } from 'zod'

/** Giriş/kayıt için ortak alanlar. */
export const emailSchema = z.string().trim().email('Enter a valid email.')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, 'Enter a display name.'),
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Form alanlarını doğrular; ilk hatayı kullanıcı diline döner.
 * Geçerliyse `{ ok: true, data }`, değilse `{ ok: false, error }`.
 */
export function validateRegister(
  input: unknown
): { ok: true; data: RegisterInput } | { ok: false; error: string } {
  const result = registerSchema.safeParse(input)
  if (result.success) {
    return { ok: true, data: result.data }
  }
  return { ok: false, error: result.error.issues[0]?.message ?? 'Invalid details.' }
}

/**
 * Open redirect koruması: `next` yalnızca aynı-origin göreli yol ise kabul edilir.
 * `//evil.com`, `/\evil.com`, `https://evil.com` gibi dış/protokol-bağıl
 * hedefler reddedilir ve güvenli varsayılana (`/dashboard`) düşülür.
 */
export function safeNextPath(raw: string | null | undefined): string {
  const fallback = '/dashboard'
  if (!raw) return fallback
  // Tek '/' ile başlamalı; '//' ve '/\' protokol-bağıl/şema kaçışlarıdır.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback
  }
  return raw
}
