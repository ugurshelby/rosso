import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";

const isProd = process.env.NODE_ENV === "production";

// 2026-08-12 — ölçüm aracı, davranış değiştirmez: `ANALYZE=true npm run build`
// bundle boyut raporunu tarayıcıda açar. `ANALYZE` set değilse no-op sarmalayıcı.
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * Güvenlik başlıkları.
 *
 * ⚠ `Content-Security-Policy` BURADA DEĞİL — 2026-08-13'te middleware'e
 * taşındı (`src/lib/middleware/csp.ts`). Sebep: CSP artık istek başına
 * üretilen bir **nonce** içeriyor ve `next.config.ts` yalnız statik
 * değer yazabilir.
 *
 * Daha kritiği: Next nonce'u **gelen isteğin** başlığından okur
 * (`app-render.js` → `parseRequestHeaders`), buradaki `headers()` ise
 * yalnız **yanıta** yazar. 2026-07-08'de nonce'lu CSP'nin tüm client
 * bileşenleri dondurmasının kök nedeni tam olarak buydu — teşhis
 * "Next 16 nonce'u desteklemiyor" sanılmıştı, oysa nonce yanlış yere
 * yazılıyordu. Tam açıklama: `src/lib/security/csp.ts`.
 *
 * ⚠ Buraya bir daha statik CSP EKLENMEMELİ: iki CSP başlığı birlikte
 * gönderilirse tarayıcı ikisini de ayrı ayrı uygular (kesişim), nonce'lu
 * politika statik olanın `'unsafe-inline'`ine takılıp etkisiz kalır.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  // 127.0.0.1 üzerinden dev'e erişim (YT Music OAuth redirect_uri testi
  // için Google Console'a kayıtlı origin) — HMR'ın cross-origin engeline
  // takılmaması için (2026-07-03).
  ...(isProd ? {} : { allowedDevOrigins: ["127.0.0.1", "localhost"] }),
  // `@napi-rs/canvas` (Your Years kapak üretimi, 2026-09-18) native `.node`
  // binding içeriyor — `sharp` gibi Next'in varsayılan external listesinde
  // değil, bundler'a girince "Cannot find native binding" veriyordu
  // (ÖLÇÜLDÜ: doğrudan `node -e "require(...)"` çalışıyor, yalnız Next'in
  // server bundle'ı içinden patlıyordu). Bundle'lanmadan doğrudan
  // require edilsin diye external işaretlendi.
  serverExternalPackages: ["@napi-rs/canvas"],
  // Bundle küçültme (2026-07-28 performans turu): barrel import edilen
  // paketleri parça-parça çeker → yalnız kullanılan ikon/fonksiyon bundle'a
  // girer. lucide-react 82 dosyada import ediliyordu; tüm ikon paketi yerine
  // yalnız kullanılanlar taşınır (ölçülen kök neden — client bundle şişkinliği).
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    /*
     * 2026-08-12 — Client Router Cache (Sahip: "ana sayfaya geri
     * döndüğümde sanki hiç açmamışım gibi baştan yükleniyor").
     *
     * ÖLÇÜLEN KÖK NEDEN: Next.js 15+'ta dinamik sayfalar için varsayılan
     * `staleTime` **0** — router cache'in kendisi var ama süresi sıfır
     * olduğu için pratikte devre dışı, her geri navigasyon sunucudan
     * yeniden çekiyor. Bu YALNIZCA istemci tarafı gezinme hafızası;
     * cron'un ürettiği paket verisi (mood_pkg/stats_pkg vb.) zaten
     * kendi tazelik sınıfına göre günde bir kez değişiyor, birkaç
     * saniyelik router-cache bayatlığı veri doğruluğunu etkilemez.
     *
     * `dynamic: 30` = normal sayfalar arası geri/ileri gezinme 30sn
     * boyunca sunucuya gitmeden önbellekten gösterilir (App Router
     * dokümantasyonundaki önerilen başlangıç değeri). `static: 180` =
     * statik/prefetch edilen segmentler 3 dakika taze sayılır.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  compiler: {
    /*
     * 2026-08-10 — `styledComponents: true` KALDIRILDI. Sahibin kararıyla
     * 20 ölü tasarım bileşeni ve `styled-components` bağımlılığı silindi;
     * ölçüldü: barrel (`components/design/index.ts`) hiçbir yerden import
     * edilmiyordu, dışarıdan yalnız `AcceptCookies` ve `ErrorCard` doğrudan
     * çağrılıyordu ve ikisi de styled kullanmıyor.
     */
    // Production build'de console.* temizlenir; hata/uyarı korunur.
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },
  // Source map'ler client'a sızmasın (reverse-engineering caydırıcısı).
  productionBrowserSourceMaps: false,
  /*
   * 2026-08-12 — `next/image` için dış görsel domain izin listesi.
   * Şu ana dek Supabase Storage/Spotify CDN görselleri BİLİNÇLİ olarak
   * ham `<img>` ile kullanılıyordu (ör. playlist-card.tsx yorumu:
   * "next/image 204 kapak hepsini birden yüklüyordu, düz img'de lazy
   * yoktu") — bu mevcut kullanımlara DOKUNULMUYOR. Bu config yalnız
   * YENİ/gelecek `next/image` kullanımlarını (otomatik AVIF/WebP +
   * doğru boyutlandırma) mümkün kılıyor. CSP `img-src https:` zaten
   * herhangi bir https kaynağına izin veriyor, çakışma yok.
   */
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "image-cdn-ak.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-fa.spotifycdn.com" },
      // Deezer kapak yedeği (0349, 2026-09-24): Spotify bağlantısı olmayan kullanıcılar.
      { protocol: "https", hostname: "cdn-images.dzcdn.net" },
      { protocol: "https", hostname: "e-cdns-images.dzcdn.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      /*
       * 2026-08-12 — `public/` altındaki statik görseller (vibe-cards
       * SVG/webp kapakları, marketing fixture'ları) dosya adı değişmedikçe
       * ASLA değişmiyor — tarayıcı bunları bir daha hiç indirmemeli.
       * `/_next/static/*` zaten Next.js'in kendi immutable cache'inde,
       * bu yalnız elle eklediğimiz `public/` dosyalarını kapsıyor.
       */
      {
        source: "/(vibe-cards|marketing)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      /*
       * 2026-09-22 — `*.vercel.app` adresleri (production alias'ı dahil)
       * kanonik domainle AYNI içeriği sunuyor. Yönlendirme yerine başlık:
       * OAuth geri dönüş adresleri bu host'a bağlı olabilir, 308 vermek
       * girişi kırabilirdi. Başlık yalnız botlara "burayı indeksleme" der;
       * kanonik `your-app.example` etkilenmez.
       */
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?<vercelHost>.*\\.vercel\\.app)" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
