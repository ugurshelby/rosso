import 'server-only'

import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AI_MODELS } from './vertex-core'

/**
 * Katman D ortak zemin — `editorial_notes` deposu, hash kapısı, metin denetimleri.
 * Üreticiler (`editorial-*.ts`) yalnız kendi prompt'unu ve girdisini bilir; kalanı burada.
 *
 * 🔴 AI VAZGEÇİLMEZ DEĞİL ve 🔴 UYDURMA SAYI YASAĞI için bkz. `editorial.ts` başlığı.
 */

export type Kayit = Record<string, unknown>
export const nesne = (x: unknown): Kayit => (x && typeof x === 'object' ? (x as Kayit) : {})
export const dizi = (x: unknown): Kayit[] => (Array.isArray(x) ? x.map(nesne) : [])

export type EditorialKind =
  | 'recap_character'
  | 'journey_years'
  | 'liner_note'
  | 'taste_identity'
  | 'journey_finale'

/** Bir cron turunda yürütülecek TEK model çağrısı. */
export interface EditorialIs {
  /** Loglama/sayaç etiketi. */
  tur: 'havuz' | 'journey' | 'finale' | 'taste' | 'recap'
  userId: string | null
  scope: string
  /** Küçük = önce. */
  oncelik: number
  /**
   * Bu işe BAŞLAMAK için gereken en az kalan süre (ms). Varsayılan: küçük çağrı eşiği.
   * Uzun çağrılar (kapanış: pro + düşünme ≈ 20-30 sn) yetersiz süreyle başlayıp
   * zaman aşımına düşmesin diye kendi eşiğini taşır; süre yetmiyorsa atlanır, sonraki
   * tura kalır ve daha küçük işler çalışmaya devam eder.
   */
  minSureMs?: number
  /**
   * Çağrıyı yapar, doğrular, yazar. `true` = not yazıldı; `false` = model/doğrulama
   * sonuç vermedi (atlandı). Hata FIRLATABİLİR — çağıran sayar ve loglar.
   */
  uret: (timeoutMs: number) => Promise<boolean>
}

// ── Metin denetimleri (saf, test edilir) ────────────────────────────────────

/**
 * Metindeki sayı belirteçleri. Binlik ayracı normalleşir ("1.311" / "1,311" → "1311");
 * Türkçe yazımla İngilizce yazım aynı sayıyı verir. Ondalık nokta/virgül → nokta.
 */
function sayilar(metin: string): string[] {
  return (metin.match(/\d+(?:[.,]\d+)*/g) ?? []).map((s) => {
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return s.replace(/[.,]/g, '')
    return s.replace(',', '.')
  })
}

/**
 * `metin` içindeki HER sayı `girdi` içinde geçiyor mu? Sayı içermeyen metin geçer.
 * Girdi de aynı normalleştirmeden geçer ("1311" ↔ "1.311").
 */
export function sayilarGirdideVar(metin: string, girdi: string): boolean {
  const kaynak = new Set(sayilar(girdi))
  return sayilar(metin).every((s) => kaynak.has(s))
}

/** Ekrana çıkacak kısa metin: tek satır, ünlemsiz, sınırlı uzunlukta; olmuyorsa null. */
export function kisaMetin(ham: string | undefined, azami: number): string | null {
  if (!ham) return null
  const t = ham.replace(/\s+/g, ' ').trim()
  if (t.length < 3 || t.length > azami || t.includes('!')) return null
  return t
}

export function ozet(girdi: unknown): string {
  return createHash('sha256').update(JSON.stringify(girdi)).digest('hex').slice(0, 32)
}

// ── Depo ────────────────────────────────────────────────────────────────────

export interface MevcutNot {
  hash: string
  uretildi: number
}

type SecimSonucu = {
  data: Array<{ scope: string; input_hash: string; generated_at: string }> | null
  error: { message: string } | null
}

/** `editorial_notes` üretilmiş tiplerde yok; dar bir yüzeyle sarılır. */
function tablo(supabase: SupabaseClient) {
  return supabase.from('editorial_notes' as never) as unknown as {
    select: (c: string) => {
      eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<SecimSonucu> }
    }
    upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>
    delete: () => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<unknown> }
      }
    }
  }
}

export async function notuYaz(
  supabase: SupabaseClient,
  userId: string,
  kind: EditorialKind,
  scope: string,
  body: Kayit,
  inputHash: string,
  promptVersion: string,
  model: string = AI_MODELS.curation,
): Promise<void> {
  const { error } = await tablo(supabase).upsert(
    {
      user_id: userId,
      kind,
      scope,
      body,
      input_hash: inputHash,
      model,
      prompt_version: promptVersion,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,kind,scope' },
  )
  if (error) throw new Error(error.message)
}

export async function notuSil(supabase: SupabaseClient, userId: string, kind: EditorialKind, scope: string): Promise<void> {
  await tablo(supabase).delete().eq('user_id', userId).eq('kind', kind).eq('scope', scope)
}

export async function mevcutNotlar(
  supabase: SupabaseClient,
  userId: string,
  kind: EditorialKind,
): Promise<Map<string, MevcutNot>> {
  const { data, error } = await tablo(supabase)
    .select('scope, input_hash, generated_at')
    .eq('user_id', userId)
    .eq('kind', kind)
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((r) => [r.scope, { hash: r.input_hash, uretildi: Date.parse(r.generated_at) }]))
}
