/**
 * Müzikal Kimlik kelimelerinin anlamları — 2026-07-17, Sahip: "kelimeler
 * tıklanamıyor, ne anlama geldiklerini bilmiyorum." Kelime havuzu sabit ve
 * elle küratlü (bkz. migration 0035_taste_identity_rpc.sql, docs/superpowers/
 * specs/2026-07-05-taste-identity-kelimeleri-brief.md) — bu dosya LLM üretmez,
 * o havuzdaki her kelimeye tek seferlik, ritüelistik bir anlam metni bağlar.
 *
 * Üç eksen: E1 Davranış (müziği nasıl tüketir), E2 İlişki (müzikle bağı),
 * E3 Ritüel (dinleme ritmi). Metinler Rosso'nun "hatırlama" sesiyle yazıldı —
 * klinik ölçüm dili değil, kısa ve şiirsel.
 */

export interface IdentityWordMeaning {
  axis: 'Behavior' | 'Bond' | 'Ritual'
  meaning: string
}

const MEANINGS = {
  Deep: {
    axis: 'Behavior' as const,
    meaning: 'You return to a handful of songs you love, again and again — depth is your way, not breadth.',
  },
  Explorer: {
    axis: 'Behavior' as const,
    meaning: 'You keep looking for something new. Your library keeps growing; the familiar does not hold you long.',
  },
  Patient: {
    axis: 'Behavior' as const,
    meaning: 'When a song starts, you stay until the end. Listening, not skipping, is your stance.',
  },
  Skipper: {
    axis: 'Behavior' as const,
    meaning: 'If a song does not catch you, you do not wait. Your ear is selective; your time is precious.',
  },
  'In the Flow': {
    axis: 'Behavior' as const,
    meaning: 'You leave control to the shuffle. Not knowing what comes next does not bother you.',
  },
  'In Control': {
    axis: 'Behavior' as const,
    meaning: 'You decide what plays. You build the order, the moment, the transition — you do not leave it to chance.',
  },
  Loyal: {
    axis: 'Bond' as const,
    meaning: 'You are tied to the past. You have been returning to the same core for years — those songs are aging with you.',
  },
  'Come and Go': {
    axis: 'Bond' as const,
    meaning: 'Your roots are solid but the door is open. You make room for the new without letting go of the old — both live together.',
  },
  'Always Forward': {
    axis: 'Bond' as const,
    meaning: 'You keep looking for something new. You rarely look back — your music, like you, faces forward.',
  },
  Dawn: {
    axis: 'Ritual' as const,
    meaning: 'Your day begins in the morning. Music is the first sound of waking.',
  },
  Midday: {
    axis: 'Ritual' as const,
    meaning: 'You listen most in the middle of the day — the lunch break, the in-between, that is your rhythm.',
  },
  Twilight: {
    axis: 'Ritual' as const,
    meaning: 'Evening is your hour. As the day ends, the music comes in.',
  },
  'Night Owl': {
    axis: 'Ritual' as const,
    meaning: 'You listen while the city sleeps. Night is when your truest taste shows itself.',
  },
  Constant: {
    axis: 'Ritual' as const,
    meaning: 'You are not bound to a particular hour. Music walks with every part of your day equally.',
  },
}

/** Leftover Turkish keys from older taste identity RPCs. */
const TR_ALIASES: Record<string, keyof typeof MEANINGS> = {
  Derin: 'Deep',
  Keşfeden: 'Explorer',
  Sabırlı: 'Patient',
  Atlayan: 'Skipper',
  Akışta: 'In the Flow',
  Yöneten: 'In Control',
  Sadık: 'Loyal',
  'Gel Git': 'Come and Go',
  'Hep İleri': 'Always Forward',
  Şafakçı: 'Dawn',
  Günortası: 'Midday',
  Alacakaranlık: 'Twilight',
  'Gece Kuşu': 'Night Owl',
  Daimi: 'Constant',
}

export const IDENTITY_WORD_MEANINGS: Record<string, IdentityWordMeaning> = {
  ...MEANINGS,
  ...Object.fromEntries(
    Object.entries(TR_ALIASES).map(([tr, en]) => [tr, MEANINGS[en]]),
  ),
}

export function getIdentityWordMeaning(word: string): IdentityWordMeaning | null {
  return IDENTITY_WORD_MEANINGS[word] ?? null
}

/** Chip label: leftover Turkish keys render in English. */
export function displayIdentityWord(word: string): string {
  return TR_ALIASES[word] ?? word
}
