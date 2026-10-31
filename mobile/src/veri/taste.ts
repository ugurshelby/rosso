/**
 * Taste (PLAN 4.7e, spec §9.3) saf hesapları. Kaynak: `user_taste_pkg.payload`
 * (canlıda `genres[{genre, play_count}]`, `hourly[{hour, play_count}]` 24 satır)
 * ve `user_top_strips` (`now`, `evergreen`). Analiz jargonu yok: yalnız oran ve saat.
 */
export interface TurPayi {
  tur: string
  oran: number
}

export function turPaylari(payload: unknown, enCok = 8): TurPayi[] {
  const g = payload && typeof payload === 'object' ? (payload as { genres?: unknown }).genres : null
  if (!Array.isArray(g)) return []
  const satirlar = g
    .map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => !!x && typeof x.genre === 'string')
    .map((x) => ({ tur: x.genre as string, sayi: Number(x.play_count) || 0 }))
    .filter((x) => x.sayi > 0)
  const toplam = satirlar.reduce((t, x) => t + x.sayi, 0)
  if (!toplam) return []
  return satirlar
    .sort((a, b) => b.sayi - a.sayi)
    .slice(0, enCok)
    .map((x) => ({ tur: x.tur, oran: x.sayi / toplam }))
}

/** 24 saatlik dağılım (eksik saat 0) ve en yoğun saat. */
export function saatlikDagilim(payload: unknown): { saatler: number[]; enYogun: number | null } {
  const saatler = Array.from({ length: 24 }, () => 0)
  const h = payload && typeof payload === 'object' ? (payload as { hourly?: unknown }).hourly : null
  if (Array.isArray(h)) {
    for (const x of h) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const saat = Number(o.hour)
      if (Number.isInteger(saat) && saat >= 0 && saat < 24) saatler[saat] = Number(o.play_count) || 0
    }
  }
  const enCok = Math.max(...saatler)
  return { saatler, enYogun: enCok > 0 ? saatler.indexOf(enCok) : null }
}

export const yuzdeMetni = (oran: number) => `%${Math.round(oran * 100)}`
