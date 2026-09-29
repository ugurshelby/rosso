import type { MetadataRoute } from 'next'
import { siteUrl, indekslenebilir } from '@/lib/seo/site-url'

/**
 * `/robots.txt` — arama motoru tarayıcılarına ne okuyabileceklerini söyler.
 *
 * ─── Neden dosya değil, kod ─────────────────────────────────────────────
 * `public/robots.txt` statiktir; preview ile production aynı metni alır.
 * Oysa **preview deploy'ları indekslenmemeli** — aynı içerik iki adreste
 * görünürse kanonik sayfa zayıflar. Kod üretimi ortamı okuyup karar verir.
 *
 * 2026-09-22: "kişisel Rosso" döneminde (86d9fa66) tamamen kapatılmıştı;
 * çok kullanıcılı mimariye dönüldükten sonra geri açılmamıştı.
 */
export default function robots(): MetadataRoute.Robots {
  // Preview/localhost: hiçbir şey indekslenmesin.
  if (!indekslenebilir()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        /*
         * Neden bunlar kapalı:
         * - `/api/`      → JSON uçları, sayfa değil; taranması boşuna yük.
         * - Dashboard yolları → giriş gerektirir. Bot buraya girerse
         *     `/login`'e yönlenir, yani her biri aynı sayfanın kopyası
         *     gibi görünür.
         * - Auth ekranları → "Rosso giriş" araması zaten ana sayfaya düşmeli.
         * - `/preview-*` → iç önizleme sayfaları.
         */
        disallow: [
          '/api/',
          '/dashboard',
          '/settings',
          '/recap',
          '/journey',
          '/playlists',
          '/mood',
          '/taste',
          '/gecmis',
          '/data',
          '/album/',
          '/artist/',
          '/track/',
          '/preview-catalog',
          '/preview-journey',
          '/login',
          '/register',
          '/forgot-password',
          '/update-password',
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
