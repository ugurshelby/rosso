import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AI_MODELS, callVertexJson } from './vertex-core'
import { ozet, type EditorialIs } from './editorial-core'

/**
 * Recap kapak ETİKET HAVUZU (Katman D, migration 0322 `editorial_tag_pool`).
 *
 * Sahip: "önceden hazırlanmış, TR+EN, tür / mood / tempo / karakter / dönem
 * vibe'ı gibi tarif edilebilecek spesifik bir etiket havuzu, BİR KEZ üretilir;
 * tüm kullanıcılar bu havuzdan kullanır; her recap için AI havuzdan SEÇER."
 *
 * Bu yüzden recap başına serbest metin ÜRETİLMEZ: model yalnız numaralı havuzdan
 * sıra numarası döndürür (mood kürasyonundaki indeks eşlemesiyle aynı sağlamlık —
 * halüsinasyon yapısal olarak imkânsız), etiketin iki dili de önceden hazırdır.
 */

export const KATEGORILER = ['genre', 'mood', 'tempo', 'character', 'period'] as const
export type EtiketKategori = (typeof KATEGORILER)[number]

const PROMPT_VERSION = 'etiket-havuzu-v2'
const FEATURE = 'editorial_tag_pool'
const GUNLUK_TAVAN = 12

/** Bir kategori "hazır" sayılmak için asgari etiket sayısı. */
export const KATEGORI_ASGARI = 10

const KATEGORI_TARIFI: Record<EtiketKategori, { adet: number; tarif: string; ornek: string }> = {
  genre: {
    adet: 36,
    tarif:
      'Music genres and scenes a listening period can be defined by (broad and sub-genres: e.g. hip-hop, indie rock, synth-pop, arabesk, trap, lo-fi, shoegaze). Real, recognisable genre names only.',
    ornek: '"Boom Bap", "Dream Pop"',
  },
  mood: {
    adet: 36,
    tarif:
      'The emotional colour or atmosphere of the music (melancholic, euphoric, restless, tender, defiant, nostalgic, hazy…). Feelings and atmospheres, never genres.',
    ornek: '"Hazy", "Defiant"',
  },
  tempo: {
    adet: 12,
    tarif:
      'The pace and energy of the listening (slow-burn, mid-tempo, driving, frantic, steady-pulse, downtempo…). About speed and drive, not feelings.',
    ornek: '"Slow Burn", "Driving"',
  },
  character: {
    adet: 30,
    tarif:
      'The character of the LISTENER in that period — a temperament, habit or ritual (night owl, loyalist, wanderer, completionist, obsessive, explorer, creature of habit…).',
    ornek: '"Night Owl", "Completionist"',
  },
  period: {
    adet: 30,
    tarif:
      'The vibe of the PERIOD as a stretch of life (a season of change, a quiet chapter, an all-in phase, a reset, a comeback, a deep-dive era…). Time-and-life colours, not music terms.',
    ornek: '"Fresh Start", "Deep Dive Era"',
  },
}

const HavuzSemasi = z.object({
  tags: z.array(z.object({ en: z.string(), tr: z.string() })),
})

export interface EtiketSatiri {
  slug: string
  category: EtiketKategori
  label_en: string
  label_tr: string
}

