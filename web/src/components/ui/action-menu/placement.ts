export type MenuPlacement = {
  top: number
  left: number
  maxHeight: number
}

/**
 * Viewport çarpışması — menü taşmaz; dikey/ yatay flip.
 * Floating UI yerine hafif saf fonksiyon (tek panel, alt menü yok).
 */
export function computeMenuPlacement(
  triggerRect: DOMRect,
  menuWidth: number,
  menuHeight: number,
  padding = 8,
): MenuPlacement {
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = triggerRect.bottom + padding
  let left = triggerRect.right - menuWidth

  if (left < padding) left = padding
  if (left + menuWidth > vw - padding) left = Math.max(padding, vw - padding - menuWidth)

  if (top + menuHeight > vh - padding) {
    top = triggerRect.top - menuHeight - padding
  }
  if (top < padding) top = padding

  const maxHeight = Math.max(120, vh - top - padding)
  return { top, left, maxHeight }
}
