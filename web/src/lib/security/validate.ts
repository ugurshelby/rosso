import 'server-only'
import { NextResponse } from 'next/server'
import type { z } from 'zod'

/**
 * Route'larda tekrar eden "body al → Zod ile doğrula → 422 dön" kalıbını
 * tek yere toplar. Tüm API route'ları aynı doğrulama/yanıt sözleşmesini kullanır.
 */

export type ValidationOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }

/**
 * Request gövdesini JSON olarak okur ve şemaya göre doğrular.
 * - Gövde JSON değilse veya şema uymuyorsa standart 422 yanıtı döner.
 * - Başarılıysa daraltılmış (typed) veriyi döner.
 */
export async function validateJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<ValidationOutcome<z.infer<TSchema>>> {
  const raw = await request.json().catch(() => null)
  if (raw === null) {
    return { ok: false, response: invalidInput('Geçersiz istek gövdesi.') }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, response: invalidInput('Geçersiz giriş.') }
  }

  return { ok: true, data: parsed.data }
}

/**
 * Query string parametrelerini şemaya göre doğrular.
 */
export function validateSearchParams<TSchema extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: TSchema,
): ValidationOutcome<z.infer<TSchema>> {
  const obj = Object.fromEntries(searchParams.entries())
  const parsed = schema.safeParse(obj)
  if (!parsed.success) {
    return { ok: false, response: invalidInput('Geçersiz parametre.') }
  }
  return { ok: true, data: parsed.data }
}

/** Standart 422 yanıtı — hata detayı sızdırmaz (mesaj kullanıcı dilinde). */
export function invalidInput(message = 'Geçersiz giriş.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 422 })
}