/** İngilizce etiketten kararlı, ASCII slug ("Boom Bap" → "boom-bap"). */
export function etiketSlug(en: string): string {
  return en
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Modelin ürettiği ham çiftleri doğrular: uzunluk, ünlem, TR≠boş, benzersiz slug. */
export function havuzuTemizle(
  category: EtiketKategori,
  ham: Array<{ en: string; tr: string }>,
  mevcutSluglar: ReadonlySet<string> = new Set(),
  mevcutTr: readonly string[] = [],
): EtiketSatiri[] {
  const gorulen = new Set(mevcutSluglar)
  // Türkçe etiket de kategori içinde benzersiz olmalı (ör. iki farklı İngilizce → "Cesur").
  const trGorulen = new Set<string>(mevcutTr)
  const cikti: EtiketSatiri[] = []
  for (const h of ham) {
    const en = h.en.replace(/\s+/g, ' ').trim()
    const tr = h.tr.replace(/\s+/g, ' ').trim()
    const slug = etiketSlug(en)
    const uygun = (s: string) => s.length >= 2 && s.length <= 22 && !s.includes('!') && !/\d/.test(s)
    const trAnahtar = tr.toLocaleLowerCase('tr-TR')
    if (!slug || !uygun(en) || !uygun(tr) || /^the /i.test(en) || gorulen.has(slug) || trGorulen.has(trAnahtar)) continue
    gorulen.add(slug)
    trGorulen.add(trAnahtar)
    cikti.push({ slug, category, label_en: en, label_tr: tr })
  }
  return cikti
}

function havuzPrompt(category: EtiketKategori, mevcutEn: string[]): string {
  const k = KATEGORI_TARIFI[category]
  return `You are building a shared vocabulary of short labels for personal music "recap" covers. Each listening period (a month or a year) will be described by one label from each category.

CATEGORY: ${category}
MEANING: ${k.tarif}

TASK: Produce ${k.adet} DISTINCT labels for this category. For every label give:
- en: the English label, 1-3 words, max 20 characters, Title Case. Example of the format: ${k.ornek}.
- tr: its natural Turkish counterpart — a phrase a native speaker would actually say, NOT a literal word-for-word translation. Same length rules. Genre names that Turkish speakers use as-is (Drum & Bass, Dream Pop, Country, Disco, Lo-Fi…) stay EXACTLY the same in Turkish — never add words like "Müzik"/"Müziği" and never translate them literally. Every Turkish label must be different from the others in this category.

Rules: labels are bare noun phrases WITHOUT an article (write "Night Owl", never "The Night Owl"); specific and evocative, not generic filler; no artist names, no song titles, no emojis, no exclamation marks, no digits; labels within the category must be clearly different from each other.${
    mevcutEn.length ? `\nALREADY IN THE POOL (do not repeat or paraphrase): ${mevcutEn.join(', ')}` : ''
  }`
}

/** Havuzdaki tüm etiketler (okuma — kişisel veri yok). */
export async function havuzuOku(supabase: SupabaseClient): Promise<EtiketSatiri[]> {
  const { data, error } = await (
    supabase.from as unknown as (t: string) => {
      select: (c: string) => Promise<{ data: EtiketSatiri[] | null; error: { message: string } | null }>
    }
  )('editorial_tag_pool').select('slug, category, label_en, label_tr')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Havuzun parmak izi — havuz değişirse recap'ler yeniden seçim yapsın. */
export function havuzOzeti(havuz: readonly EtiketSatiri[]): string {
  return ozet(havuz.map((h) => h.slug).sort())
}

/** Her kategori asgariyi geçti mi? Geçmediyse recap etiket SEÇMEZ. */
export function havuzHazirMi(havuz: readonly EtiketSatiri[]): boolean {
  return KATEGORILER.every((k) => havuz.filter((h) => h.category === k).length >= KATEGORI_ASGARI)
}

/** Eksik kategori başına TEK iş; havuz tamamsa boş döner (çoğu tur no-op). */
export function havuzIsleri(supabase: SupabaseClient, havuz: readonly EtiketSatiri[]): EditorialIs[] {
  return KATEGORILER.filter((k) => havuz.filter((h) => h.category === k).length < KATEGORI_ASGARI).map(
    (kategori, sira) => ({
      tur: 'havuz' as const,
      userId: null,
      scope: kategori,
      oncelik: sira,
      uret: async (timeoutMs: number) => {
        const mevcut = havuz.filter((h) => h.category === kategori)
        const r = await callVertexJson({
          feature: FEATURE,
          model: AI_MODELS.curation,
          promptVersion: PROMPT_VERSION,
          prompt: havuzPrompt(kategori, mevcut.map((m) => m.label_en)),
          sema: HavuzSemasi,
          maxOutputTokens: 4000,
          gunlukTavan: GUNLUK_TAVAN,
          timeoutMs,
        })
        if (!r) return false

        const temiz = havuzuTemizle(
          kategori,
          r.data.tags,
          new Set(havuz.map((h) => h.slug)),
          mevcut.map((m) => m.label_tr.toLocaleLowerCase('tr-TR')),
        )
        if (temiz.length < KATEGORI_ASGARI - mevcut.length) return false

        const { error } = await (
          supabase.from as unknown as (t: string) => {
            upsert: (
              rows: Array<Record<string, unknown>>,
              o: { onConflict: string; ignoreDuplicates: boolean },
            ) => Promise<{ error: { message: string } | null }>
          }
        )('editorial_tag_pool').upsert(
          temiz.map((t) => ({
            slug: t.slug,
            category: t.category,
            label_en: t.label_en,
            label_tr: t.label_tr,
            model: AI_MODELS.curation,
            prompt_version: PROMPT_VERSION,
          })),
          { onConflict: 'slug', ignoreDuplicates: true },
        )
        if (error) throw new Error(error.message)
        return true
      },
    }),
  )
}
