import 'server-only'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Editoryal notların (Katman D, `editorial_notes` — migration 0321/0322) OKUMA yüzü.
 *
 * Kullanıcı-bağlamlı istemci: tabloda RLS "yalnız kendi satırların" politikası
 * var, yani `userId` yanlış verilse bile başkasının notu dönmez.
 *
 * 🔴 AI'SIZ DA EKRAN TAM: not yoksa / bozuksa / okuma hata verirse `null` (ya da
 * boş harita) döner; çağıran elle küratlı yedeği çizer. Hiçbir yol sayfayı düşürmez.
 */

type Tur = 'recap_character' | 'journey_years' | 'liner_note' | 'taste_identity' | 'journey_finale'

/** Arayüz dili — AI metinleri bu dilde okunur. */
export type Dil = 'tr' | 'en'

async function govde(kind: Tur, userId: string, scope: string): Promise<unknown> {
  try {
    const supabase = await createClient()
    const { data, error } = await (
      supabase.from as unknown as (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: string) => {
                maybeSingle: () => Promise<{ data: { body: unknown } | null; error: unknown }>
              }
            }
          }
        }
      }
    )('editorial_notes')
      .select('body')
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('scope', scope)
      .maybeSingle()
    if (error || !data) return null
    return data.body
  } catch {
    return null
  }
}

// ── Recap ───────────────────────────────────────────────────────────────────

const UcKelime = z.array(z.string()).min(3).max(3)
/** v5+ (2026-10-04): kelime ve istatistik iki dilli. Eski biçim (düz dizi/metin) İngilizceydi. */
const RecapKarakteri = z.object({
  words: z.union([UcKelime, z.object({ tr: UcKelime.optional(), en: UcKelime.optional() })]),
  stat: z.union([z.string(), z.object({ tr: z.string().optional(), en: z.string().optional() })]).nullable().optional(),
  tags: z.array(z.string()).max(8).optional(),
})

export interface RecapEtiketi {
  slug: string
  tr: string
  en: string
}

export interface RecapKarakteriData {
  words: string[]
  stat: string | null
  /** Kapak etiketleri — havuzdan seçilmiş, iki dilli. Havuz/seçim yoksa boş. */
  tags: RecapEtiketi[]
}

async function etiketleriCoz(slugs: string[]): Promise<RecapEtiketi[]> {
  if (slugs.length === 0) return []
  try {
    const supabase = await createClient()
    const { data, error } = await (
      supabase.from as unknown as (t: string) => {
        select: (c: string) => {
          in: (c: string, v: string[]) => Promise<{
            data: Array<{ slug: string; label_tr: string; label_en: string }> | null
            error: unknown
          }>
        }
      }
    )('editorial_tag_pool')
      .select('slug, label_tr, label_en')
      .in('slug', slugs)
    if (error || !data) return []
    const harita = new Map(data.map((r) => [r.slug, r]))
    // Seçim sırası (kategori sırası) korunur; havuzdan silinmiş slug sessizce düşer.
    return slugs.flatMap((s) => {
      const r = harita.get(s)
      return r ? [{ slug: s, tr: r.label_tr, en: r.label_en }] : []
    })
  } catch {
    return []
  }
}

export async function getRecapKarakteri(
  userId: string,
  periodLabel: string,
  locale: Dil = 'tr',
): Promise<RecapKarakteriData | null> {
  const s = RecapKarakteri.safeParse(await govde('recap_character', userId, periodLabel))
  if (!s.success) return null
  const words = Array.isArray(s.data.words) ? (locale === 'en' ? s.data.words : null) : (s.data.words[locale] ?? null)
  // Seçili dilde kelime yoksa karakter hiç gösterilmez (kapanış kartı eskisi gibi).
  if (!words) return null
  const st = s.data.stat
  const stat = st == null ? null : typeof st === 'string' ? (locale === 'en' ? st : null) : (st[locale] ?? null)
  return { words, stat, tags: await etiketleriCoz(s.data.tags ?? []) }
}

// ── Journey ─────────────────────────────────────────────────────────────────

const YilDili = z.object({ note: z.string().optional(), story: z.string().optional() })
/** v6+ (2026-10-04): yıl → { tr?, en? }. Eski biçimler (tek cümle / note+circadian…) İngilizceydi. */
const YilSatiri = z.union([
  z.object({ tr: YilDili.optional(), en: YilDili.optional() }).refine((v) => v.tr || v.en),
  z.string().transform((note) => ({ en: { note } })),
  z.object({ note: z.string().optional() }).passthrough().transform((v) => ({ en: { note: v.note } })),
])
const YilNotlari = z.object({ years: z.record(z.string(), YilSatiri) })

