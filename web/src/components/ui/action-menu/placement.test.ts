import { describe, expect, it } from 'vitest'
import { computeMenuPlacement } from './placement'

describe('computeMenuPlacement', () => {
  it('varsayılan olarak tetikleyicinin altına hizalar', () => {
    const trigger = { top: 100, bottom: 132, left: 200, right: 240 } as DOMRect
    const result = computeMenuPlacement(trigger, 200, 120, 8)
    expect(result.top).toBe(140)
    expect(result.left).toBe(40)
  })

  it('alta sığmazsa yukarı flip eder', () => {
    const trigger = { top: 700, bottom: 732, left: 100, right: 140 } as DOMRect
    const result = computeMenuPlacement(trigger, 180, 160, 8)
    expect(result.top).toBeLessThan(trigger.top)
  })

  it('sol taşmayı padding ile sınırlar', () => {
    const trigger = { top: 50, bottom: 82, left: 0, right: 44 } as DOMRect
    const result = computeMenuPlacement(trigger, 220, 100, 8)
    expect(result.left).toBeGreaterThanOrEqual(8)
  })
})
