import { test, expect, type Page } from '@playwright/test'

/**
 * Layout Audit — baseline'sız yapısal düzen testi (Sahip, 2026-07-27).
 *
 * Sahip istedikçe çalışır (her faz sonu DEĞİL — bkz. CLAUDE.md §4.5). "Kartlar
 * yapışık / buton alakasız yerde / yatay scroll / çökmüş kart" sınıfı hataları
 * baseline (referans görüntü) GEREKTİRMEDEN, geometriyi ölçerek yakalar — §4.5
 * uyumlu: ben tarayıcıyı gözle göremem, bu testler sayılarla karar verir.
 *
 * Görsel regresyon (piksel kıyası) AYRI katman → e2e/visual/ (baseline Sahip
 * onaylı). Bu dosya onun altındaki, onay gerektirmeyen güvenli taban.
 *
 * ⚠ Yardımcılar bilinçle bu dosyaya GÖMÜLÜ: ayrı `e2e/helpers/*.ts` import'u
 * Playwright'ın modül yükleyicisinde `context.conditions` hatası veriyordu
 * (moduleResolution: bundler ile çakışma). İnline hâl sağlam ve basit (§1.7).
 */

// ── Yardımcılar ──────────────────────────────────────────────────────────────

type Box = { x: number; y: number; width: number; height: number }

async function boxesOf(page: Page, selector: string): Promise<Box[]> {
  // Yalnız GÖRÜNÜR elementler — gizli/detached olanlarda boundingBox() takılır
  // (menü içinde saklı buton vb.). `:visible` bunları en baştan eler.
  const handles = await page.locator(`${selector}:visible`).all()
  const boxes: Box[] = []
  for (const h of handles) {
    const box = await h.boundingBox()
    if (box && box.width > 0 && box.height > 0) boxes.push(box)
  }
  return boxes
}

/** Sayfada yatay taşma (yatay scroll) OLMAMALI — mobil dahil kutsal kural. */
async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'Sayfa gövdesi yatay kayıyor (yatay scroll)').toBeLessThanOrEqual(1)
}

/** Seçicideki tüm elementler viewport'un yatay sınırları içinde mi? */
async function expectAllWithinViewport(page: Page, selector: string): Promise<void> {
  const viewport = page.viewportSize()
  if (!viewport) return
  for (const b of await boxesOf(page, selector)) {
    expect(b.x, `${selector} sol kenardan taşıyor`).toBeGreaterThanOrEqual(-1)
    expect(
      b.x + b.width,
      `${selector} sağ kenardan taşıyor (viewport ${viewport.width}px)`,
    ).toBeLessThanOrEqual(viewport.width + 1)
  }
}

/** İnteraktif elementler çökmüş mü (0/çok küçük kutu)? */
async function expectNoCollapsedBoxes(page: Page, selector: string, minSize = 8): Promise<void> {
  const boxes = await boxesOf(page, selector)
  expect(boxes.length, `${selector} sayfada hiç bulunamadı`).toBeGreaterThan(0)
  for (const b of boxes) {
    expect(b.height, `${selector} çökmüş (yükseklik ${b.height}px)`).toBeGreaterThanOrEqual(minSize)
    expect(b.width, `${selector} çökmüş (genişlik ${b.width}px)`).toBeGreaterThanOrEqual(minSize)
  }
}

// ── Testler ──────────────────────────────────────────────────────────────────

const PUBLIC_PAGES = ['/help', '/login', '/privacy']
const MOBILE = { width: 390, height: 844 } // iPhone 12/13/14 mantığı

for (const path of PUBLIC_PAGES) {
  test.describe(`layout: ${path}`, () => {
    test('masaüstü — taşma/çökme yok', async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalScroll(page)
      await expectAllWithinViewport(page, 'button')
      await expectAllWithinViewport(page, 'a')
    })

    test('mobil (390px) — yatay scroll yok', async ({ page }) => {
      await page.setViewportSize(MOBILE)
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalScroll(page)
      await expectAllWithinViewport(page, 'button')
    })
  })
}

