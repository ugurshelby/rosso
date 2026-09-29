/*
 * ⚠ ÖLÜ KOD (ölçüldü 2026-08-22, refine turu 4) — hiçbir yerden import
 * edilmiyor. `RecapJourneyScroll` kendi kaydırma mantığını içeriyor.
 *
 * SİLİNMEDİ: dosya silme ayrı onay ister (CLAUDE.md §6). Sahip
 * onaylarsa bu dosya kaldırılabilir.
 */
/**
 * Scroll progress (0→1) → katman değerleri. Doğrusal scrub; snap yok.
 */

export const SCRUB_DEPTH = {
  visual: 22,
  copy: 12,
  orb: 40,
} as const

export function timelineIndex(progress: number, steps: number): number {
  return progress * steps
}

/** Sahne i için 0→1 görünürlük — komşu sahnelerle sürekli crossfade. */
export function scenePresence(progress: number, index: number, steps: number): number {
  const t = timelineIndex(progress, steps)
  return Math.max(0, 1 - Math.abs(t - index))
}

/** scenePresence + smoothstep — scroll geçişlerinde daha yumuşak crossfade. */
export function smoothScenePresence(progress: number, index: number, steps: number): number {
  const raw = scenePresence(progress, index, steps)
  return raw * raw * (3 - 2 * raw)
}

