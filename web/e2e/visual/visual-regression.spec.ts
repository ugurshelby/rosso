import { test, expect } from '@playwright/test'

/**
 * Görsel Regresyon (piksel kıyası) — Katman 2 (Sahip onaylı baseline, 2026-07-27).
 *
 * ⚠ Bu testler BASELINE (referans görüntü) ister. Baseline'ı Sahip onaylar:
 *   1. Ben `npm run e2e:visual:update` çalıştırırım → görüntüler üretilir.
 *   2. Üretilen PNG'leri Sahibe gösteririm ("bunlar doğru mu?").
 *   3. Sahip "doğru" derse baseline commit'lenir; bundan sonra her koşuda
 *      pikselden sapma test'i kırar + kırmızı diff üretir.
 *
 * §4.5 uyumu: baseline'ı BEN onaylamam (tarayıcıyı gözle göremem) — Sahip
 * onaylar. Bu yüzden bu grup varsayılan `npm run e2e`'de KOŞMAZ; yalnız
 * `--grep @visual` ile bilinçli çağrılır. Baseline yoksa Playwright "yeni
 * baseline yazıldı" der ve GEÇER — bu yüzden ilk üretimden sonra Sahip onayı
 * olmadan güvenilmez; onay adımı süreç kuralıdır (CLAUDE.md §4.5).
 *
 * Determinizm: animasyonlar dondurulur, ağ beklenir — aksi halde her koşu sahte
 * sapma üretir.
 */

const VISUAL_PAGES = [
  { path: '/login', name: 'login' },
  { path: '/help', name: 'help' },
  { path: '/privacy', name: 'privacy' },
]

for (const { path, name } of VISUAL_PAGES) {
  test(`@visual ${name} görsel olarak sabit`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    // CSS animasyonlarını/geçişlerini dondur — deterministik kıyas için şart.
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }`,
    })
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      // Küçük anti-aliasing farklarına tolerans; gerçek bozulma bunu aşar.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    })
  })
}
