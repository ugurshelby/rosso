/**
 * Kanonik site adresi — SEO yüzeyleri için (sitemap, robots, OG, JSON-LD).
 *
 * ─── Neden `getAppOrigin()` kullanılmıyor ───────────────────────────────
 * `platform-auth.ts`'teki `getAppOrigin()` production'da env yoksa
 * **throw eder**. Bu OAuth akışı için doğru: yanlış origin'e yönlendirmek
 * güvenlik sorunudur, patlaması iyidir.
 *
 * Ama sitemap/robots **build sırasında** üretilir. Orada throw etmek tüm
 * derlemeyi düşürür — hem de SEO gibi ikincil bir yüzey yüzünden. Burada
 * doğru davranış sıralı geri çekilmedir:
 *   1. `NEXT_PUBLIC_APP_URL`  — elle ayarlanan kanonik adres (tercih)
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel'in kalıcı production adı
 *   3. `VERCEL_URL` — o deploy'a özel adres (preview'da bu gelir)
 *   4. localhost — geliştirme
 *
 * ⚠ (3) bilinçli olarak (2)'nin ALTINDA: `VERCEL_URL` her deploy'da
 * değişen bir adrestir (`proje-abc123.vercel.app`). Onu kanonik sanıp
 * sitemap'e yazmak, arama motorlarına her deploy'da farklı bir site
 * göstermek demek olurdu.
 */

function normalize(ham: string): string {
  const kirpik = ham.trim().replace(/\/+$/, '')
  if (!kirpik) return ''
  // Vercel env'leri şema İÇERMEZ (`proje.vercel.app`), elle girilen
  // değer içerebilir. İkisini de kabul et.
  return /^https?:\/\//.test(kirpik) ? kirpik : `https://${kirpik}`
}

/** Kanonik site kökü, sonunda eğik çizgi YOK. */
export function siteUrl(): string {
  const adaylar = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]

  for (const aday of adaylar) {
    if (!aday) continue
    const url = normalize(aday)
    if (url) return url
  }

  return 'http://localhost:3847'
}

/** Site köküne göre mutlak URL üretir. */
export function mutlakUrl(yol: string): string {
  const temiz = yol.startsWith('/') ? yol : `/${yol}`
  return `${siteUrl()}${temiz === '/' ? '' : temiz}`
}

/**
 * Bu ortam arama motorlarına açık mı?
 *
 * Preview deploy'ları ve localhost indekslenmemeli — aynı içeriğin iki
 * adreste görünmesi (duplicate content) kanonik sayfayı zayıflatır.
 * `VERCEL_ENV` production değilse kapatıyoruz.
 *
 * `*.vercel.app` production alias'ı da aynı build'i sunar; onu
 * `next.config.ts`'teki host'a özel `X-Robots-Tag` başlığı kapatır.
 */
export function indekslenebilir(): boolean {
  const vercelOrtam = process.env.VERCEL_ENV
  if (vercelOrtam && vercelOrtam !== 'production') return false
  const url = siteUrl()
  return !url.includes('localhost') && !url.endsWith('.vercel.app')
}