export interface JourneyYilHikayesi {
  note?: string
  story?: string
}

/** yıl → seçili dildeki not + eşlikçi hikâyesi. O dilde metin yoksa yıl haritada YOK (yanlış dil gösterilmez). */
export async function getJourneyYilNotlari(userId: string, locale: Dil = 'tr'): Promise<Record<number, JourneyYilHikayesi>> {
  const s = YilNotlari.safeParse(await govde('journey_years', userId, 'all'))
  if (!s.success) return {}
  const cikti: Record<number, JourneyYilHikayesi> = {}
  for (const [yil, satir] of Object.entries(s.data.years)) {
    const y = Number(yil)
    const dil = (satir as { tr?: JourneyYilHikayesi; en?: JourneyYilHikayesi })[locale]
    if (Number.isInteger(y) && dil && (dil.note || dil.story)) cikti[y] = dil
  }
  return cikti
}

const KapanisDili = z.object({
  paragraphs: z.array(z.string()).min(2).max(4),
  last_line: z.string().min(3),
})
const Kapanis = z.object({ tr: KapanisDili.optional(), en: KapanisDili.optional() })

export type JourneyKapanisi = z.infer<typeof Kapanis>

/** Journey kapanış metni (iki dil). Yoksa null → eski iki satır. Arayüz seçili dili seçer. */
export async function getJourneyKapanisi(userId: string): Promise<JourneyKapanisi | null> {
  const s = Kapanis.safeParse(await govde('journey_finale', userId, 'all'))
  return s.success && (s.data.tr || s.data.en) ? s.data : null
}

// ── Mood ────────────────────────────────────────────────────────────────────

const KuratorNotu = z.object({
  /** Türkçe not (v3'ten beri hep Türkçe). */
  note: z.string().min(3).max(200).optional(),
  /** İngilizce not (v4, 2026-10-04). */
  note_en: z.string().min(3).max(200).optional(),
})

/** Mood küratör notu seçili dilde; o dilde yoksa null (yanlış dilde not gösterilmez). */
export async function getKuratorNotu(userId: string, moodKey: string, locale: Dil = 'tr'): Promise<string | null> {
  const s = KuratorNotu.safeParse(await govde('liner_note', userId, moodKey))
  if (!s.success) return null
  return (locale === 'en' ? s.data.note_en : s.data.note) ?? null
}

// ── Taste ───────────────────────────────────────────────────────────────────

const IkiDilMetin = z.union([
  z.object({ tr: z.string().optional(), en: z.string().optional() }),
  z.string(),
])
const TasteYorumu = z.object({
  axes: z.record(z.string(), IkiDilMetin),
  vibe: IkiDilMetin.nullable().optional(),
  vibe_card: z.string().optional(),
})

export interface TasteYorumlari {
  /** kimlik kelimesi → kişiye özel yorum (seçili dilde). */
  axes: Record<string, string>
  /** Vibe kartı açıklaması (seçili dilde) — yalnız yorum HÂLÂ mevcut karta aitse dolu. */
  vibe: string | null
}

/** İki dilli metinden seçili dili al. Eski (v2) biçimde düz metin: eksenler Türkçe, vibe İngilizceydi. */
function dildeki(v: z.infer<typeof IkiDilMetin> | null | undefined, locale: Dil, duzMetinDili: Dil): string | null {
  if (v == null) return null
  if (typeof v === 'string') return locale === duzMetinDili ? v : null
  return v[locale] ?? null
}

export async function getTasteYorumlari(userId: string, vibeCardId: string, locale: Dil = 'tr'): Promise<TasteYorumlari | null> {
  const s = TasteYorumu.safeParse(await govde('taste_identity', userId, 'all'))
  if (!s.success) return null
  const axes: Record<string, string> = {}
  for (const [kelime, metin] of Object.entries(s.data.axes)) {
    const m = dildeki(metin, locale, 'tr')
    if (m) axes[kelime] = m
  }
  return {
    axes,
    // Kart değiştiyse eski açıklama yeni karta yanlış şeyler söylerdi → atılır.
    vibe: s.data.vibe_card === vibeCardId ? dildeki(s.data.vibe, locale, 'en') : null,
  }
}
