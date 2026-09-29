import { hataMetni } from '@/lib/utils/hata-metni'
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'
import { aiKullanilabilir } from './vertex-core'
import { notuSil, notuYaz, ozet, type EditorialIs } from './editorial-core'
import { havuzIsleri, havuzuOku, type EtiketSatiri } from './editorial-havuz'
import { recapIsleri } from './editorial-recap'
import { journeyIsleri } from './editorial-journey'
import { tasteIsleri } from './editorial-taste'

/**
 * Katman D — Editoryal Motor orkestratörü (`docs/reference/rosso-ai-integration.md` §6).
 *
 * Üreticiler ayrı modüllerde, her biri bir `EditorialIs` listesi döndürür:
 *   editorial-havuz.ts   Recap kapak etiket havuzu (paylaşılan, BİR KEZ)
 *   editorial-recap.ts   Recap plaketi (3 kelime + gözlem) + kapak etiketleri
 *   editorial-journey.ts Journey yıl notu/hikâyeleri + KAPANIŞ metni
 *   editorial-taste.ts   Taste kimlik yorumları + vibe kartı açıklaması
 * Liner Notes (mood küratör notu) mood kürasyon çağrısının İÇİNDE üretilir (gemini-client.ts).
 * Üçünün ortak deposu `editorial_notes` (migration 0321/0322).
 *
 * 🔴 AI VAZGEÇİLMEZ DEĞİL: hiçbiri çalışmazsa ilgili ekran elle küratlı/deterministik
 * içeriğiyle aynen açılır. Hata hiçbir yolda dışarı sızmaz.
 *
 * 🔴 UYDURMA SAYI YASAĞI (§9 No-Slop): model yalnız GİRDİDE verilen sayıları anabilir;
 * metindeki her sayı girdide yoksa o metin ATILIR (`sayilarGirdideVar`).
 *
 * MALİYET: hash kapısı — girdi özeti değişmedikçe model ÇAĞRILMAZ. Çağrı başına ~$0,002-0,01.
 */

export { sayilarGirdideVar, kisaMetin } from './editorial-core'
export { karakterKelimeleri, recapGirdisi, etiketleriSec } from './editorial-recap'
export { journeyGirdisi, finaleGirdisi, kapanisiDogrula } from './editorial-journey'

/** Bir cron turunda en fazla kaç editoryal çağrı (cron süresini kilitlememek için). */
const TUR_BASINA_MAKS_CAGRI = 4

/** Yeni bir çağrıya başlamak için gereken en az kalan süre. */
const CAGRI_ICIN_GEREKEN_SURE_MS = 9_000

/** Tek bir çağrının süre tavanı (kapanış metni pro + düşünme bütçesiyle 20-30 sn sürer). */
const CAGRI_TAVANI_MS = 40_000

export interface EditorialResult {
  outcome: 'disabled' | 'empty' | 'success' | 'partial' | 'error'
  /** Yazılan not sayısı, türe göre. */
  yazilan: Record<string, number>
  skipped: number
  errors: number
}

/** Tur önceliği: havuz → journey → kapanış → taste → recap (kullanıcıya en görünür ve en pahalı olan önce). */
const TUR_SIRASI: Record<EditorialIs['tur'], number> = { havuz: 0, journey: 1, finale: 2, taste: 3, recap: 4 }

async function bekleyenIsler(supabase: SupabaseClient, userIds: string[]): Promise<EditorialIs[]> {
  let havuz: EtiketSatiri[] = []
  try {
    havuz = await havuzuOku(supabase)
  } catch (err) {
    void systemLog({ operation: 'editorial_pool', severity: 'warn', errorMessage: `havuz okunamadi: ${hataMetni(err)}` })
  }

  const isler: EditorialIs[] = [...havuzIsleri(supabase, havuz)]
  for (const userId of userIds) {
    // Her üretici KENDİ hatasını yutar: biri bozulunca diğerleri çalışmaya devam eder.
    const adaylar: Array<[string, () => Promise<EditorialIs[]>]> = [
      ['journey', () => journeyIsleri(supabase, userId)],
      ['taste', () => tasteIsleri(supabase, userId)],
      ['recap', () => recapIsleri(supabase, userId, havuz)],
    ]
    for (const [ad, topla] of adaylar) {
      try {
        isler.push(...(await topla()))
      } catch (err) {
        void systemLog({ operation: `editorial_${ad}`, userId, severity: 'warn', errorMessage: `aday toplanamadi: ${hataMetni(err)}` })
      }
    }
  }
  return isler.sort((a, b) => TUR_SIRASI[a.tur] - TUR_SIRASI[b.tur] || a.oncelik - b.oncelik)
}

