/** 4 pt ızgara ve şekil doktrini (mobile-design.md §5). Ara değer yok. */
export const bosluk = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const

export const KENAR = bosluk[4]
export const BOLUM_ARASI = bosluk[8]
/** Dokunma hedefi en az 48 dp; küçük ikonda `hitSlop` ile tamamlanır. */
export const DOKUNMA_HEDEFI = 48

export const kose = {
  kart: 8,
  kapak: 6,
  kapakSatir: 4,
  sheet: 24,
  pil: 999,
} as const

/** Görünür boyutu `boyut` olan öğeyi 48 dp hedefe tamamlayan hitSlop. */
export function hitSlopIcin(boyut: number) {
  const pay = Math.max(0, Math.ceil((DOKUNMA_HEDEFI - boyut) / 2))
  return { top: pay, bottom: pay, left: pay, right: pay }
}
