import { describe, expect, it } from 'vitest'
import {
  canvasBackground,
  carouselProgressForBackground,
  carouselSceneDistance,
  carouselSceneEnterX,
  carouselSceneExitX,
  carouselSceneMountWindow,
  carouselScenePresence,
  layerMotion,
  progressFromSceneIndex,
  sceneEnterX,
  sceneEnterY,
  sceneExitX,
  sceneExitY,
  sceneFade,
  sceneMountWindow,
  scenePresence,
  smoothScenePresence,
  timelineIndex,
} from './scrolly-timeline'

describe('scrolly-timeline', () => {
  it('scenePresence crossfades linearly at midpoint', () => {
    expect(scenePresence(0, 0, 4)).toBe(1)
    expect(scenePresence(0.125, 0, 4)).toBeCloseTo(0.5)
    expect(scenePresence(0.125, 1, 4)).toBeCloseTo(0.5)
    expect(scenePresence(0.5, 2, 4)).toBe(1)
  })

  it('layerMotion x stays bounded (no quadratic drift)', () => {
    const mid = layerMotion(0.25, 1, 4, 22)
    expect(Math.abs(mid.x)).toBeLessThan(80)
  })

  it('canvasBackground interpolates between stops', () => {
    expect(canvasBackground(0, ['#000000', '#ffffff'])).toBe('rgb(0 0 0)')
    expect(canvasBackground(1, ['#000000', '#ffffff'])).toBe('rgb(255 255 255)')
  })

  it('timelineIndex maps full scroll to step count', () => {
    expect(timelineIndex(1, 4)).toBe(4)
    expect(timelineIndex(0.5, 4)).toBe(2)
  })

  it('smoothScenePresence eases at edges', () => {
    expect(smoothScenePresence(0, 0, 4)).toBe(1)
    expect(smoothScenePresence(0.5, 2, 4)).toBe(1)
    expect(smoothScenePresence(0.2, 0, 4)).toBeLessThan(scenePresence(0.2, 0, 4))
  })

  it('sceneMountWindow keeps neighbors mounted', () => {
    expect(sceneMountWindow(0.5, 3, 7)).toBe(true)
    expect(sceneMountWindow(0.5, 0, 7)).toBe(false)
    expect(sceneMountWindow(0.1, 1, 7)).toBe(true)
  })

  it('progressFromSceneIndex maps active index to scrub progress', () => {
    expect(progressFromSceneIndex(0, 7)).toBe(0)
    expect(progressFromSceneIndex(7, 7)).toBe(1)
    expect(progressFromSceneIndex(3, 7)).toBeCloseTo(3 / 7)
  })

  /* A-FAZ 0.3 — yonlu sahne gecisi (E7). */
  describe('yonlu sahne gecisi', () => {
    const STEPS = 4

    it('sceneExitY: sahne gecmiste kalinca YUKARI kayar (negatif)', () => {
      expect(sceneExitY(0.5, 1, STEPS)).toBeLessThan(0)
    })

    it('sceneExitY: sahne henuz gelmemisse hareket etmez', () => {
      expect(sceneExitY(0.25, 3, STEPS)).toBe(0)
    })

    it('sceneExitY: kacis mesafesi tavanla sinirli', () => {
      expect(sceneExitY(1, 0, STEPS, 64)).toBe(-64)
    })

    it('sceneEnterY: gelmemis sahne ASAGIDA bekler (pozitif)', () => {
      expect(sceneEnterY(0.25, 3, STEPS)).toBeGreaterThan(0)
    })

    it('sceneEnterY: gecmis sahnede giris hareketi yok', () => {
      expect(sceneEnterY(0.75, 1, STEPS)).toBe(0)
    })

    it('cikis ve giris ayni anda sifir olmaz — yon her zaman tek', () => {
      for (const p of [0.1, 0.35, 0.6, 0.9]) {
        for (let i = 0; i < STEPS; i++) {
          const exit = sceneExitY(p, i, STEPS)
          const enter = sceneEnterY(p, i, STEPS)
          expect(exit === 0 || enter === 0).toBe(true)
        }
      }
    })

    it('sceneExitX: sahne gecmiste kalinca SOLA kayar', () => {
      expect(sceneExitX(0.5, 1, STEPS)).toBeLessThan(0)
    })

    it('sceneEnterX: gelmemis sahne SAGDAN girer', () => {
      expect(sceneEnterX(0.25, 3, STEPS)).toBeGreaterThan(0)
    })

    it('sceneFade: aktif sahne tam opak', () => {
      expect(sceneFade(0.5, 2, STEPS)).toBeCloseTo(1, 5)
    })

    it('sceneFade duz crossfade\'den DAHA KESKIN — E7 kok nedeni', () => {
      const sharp = sceneFade(0.3, 1, STEPS)
      const flat = smoothScenePresence(0.3, 1, STEPS)
      expect(sharp).toBeLessThan(flat)
    })

    it('sceneFade 0..1 araliginda kalir', () => {
      for (const p of [0, 0.2, 0.5, 0.77, 1]) {
        for (let i = 0; i < STEPS; i++) {
          const v = sceneFade(p, i, STEPS)
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  describe('carousel timeline (A-FAZ 7)', () => {
    const COUNT = 8
    const STEPS = COUNT - 1

    it('carouselSceneDistance wrap forward: 7 -> 0', () => {
      expect(carouselSceneDistance(7.5, 0, COUNT)).toBe(-0.5)
      expect(carouselSceneDistance(7.5, 7, COUNT)).toBe(0.5)
    })

    it('carouselSceneDistance wrap backward: 0 -> 7', () => {
      expect(carouselSceneDistance(-0.5, 7, COUNT)).toBe(-0.5)
      expect(carouselSceneDistance(-0.5, 0, COUNT)).toBe(-0.5)
    })

    it('carouselScenePresence crossfades at midpoint', () => {
      expect(carouselScenePresence(3, 3, COUNT)).toBe(1)
      expect(carouselScenePresence(3.5, 3, COUNT)).toBeCloseTo(0.5)
      expect(carouselScenePresence(3.5, 4, COUNT)).toBeCloseTo(0.5)
    })

    it('carouselSceneExitX ve EnterX yonlu', () => {
      expect(carouselSceneExitX(3.5, 3, COUNT)).toBeLessThan(0)
      expect(carouselSceneEnterX(3.5, 4, COUNT)).toBeGreaterThan(0)
    })

    it('carouselSceneMountWindow komşulari tutar', () => {
      expect(carouselSceneMountWindow(3.2, 3, COUNT)).toBe(true)
      expect(carouselSceneMountWindow(3.2, 0, COUNT)).toBe(false)
    })

    it('carouselProgressForBackground wrap pozisyonlarini sinirlar', () => {
      expect(carouselProgressForBackground(8, STEPS)).toBe(1)
      expect(carouselProgressForBackground(-1, STEPS)).toBe(0)
      expect(carouselProgressForBackground(3.5, STEPS)).toBeCloseTo(3.5 / STEPS)
    })
  })
})