/**
 * Editoryal tur. Cron'un sonunda, kalan bütçeyle çalışır; çoğu turda no-op.
 * Geçmiş Recap'ler ve ilk kurulum (havuz + kapanış + taste) günlere yayılarak KADEMELİ tamamlanır.
 */
export async function runEditorial(userIds: string[], kalanSureMs = 30_000): Promise<EditorialResult> {
  if (!aiKullanilabilir()) return { outcome: 'disabled', yazilan: {}, skipped: 0, errors: 0 }

  const bitis = Date.now() + Math.max(kalanSureMs, 0)
  const sonuc: EditorialResult = { outcome: 'empty', yazilan: {}, skipped: 0, errors: 0 }

  let isler: EditorialIs[]
  try {
    isler = await bekleyenIsler(await createServiceClient(), userIds)
  } catch (err) {
    void systemLog({ operation: 'editorial', severity: 'warn', errorMessage: `editoryal tur basarisiz: ${hataMetni(err)}` })
    return { ...sonuc, outcome: 'error', errors: 1 }
  }

  let cagri = 0
  for (const is of isler) {
    if (cagri >= TUR_BASINA_MAKS_CAGRI || bitis - Date.now() < CAGRI_ICIN_GEREKEN_SURE_MS) break
    // Uzun iş bu turda sığmıyorsa atla (sonraki tura kalır); kısa işler sürer.
    if (bitis - Date.now() < (is.minSureMs ?? CAGRI_ICIN_GEREKEN_SURE_MS)) continue
    cagri += 1
    const timeoutMs = Math.max(Math.min(CAGRI_TAVANI_MS, bitis - Date.now() - 1_000), 1_000)
    try {
      if (await is.uret(timeoutMs)) sonuc.yazilan[is.tur] = (sonuc.yazilan[is.tur] ?? 0) + 1
      else sonuc.skipped += 1
    } catch (err) {
      sonuc.errors += 1
      void systemLog({
        operation: `editorial_${is.tur}`,
        userId: is.userId ?? undefined,
        severity: 'warn',
        errorMessage: hataMetni(err),
      })
    }
  }

  const uretilen = Object.values(sonuc.yazilan).reduce((t, n) => t + n, 0)
  sonuc.outcome = sonuc.errors > 0 && uretilen === 0 ? 'error' : sonuc.errors > 0 ? 'partial' : uretilen === 0 ? 'empty' : 'success'
  return sonuc
}

// ── Liner Notes (mood küratör notu) ─────────────────────────────────────────

/**
 * Mood listesinin küratör notunu yazar; `not` null ise ESKİ notu siler.
 * Not, listeyle BİRLİKTE değişir: yeni liste notsuz ya da SQL fallback'iyle
 * üretildiyse eski liste için yazılmış not artık yanlış bir şey söylerdi.
 * Hata turu bozmaz (ikincil yazı).
 */
export async function kuratorNotunuKaydet(
  supabase: SupabaseClient,
  userId: string,
  moodKey: string,
  not: string | null,
  trackIds: string[] = [],
): Promise<void> {
  try {
    if (not) {
      await notuYaz(supabase, userId, 'liner_note', moodKey, { note: not }, ozet(trackIds), 'mood-v3-not')
      return
    }
    await notuSil(supabase, userId, 'liner_note', moodKey)
  } catch (err) {
    void systemLog({
      operation: 'mood_liner_note',
      userId,
      severity: 'warn',
      errorMessage: hataMetni(err),
    })
  }
}
