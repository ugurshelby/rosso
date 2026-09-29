/** Hero vibe kümesi — slot başına scroll çarpanları (tek --p ile uyumlu). */

export interface VibeSlotMotion {
  driftX: number
  driftY: number
  scaleMul: number
  fadeMul: number
  baseOpacity: number
  rotateMul: number
}

export const HERO_VIBE_MOTION: VibeSlotMotion = {
  driftX: 0,
  driftY: 120,
  scaleMul: 0.12,
  fadeMul: 0.78,
  baseOpacity: 1,
  rotateMul: 2.5,
}

/** 8 eşlik kartı — merkez etrafında dengeli dağılım */
export const COMPANION_VIBE_MOTIONS: VibeSlotMotion[] = [
  { driftX: -48, driftY: 100, scaleMul: 0.1, fadeMul: 0.58, baseOpacity: 0.5, rotateMul: -6 },
  { driftX: 52, driftY: 96, scaleMul: 0.1, fadeMul: 0.56, baseOpacity: 0.48, rotateMul: 7 },
  { driftX: -28, driftY: 88, scaleMul: 0.09, fadeMul: 0.52, baseOpacity: 0.44, rotateMul: -4 },
  { driftX: 32, driftY: 84, scaleMul: 0.09, fadeMul: 0.5, baseOpacity: 0.42, rotateMul: 5 },
  { driftX: -64, driftY: 110, scaleMul: 0.11, fadeMul: 0.6, baseOpacity: 0.38, rotateMul: 4 },
  { driftX: 68, driftY: 108, scaleMul: 0.11, fadeMul: 0.58, baseOpacity: 0.36, rotateMul: -5 },
  { driftX: -20, driftY: 72, scaleMul: 0.08, fadeMul: 0.48, baseOpacity: 0.34, rotateMul: 3 },
  { driftX: 24, driftY: 70, scaleMul: 0.08, fadeMul: 0.46, baseOpacity: 0.32, rotateMul: -3 },
]

export function vibeMotionStyle(
  motion: VibeSlotMotion,
  progress: number,
): Record<string, string | number> {
  const p = progress
  return {
    '--p': p,
    '--slot-dx': `${motion.driftX}px`,
    '--slot-dy': `${motion.driftY}px`,
    '--slot-scale': motion.scaleMul,
    '--slot-fade': motion.fadeMul,
    '--slot-opacity': motion.baseOpacity,
    '--slot-rotate': `${motion.rotateMul * p}deg`,
  }
}
