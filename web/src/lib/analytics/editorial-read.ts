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

const RecapKarakteri = z.object({
  words: z.array(z.string()).min(3).max(3),
  stat: z.string().nullable().optional(),
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

export async function getRecapKarakteri(userId: string, periodLabel: string): Promise<RecapKarakteriData | null> {
  const s = RecapKarakteri.safeParse(await govde('recap_character', userId, periodLabel))
  if (!s.success) return null
  return { words: s.data.words, stat: s.data.stat ?? null, tags: await etiketleriCoz(s.data.tags ?? []) }
}

// ── Journey ─────────────────────────────────────────────────────────────────

const YilSatiri = z.union([
  z.string().transform((note) => ({ note })), // 0321 biçimi: yıl → tek cümle
  z.object({
    note: z.string().optional(),
    circadian: z.string().optional(),
    comet: z.string().optional(),
    pillar: z.string().optional(),
  }),
])
const YilNotlari = z.object({ years: z.record(z.string(), YilSatiri) })

export interface JourneyYilHikayesi {
  note?: string
  circadian?: string
  comet?: string
  pillar?: string
}

/** yıl → not + üç hikâye satırı. Boş harita = AI üretmedi. */
export async function getJourneyYilNotlari(userId: string): Promise<Record<number, JourneyYilHikayesi>> {
  const s = YilNotlari.safeParse(await govde('journey_years', userId, 'all'))
  if (!s.success) return {}
  const cikti: Record<number, JourneyYilHikayesi> = {}
  for (const [yil, satir] of Object.entries(s.data.years)) {
    const y = Number(yil)
    if (Number.isInteger(y)) cikti[y] = satir
  }
  return cikti
}

const KapanisDili = z.object({
  paragraphs: z.array(z.string()).min(2).max(4),
  last_line: z.string().min(3),
})
const Kapanis = z.object({ tr: KapanisDili, en: KapanisDili.optional() })

export type JourneyKapanisi = z.infer<typeof Kapanis>

/** Journey "Yolculuk devam ediyor" kapanış metni. Yoksa null → eski iki satır. */
export async function getJourneyKapanisi(userId: string): Promise<JourneyKapanisi | null> {
  const s = Kapanis.safeParse(await govde('journey_finale', userId, 'all'))
  return s.success ? s.data : null
}

// ── Mood ────────────────────────────────────────────────────────────────────

const KuratorNotu = z.object({ note: z.string().min(3).max(200) })

export async function getKuratorNotu(userId: string, moodKey: string): Promise<string | null> {
  const s = KuratorNotu.safeParse(await govde('liner_note', userId, moodKey))
  return s.success ? s.data.note : null
}

// ── Taste ───────────────────────────────────────────────────────────────────

const TasteYorumu = z.object({
  axes: z.record(z.string(), z.string()),
  vibe: z.string().nullable().optional(),
  vibe_card: z.string().optional(),
})

export interface TasteYorumlari {
  /** kimlik kelimesi → kişiye özel yorum (Türkçe). */
  axes: Record<string, string>
  /** Vibe kartı açıklaması (İngilizce) — yalnız yorum HÂLÂ mevcut karta aitse dolu. */
  vibe: string | null
}

export async function getTasteYorumlari(userId: string, vibeCardId: string): Promise<TasteYorumlari | null> {
  const s = TasteYorumu.safeParse(await govde('taste_identity', userId, 'all'))
  if (!s.success) return null
  return {
    axes: s.data.axes,
    // Kart değiştiyse eski açıklama yeni karta yanlış şeyler söylerdi → atılır.
    vibe: s.data.vibe_card === vibeCardId ? (s.data.vibe ?? null) : null,
  }
}
