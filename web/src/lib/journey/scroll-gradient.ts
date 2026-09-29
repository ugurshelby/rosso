/**
 * Viewport merkezine göre kesirli yıl indeksi — scroll-linked renk lerp için.
 * Bölüm ortaları arasında sürekli geçiş; IntersectionObserver snap'i yok.
 */
export function journeyColorIndexFromSections(sections: readonly HTMLElement[]): number {
  if (sections.length === 0) return 0
  if (sections.length === 1) return 0

  const center = window.scrollY + window.innerHeight / 2

  const mids = sections.map((el) => {
    const rect = el.getBoundingClientRect()
    return window.scrollY + rect.top + rect.height / 2
  })

  if (center <= mids[0]!) return 0

  for (let i = 0; i < mids.length - 1; i++) {
    const aMid = mids[i]!
    const bMid = mids[i + 1]!
    if (center >= aMid && center <= bMid) {
      const span = bMid - aMid
      return span === 0 ? i : i + (center - aMid) / span
    }
  }

  return sections.length - 1
}
