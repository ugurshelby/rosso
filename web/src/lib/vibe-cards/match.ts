import type { TasteProfile } from '@/lib/analytics/taste-profile'
import { type VibeCardId, VIBE_CARD_ORDER, pickVibeCardId } from './data'

/**
 * Vibe Kartı eşleştirme motoru — kullanıcının gerçek taste sinyallerinden
 * 10 arketipten birini seçer. (Story-Deck + Taste kimlik kartı.)
 *
 * Yaklaşım: her kartın "ideal" sinyal profili var; kullanıcının profiliyle
 * ağırlıklı benzerlik hesaplanır, en yüksek skor kazanır. Sinyaller 0..1
 * normalize; eksik sinyal (null) o eksenden puan üretmez (nötr).
 *
 * Kural tablosu docs/vision/rosso-recap-module.md'deki arketip tanımlarından
 * türetildi. Sinyal → arketip haritası buradan ayarlanır (tek otorite).
 */

/** Bir kartın ideal sinyal profili. null = o eksen kart için ilgisiz (atla). */
interface VibeSignature {
  nightOwl?: number         // 1 = gece kuşu, 0 = gündüz
  shuffleReliance?: number  // 1 = hep shuffle, 0 = niyetli sıra
  intentionality?: number   // 1 = kürasyon/niyet, 0 = pasif akış
  explorationRate?: number  // 1 = sürekli keşif, 0 = tanıdık döngü
  mainstreamNess?: number   // 1 = popüler, 0 = niş
  completionLoyalty?: number // 1 = şarkıyı bitirir, 0 = atlar
  countryDiversity?: number // 1 = çok coğrafya, 0 = tek
}

/**
 * 10 arketipin sinyal imzaları. Değerler 0..1 hedef; eşleştirme bunlara
 * yakınlığa göre yapılır. Sahip UI turunda bunları ayarlayabilir.
 */
const SIGNATURES: Record<VibeCardId, VibeSignature> = {
  // Gece + melankoli: gece kuşu, niyetli (shuffle düşük), niş
  'night-melancholist': { nightOwl: 1, shuffleReliance: 0.2, mainstreamNess: 0.25, intentionality: 0.75 },
  // Synthwave romantiği: gece, orta-popüler, tanıdık döngü sever
  'synthwave-romantic': { nightOwl: 0.8, explorationRate: 0.35, mainstreamNess: 0.55, completionLoyalty: 0.7 },
  // Alacakaranlık avcısı: akşam keşifçisi, orta shuffle, keşif yüksek, tek coğrafya
  'twilight-seeker': { nightOwl: 0.6, explorationRate: 0.8, intentionality: 0.5, countryDiversity: 0.2 },
  // Neon yolcusu: shuffle'a teslim, popüler, akışkan
  'neon-drifter': { shuffleReliance: 0.85, mainstreamNess: 0.7, intentionality: 0.2 },
  // Analog koleksiyoncusu: yüksek niyet, düşük shuffle, niş, sadık
  'analog-collector': { intentionality: 0.95, shuffleReliance: 0.1, mainstreamNess: 0.2, completionLoyalty: 0.85 },
  // Sessiz minimalist: düşük keşif, tanıdık döngü, düşük çeşitlilik
  'quiet-minimalist': { explorationRate: 0.15, countryDiversity: 0.15, intentionality: 0.6, mainstreamNess: 0.4 },
  // Ateş ruhlu: yüksek enerji — çok dinleme, popüler, hep akışta
  firehearted: { shuffleReliance: 0.6, mainstreamNess: 0.75, completionLoyalty: 0.6, explorationRate: 0.6 },
  // Anı koleksiyoncusu: tanıdık döngü, sadık, düşük keşif (nostalji)
  'memory-collector': { explorationRate: 0.1, completionLoyalty: 0.9, intentionality: 0.7, mainstreamNess: 0.45 },
  // Fırtına taşıyan: yoğun + coğrafi çeşitlilik + keşif
  stormbearer: { explorationRate: 0.75, countryDiversity: 0.85, shuffleReliance: 0.5 },
  // Işık arayıcısı: gündüz, keşifçi, açık/popüler
  'light-chaser': { nightOwl: 0, explorationRate: 0.8, mainstreamNess: 0.6, intentionality: 0.55 },
}

/** null/undefined güvenli 0..1 clamp. */
function norm(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(v)) return null
  return Math.min(1, Math.max(0, v))
}

/** TasteProfile → eşleştirmede kullanılan normalize sinyal vektörü. */
function profileSignals(p: TasteProfile): VibeSignature {
  return {
    nightOwl: p.isNightOwl == null ? undefined : p.isNightOwl ? 1 : 0,
    shuffleReliance: norm(p.shuffleReliance) ?? undefined,
    intentionality: norm(p.intentionality) ?? undefined,
    explorationRate: norm(p.explorationRate) ?? undefined,
    mainstreamNess: norm(p.mainstreamNess) ?? undefined,
    completionLoyalty: norm(p.completionLoyalty) ?? undefined,
    // countryDiversity ham sayı (0..N); 5+ ülkeyi "yüksek" say → 0..1'e sıkıştır
    countryDiversity: p.countryDiversity == null ? undefined : Math.min(1, p.countryDiversity / 5),
  }
}

const AXES: (keyof VibeSignature)[] = [
  'nightOwl', 'shuffleReliance', 'intentionality', 'explorationRate',
  'mainstreamNess', 'completionLoyalty', 'countryDiversity',
]

/**
 * Kullanıcının taste profiline en uygun Vibe Kartı'nı seçer.
 *
 * Profil yoksa/yetersizse (available=false ya da hiçbir sinyal yok) →
 * deterministik hash fallback (pickVibeCardId), böylece herkes bir kart alır.
 *
 * @param seed profil yetersizse fallback için sabit tohum (userId gibi)
 */
export function matchVibeCard(profile: TasteProfile | null, seed: string): VibeCardId {
  if (!profile || !profile.available) return pickVibeCardId(seed)

  const signals = profileSignals(profile)
  const activeAxes = AXES.filter((a) => signals[a] != null)
  if (activeAxes.length === 0) return pickVibeCardId(seed)

  let best: VibeCardId = VIBE_CARD_ORDER[0]!
  let bestScore = -Infinity

  for (const cardId of VIBE_CARD_ORDER) {
    const sig = SIGNATURES[cardId]
    let dist = 0
    let count = 0
    for (const axis of activeAxes) {
      const target = sig[axis]
      if (target == null) continue // kart bu eksenle ilgilenmiyor
      const diff = (signals[axis] as number) - target
      dist += diff * diff
      count++
    }
    if (count === 0) continue
    // Ortalama karesel mesafe → benzerlik skoru (yüksek = yakın).
    const score = -(dist / count)
    if (score > bestScore) {
      bestScore = score
      best = cardId
    }
  }

  return best
}