/** Yakın sahneleri önceden mount etmek için (performans). */
export function sceneMountWindow(progress: number, index: number, steps: number, radius = 1): boolean {
  const center = timelineIndex(progress, steps)
  return Math.abs(center - index) <= radius + 0.35
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export type LayerMotion = {
  presence: number
  opacity: number
  y: number
  scale: number
  x: number
}

export function layerMotion(
  progress: number,
  index: number,
  steps: number,
  depth: number,
  yLift = 32,
): LayerMotion {
  const presence = scenePresence(progress, index, steps)
  const drift = timelineIndex(progress, steps) - index

  return {
    presence,
    opacity: presence,
    y: lerp(yLift, 0, presence) + drift * depth * 0.22,
    scale: lerp(0.93, 1, presence),
    x: drift * depth * 0.45,
  }
}

/* ── A-FAZ 0.3 (2026-08-02) — E7: "scroll animasyonu soluk crossfade" ──
   `layerMotion` sahneleri simetrik hareket ettiriyor: `y` hem çıkışta hem
   girişte aynı yönde ilerliyor, sonuç gözde iki görüntünün üst üste
   solmasından ibaret kalıyor.

   Sinema dili yönlüdür: giden sahne YUKARI kayarak solar, gelen sahne
   ALTTAN yükselir. Aşağıdaki üç fonksiyon bunu ayrıştırır. Saf (pure) —
   test edilebilir, React'e bağlı değil. */

/** Sahnenin zaman çizgisindeki işaretli uzaklığı: <0 gelecek, >0 geçmiş. */
function sceneDrift(progress: number, index: number, steps: number): number {
  return timelineIndex(progress, steps) - index
}

/**
 * Giden sahnenin dikey kaçışı (px, negatif = yukarı).
 * Sahne geçmişte kaldıkça (`drift > 0`) yukarı süzülür. Henüz gelmemişse 0 —
 * çıkış hareketi yalnız çıkarken uygulanır.
 */
export function sceneExitY(
  progress: number,
  index: number,
  steps: number,
  distance = 64,
): number {
  const drift = sceneDrift(progress, index, steps)
  if (drift <= 0) return 0
  return -Math.min(1, drift) * distance
}

/**
 * Gelen sahnenin dikey girişi (px, pozitif = aşağıdan).
 * Sahne henüz gelmemişse (`drift < 0`) aşağıda bekler ve yükselir.
 * Geçmişte kaldıysa 0 — giriş hareketi bittikten sonra devreye girmez.
 */
export function sceneEnterY(
  progress: number,
  index: number,
  steps: number,
  distance = 64,
): number {
  const drift = sceneDrift(progress, index, steps)
  if (drift >= 0) return 0
  return Math.min(1, -drift) * distance
}

/**
 * Giden sahnenin yatay kaçışı (px, negatif = sola).
 * Scroll scrub ve carousel için aynı drift mantığı.
 */
export function sceneExitX(
  progress: number,
  index: number,
  steps: number,
  distance = 72,
): number {
  const drift = sceneDrift(progress, index, steps)
  if (drift <= 0) return 0
  return -Math.min(1, drift) * distance
}

/**
 * Gelen sahnenin yatay girişi (px, pozitif = sağdan).
 */
export function sceneEnterX(
  progress: number,
  index: number,
  steps: number,
  distance = 72,
): number {
  const drift = sceneDrift(progress, index, steps)
  if (drift >= 0) return 0
  return Math.min(1, -drift) * distance
}

/** Carousel aktif indeksten 0→1 scroll progress. */
export function progressFromSceneIndex(index: number, steps: number): number {
  if (steps <= 0) return 0
  return Math.min(1, Math.max(0, index / steps))
}

/** Carousel timeline pozisyonu (wrap geçişleri için negatif / count üstü). */
export function carouselSceneDistance(
  timelinePos: number,
  index: number,
  count: number,
): number {
  const last = count - 1
  if (timelinePos > last && index === 0) return timelinePos - count
  if (timelinePos < 0 && index === last) return timelinePos
  return timelinePos - index
}

export function carouselScenePresence(
  timelinePos: number,
  index: number,
  count: number,
): number {
  const dist = carouselSceneDistance(timelinePos, index, count)
  return Math.max(0, 1 - Math.abs(dist))
}

export function carouselSceneFade(
  timelinePos: number,
  index: number,
  count: number,
  sharpness = 1.6,
): number {
  const base = carouselScenePresence(timelinePos, index, count)
  const eased = base * base * (3 - 2 * base)
  return Math.pow(eased, sharpness)
}

export function carouselSceneExitX(
  timelinePos: number,
  index: number,
  count: number,
  distance = 72,
): number {
  const dist = carouselSceneDistance(timelinePos, index, count)
  if (dist <= 0) return 0
  return -Math.min(1, dist) * distance
}

export function carouselSceneEnterX(
  timelinePos: number,
  index: number,
  count: number,
  distance = 72,
): number {
  const dist = carouselSceneDistance(timelinePos, index, count)
  if (dist >= 0) return 0
  return Math.min(1, -dist) * distance
}

export function carouselSceneMountWindow(
  timelinePos: number,
  index: number,
  count: number,
  radius = 1,
): boolean {
  const dist = Math.abs(carouselSceneDistance(timelinePos, index, count))
  return dist <= radius + 0.35
}

export function carouselProgressForBackground(timelinePos: number, steps: number): number {
  if (steps <= 0) return 0
  if (timelinePos > steps) return 1
  if (timelinePos < 0) return 0
  return timelinePos / steps
}

/**
 * Sahnenin opaklığı — `smoothScenePresence` üzerine keskinleştirilmiş eğri.
 *
 * Düz `presence` doğrusal olduğu için iki sahne uzun süre yarı yarıya
 * görünüyor ("soluk crossfade"). Üs alma geçişi kısaltır: aktif sahne daha
 * uzun süre tam opak kalır, devir teslim daha net olur.
 */
export function sceneFade(
  progress: number,
  index: number,
  steps: number,
  sharpness = 1.6,
): number {
  const base = smoothScenePresence(progress, index, steps)
  return Math.pow(base, sharpness)
}

type Rgb = readonly [number, number, number]

const HEX_CACHE = new Map<string, Rgb>()

function parseHex(hex: string): Rgb {
  const cached = HEX_CACHE.get(hex)
  if (cached) return cached
  const h = hex.replace('#', '')
  const rgb: Rgb = [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
  HEX_CACHE.set(hex, rgb)
  return rgb
}

export function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a)
  const [r2, g2, b2] = parseHex(b)
  const r = Math.round(lerp(r1, r2, t))
  const g = Math.round(lerp(g1, g2, t))
  const bl = Math.round(lerp(b1, b2, t))
  return `rgb(${r} ${g} ${bl})`
}

export function canvasBackground(progress: number, stops: readonly string[]): string {
  const steps = stops.length - 1
  if (steps <= 0) return stops[0] ?? '#0a0f0d'
  const t = timelineIndex(progress, steps)
  const i = Math.min(steps - 1, Math.floor(t))
  return mixHex(stops[i]!, stops[i + 1]!, t - i)
}

export function accentAtProgress(progress: number, accents: readonly string[]): string {
  const steps = accents.length - 1
  if (steps <= 0) return accents[0] ?? '#f59e0b'
  const t = timelineIndex(progress, steps)
  const i = Math.min(steps - 1, Math.floor(t))
  return mixHex(accents[i]!, accents[i + 1]!, t - i)
}

export function activeSceneIndex(progress: number, steps: number): number {
  const t = timelineIndex(progress, steps)
  return Math.min(steps, Math.max(0, Math.round(t)))
}

export function badgeLabelAtProgress(
  progress: number,
  labels: readonly string[],
  steps: number,
): string {
  const t = timelineIndex(progress, steps)
  const i = Math.min(labels.length - 1, Math.max(0, Math.round(t)))
  return labels[i] ?? labels[0] ?? ''
}
