import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Sabit-zamanlı sır karşılaştırması (2026-09-17 güvenlik taraması).
 *
 * `/api/cron/*` route'ları gelen Bearer token'ı `expectedSecret` ile
 * `!==` üzerinden karşılaştırıyordu — bu, karakter karakter kısa
 * devre yapan bir karşılaştırma olduğu için teorik bir zamanlama
 * yan-kanalı (timing attack) bırakır.
 *
 * `crypto.timingSafeEqual` farklı uzunluktaki buffer'larda hata fırlatır,
 * bu yüzden önce her iki tarafı SHA-256 ile sabit 32 byte'a indirgiyoruz —
 * uzunluk sızıntısı da bu şekilde ortadan kalkıyor.
 *
 * Eksik/undefined girdi her zaman `false` döner (fail closed).
 */
export function timingSafeEqualString(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false

  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()

  return timingSafeEqual(hashA, hashB)
}