test.describe('layout: login formu bütünlüğü', () => {
  test('form alanları görünür + çökmemiş', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expectNoCollapsedBoxes(page, 'input[name="email"]', 20)
    await expectNoCollapsedBoxes(page, 'input[name="password"]', 20)
    await expectNoCollapsedBoxes(page, 'button[type="submit"]', 20)
  })
})

/**
 * Sağlayıcı düğmeleri — düzen sözleşmesi (2026-08-18).
 *
 * ⚠ Bu blok yalnız `NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED=true` iken anlamlıdır.
 * Kırığın aylarca görünmemesinin sebebi tam olarak buydu: bayrak kapalıyken
 * `ProviderButtons` `null` döner, ikinci çocuk hiç render edilmez ve
 * yukarıdaki `/login` testleri sorunsuz geçer. Bayrak açılır açılmaz
 * `.rightPanel` (yön belirtilmemiş flex = `row`) sağlayıcı öbeğini kartın
 * YANINA diziyor ve 390px ekranı 625px'e taşırıyordu.
 *
 * Yani: düğmeleri render ETMEYEN bir ortamda düğme düzenini sınayan test
 * yanlış güven verir. Bulunamayan öğe = test atlanır, KIRIK DEĞİL.
 */
test.describe('layout: sağlayıcı düğmeleri', () => {
  const SAGLAYICI = 'a, button'
  const ETIKET = /ile devam et/i

  for (const [ad, boyut] of [
    ['masaüstü', { width: 1440, height: 900 }],
    ['tablet', { width: 834, height: 1112 }],
    ['mobil', { width: 390, height: 844 }],
    ['küçük mobil', { width: 375, height: 667 }],
  ] as const) {
    test(`${ad} — taşma yok, düğmeler eşit ve kartla hizalı`, async ({ page }) => {
      await page.setViewportSize(boyut)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const dugmeler = page.locator(SAGLAYICI).filter({ hasText: ETIKET })
      const adet = await dugmeler.count()
      test.skip(adet === 0, 'Sağlayıcı bayrakları kapalı — düzen sınanamaz')

      // 1) Kutsal kural: yatay kaydırma yok.
      await expectNoHorizontalScroll(page)

      // 2) Hiçbir düğme viewport dışına taşmamalı.
      const kutular: Box[] = []
      for (let i = 0; i < adet; i++) {
        const k = await dugmeler.nth(i).boundingBox()
        expect(k, 'sağlayıcı düğmesinin kutusu yok').not.toBeNull()
        if (k) kutular.push(k)
      }
      for (const k of kutular) {
        expect(k.x, 'sağlayıcı düğmesi sol kenardan taşıyor').toBeGreaterThanOrEqual(-1)
        expect(k.x + k.width, 'sağlayıcı düğmesi sağ kenardan taşıyor').toBeLessThanOrEqual(
          boyut.width + 1,
        )
      }

      // 3) Sahibin talimatı (2026-08-14): üç düğme BİREBİR aynı ölçüde.
      const ilk = kutular[0]
      for (const k of kutular) {
        expect(Math.abs(k.width - ilk.width), 'düğme genişlikleri eşit değil').toBeLessThanOrEqual(1)
        expect(Math.abs(k.height - ilk.height), 'düğme yükseklikleri eşit değil').toBeLessThanOrEqual(1)
      }

      // 4) Dokunma hedefi — 44px altına düşmemeli (erişilebilirlik).
      expect(ilk.height, 'sağlayıcı düğmesi 44px dokunma hedefinin altında').toBeGreaterThanOrEqual(44)

      // 5) Kartın altında ve onunla aynı hizada olmalı — YANINDA değil.
      //    Asıl kırık buydu: `flex-direction` yokken yan yana diziliyorlardı.
      const kart = await page.locator('form').first().boundingBox()
      if (kart) {
        expect(ilk.y, 'sağlayıcı öbeği formun ALTINDA olmalı').toBeGreaterThan(kart.y)
        expect(Math.abs(ilk.x - kart.x), 'sağlayıcı öbeği kartla hizalı değil').toBeLessThanOrEqual(40)
      }
    })
  }
})
