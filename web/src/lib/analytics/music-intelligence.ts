import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'

/**
 * Kullanıcının müzik zekâsı profilinin (Katman B, migration 0315) ekrana
 * çıkan kısmı: dinleme notu (`musical_paradox`) ve sonik yakınlıklar.
 *
 * 🔴 GÜVENLİK SÖZLEŞMESİ: `userId` YALNIZ doğrulanmış oturumdan gelmeli
 * (`requireAuth()` / `apiAuth()`), asla istek parametresinden. Service client
 * kullanılıyor çünkü mobil istemci cookie değil Bearer token taşıyor ve
 * kullanıcı-bağlamlı istemci o durumda RLS altında boş dönerdi; bu yüzden
 * kullanıcı sınırını `eq('user_id', userId)` + yukarıdaki sözleşme çiziyor.
 *
 * AI'SIZ DA SAYFA TAM: profil yoksa ya da AI hiç çalışmadıysa `null` döner ve
 * bileşen hiçbir şey çizmez — Taste sayfasının geri kalanı deterministik.
 */

export interface DinlemeNotu {
  /** Tek cümlelik editoryal gözlem (Türkçe). */
  not: string
  /** Sonik doku kelimeleri — en fazla 6. */
  dokular: string[]
  /** Profilin üretildiği an (ISO). */
  uretildi: string
}

/** Ekranda gösterilecek en fazla doku kelimesi. */
const EN_FAZLA_DOKU = 6

export async function getDinlemeNotu(userId: string): Promise<DinlemeNotu | null> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('user_music_intelligence')
      .select('musical_paradox, sonic_affinities, ai_generated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return null

    const not = data.musical_paradox?.trim()
    if (!not || !data.ai_generated_at) return null

    return {
      not,
      dokular: (data.sonic_affinities ?? [])
        .map((d) => d.trim())
        .filter(Boolean)
        .slice(0, EN_FAZLA_DOKU),
      uretildi: data.ai_generated_at,
    }
  } catch {
    // Bu bölüm ikincil — okunamazsa sayfa onsuz çizilir.
    return null
  }
}
