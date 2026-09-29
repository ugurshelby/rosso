'use client'

/**
 * FAZ DASHBOARD-REDESIGN (2026-08-13) — kart üstünde imleci takip eden
 * dar-bant ışıma (`.surface-glass`/`.ctaCard`/`.recapQuickCard`::before'daki
 * `--mx`/`--my` custom property'lerini besler). State YOK, doğrudan DOM'a
 * yazar — re-render tetiklemez, `mousemove` her karede React'ı meşgul etmez.
 *
 * Yalnız gerçek pointer'da anlamlı (dokunma cihazında hover kavramı yok);
 * `useFinePointer` zaten CSS `.surface-glass:hover` kuralını `@media
 * (hover: hover) and (pointer: fine)` ile sınırlıyor, bu fonksiyon salt
 * performans için var — dokunmatik cihazda handler çalışsa da görünür etkisi
 * olmaz.
 *
 * `'use client'` ZORUNLU: bu fonksiyon server component'ten (`page.tsx`)
 * doğrudan `<Link onMouseMove={handleCardGlow}>` olarak geçiriliyor. RSC
 * boundary'de fonksiyonlar serialize edilemez — direktif olmadan "Functions
 * cannot be passed directly to Client Components" hatası runtime'da patlar
 * (üretimde error.tsx'e düşer, build/type-check bunu yakalamaz).
 */
export function handleCardGlow(event: React.MouseEvent<HTMLElement>): void {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  event.currentTarget.style.setProperty('--mx', `${x}%`)
  event.currentTarget.style.setProperty('--my', `${y}%`)
}
