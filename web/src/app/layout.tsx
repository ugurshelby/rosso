import type { Metadata, Viewport } from 'next'
import {
  Geist,
  Geist_Mono,
  Archivo_Black,
  Bebas_Neue,
  Barlow_Semi_Condensed,
  Bodoni_Moda,
} from 'next/font/google'
import { Suspense } from 'react'
import { OlcumRizasi } from '@/components/privacy/olcum-rizasi'
import { NavigationProgress } from '@/components/ui/navigation-progress'
import { ScrollToTop } from '@/components/ui/scroll-to-top'
import './globals.css'
import { siteUrl, indekslenebilir } from '@/lib/seo/site-url'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// ─── Tipografi sistemi (2026-07-18, Sahibin kararı) ───
// Otorite doküman: docs/design/typography/typography.md
// İki karakter ayrışır, tek marka hissi korunur:
//   Geist (UI) · Geist Mono (teknik) · Bebas Neue (müzik analitik display)
//   Barlow Semi Condensed (sosyal + Journey kalın sans)
//   Archivo Black (Story Recap + marketing display)
//   Bodoni Moda Italic (YALNIZ Journey serif'i)
// Kaldırılanlar: Archivo (5 ağırlık → tek kesim Black yeter), Hanken Grotesk
// (src'de sıfır kullanım), Fraunces (rolü Bodoni Moda + Bebas'a devredildi).

// Story Recap + marketing/blog display sesi. Tek kesim (≈900); CSS'te
// font-weight 400 ile çağrılır — globals.css'teki font-synthesis-weight
// guard'ı sahte kalınlaştırmayı engeller.
const archivoBlack = Archivo_Black({
  variable: '--font-display',
  weight: '400',
  subsets: ['latin', 'latin-ext'],
  /*
   * 🔴 PRELOAD AÇILDI (2026-08-21, canlı LCP ölçümü).
   *
   * PERF-2'de (2026-07-24) dashboard'ın ilk yükünü korumak için kapatılmıştı
   * — o gerekçe hâlâ geçerli görünüyordu ama LANDING'i hesaba katmıyordu:
   * `heroTitle` (LCP öğesinin ta kendisi) `var(--font-display)` kullanıyor.
   *
   * Canlıda ölçüldü: fontlar **3,5 saniyede** iniyordu ve LCP **5,9sn**'de
   * kilitleniyordu (FCP yalnız 1,4sn iken). Yani preload kapalı olduğu için
   * ana sayfanın en büyük öğesi fontu bekliyordu.
   *
   * Dashboard kaygısı ölçüldü: `--font-display` dashboard'da YALNIZ 1 yerde
   * kullanılıyor (`recap/[period_label]/empty.module.css`) ve orası bir boş
   * durum ekranı — LCP öğesi değil. Yani preload'un dashboard'a maliyeti
   * bir font indirmesi; landing'e kazancı LCP'nin kilidini açmak.
   */
  preload: true,
})

// Müzik analitik display'i — dashboard/recap-liste/taste büyük sayısal
// başlıklar. Tek kesim, condensed, doğal uppercase; "veri yoğun müzik
// platformu" imzası. Sosyal/anlatı yüzeylerine SIZMAZ.
const bebasNeue = Bebas_Neue({
  variable: '--font-analytics',
  weight: '400',
  subsets: ['latin', 'latin-ext'],
  // M2 (2026-08-09, ÖLÇÜLDÜ): landing'de `--font-analytics` kullanımı **0**
  // (`marketing.module.css` 0 · `marketing-theme.css` 0 · `auth.module.css` 0
  // · `marketing-surfaces.css` 0). Yalnız dashboard/taste kullanıyor.
  //
  // Ama preload AÇIKTI ve landing'in kritik yolunu tıkıyordu: canlı ölçümde
  // TTFB **215 ms**, FCP **3.372 ms** — aradaki 3 saniyeyi 8 font dosyası
  // yiyordu. Öncelik tersine dönmüştü: kullanılmayan `analytics` preload
  // edilirken, landing'de 14 kez geçen `--font-display` (`archivoBlack`)
  // `preload: false` idi.
  //
  // Diğer üçüyle aynı gerekçe (PERF-2 · B2.1): CSS değişkeni çalışır,
  // font ancak dashboard render edince iner.
  preload: false,
})

// Sosyal katman (keşfet, mesajlar, profil, topluluk) + ağırlık 900 kesimi
// Journey'nin kalın sans'ı (Bodoni Italic ile "Recoleta + Berthold" kontrastı).
const barlowSemiCondensed = Barlow_Semi_Condensed({
  variable: '--font-social',
  weight: ['400', '500', '600', '700', '900'],
  subsets: ['latin', 'latin-ext'],
  // PERF-2: Sosyal + Journey kalın sansı — dashboard/playlists ilk yükünde
  // kullanılmıyor (grep: 0), taste'te 1 dosya (rozet). 5 ağırlık = ~5 woff2;
  // preload kapalı → sosyal/journey/taste render edince iner, dashboard tıkanmaz.
  preload: false,
})

// Journey serif'i — İNCE SERİF + KALIN SANS kontrastının serif yarısı.
// Yalnız italic yüklenir, yalnız Journey ekranlarında kullanılır; başka
// hiçbir yüzeye sızmaz (typography.md "Kullanılmayacak" bölümü).
const bodoniModa = Bodoni_Moda({
  variable: '--font-journey-serif',
  style: 'italic',
  subsets: ['latin', 'latin-ext'],
  // Yalnız Journey yüzeyinde — dashboard ilk yüklemesinde preload edilmesin
  // (LCP bütçesi, B2.1 disiplini korunur).
  preload: false,
})

const ACIKLAMA =
  'Explore your Spotify library in new ways; ' +
  'see your listening stats and personal Recap.'

export const metadata: Metadata = {
  /*
   * `metadataBase` — göreli OG/twitter görsellerini MUTLAK URL'e çevirir.
   * Olmadan Next uyarı basar ve paylaşım görselleri hiçbir platformda
   * çözülmez (Twitter/WhatsApp göreli yolu okuyamaz).
   */
  metadataBase: new URL(siteUrl()),

  /*
   * Şablon: alt sayfalar yalnız kendi adını verir, sonuna markayı bu ekler
   * ("Yardım — Rosso"). `default` şablona GİRMEZ; ana sayfa
   * "Rosso — Rosso" olmasın diye ayrı tutulur.
   */
  title: {
    default: 'Rosso — your musical identity',
    template: '%s — Rosso',
  },
  description: ACIKLAMA,

  /*
   * ⚠ Kökte `alternates.canonical` YOK (2026-09-22, canlıda ölçüldü): burada
   * '/' duruyordu ve kendi canonical'ını yazmayan HER sayfaya miras
   * kalıyordu — /blog, /pricing, /help, /privacy ve tüm yazılar Google'a
   * "ben ana sayfanın kopyasıyım" diyordu. Herkese açık her sayfa kendi
   * canonical'ını yazar; ana sayfanınki `(marketing)/page.tsx`'te.
   */

  openGraph: {
    type: 'website',
    siteName: 'Rosso',
    locale: 'en_US',
    title: 'Rosso — your musical identity',
    description: ACIKLAMA,
    url: '/',
    /*
     * ⚠ `images` AÇIKÇA yazılıyor: `opengraph-image.tsx` dosyası varken Next
     * bunu normalde kendi ekler, ama BU blok tanımlandığında otomatik eklemeyi
     * EZER — ölçüldü (2026-08-21): og:image meta'da hiç görünmüyordu, yani
     * paylaşımlarda görsel çıkmayacaktı. Dosya üretiliyordu ama kimse
     * ona bakmıyordu.
     */
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Rosso — your musical identity' }],
  },

  twitter: {
    // `summary_large_image`: müzik kapakları küçük kutuda okunmuyor.
    card: 'summary_large_image',
    title: 'Rosso — your musical identity',
    // Açıklama OG ile AYNI kısaltılmış cümle: X kartında uzun metin kesiliyor
    // ve ortada bitmiş bir cümle bırakıyordu.
    description: 'Spotify shows what you listened to. Rosso tells who you are.',
    images: ['/opengraph-image'],
  },

  /*
   * Preview/localhost indekslenmemeli — aynı içerik iki adreste görünürse
   * kanonik sayfa zayıflar. `robots.ts` tarayıcıyı durdurur; bu meta ise
   * sayfaya doğrudan gelen botu da durdurur (iki katman).
   */
  robots: indekslenebilir()
    ? { index: true, follow: true }
    : { index: false, follow: false },

  /*
   * Google Search Console mülk doğrulaması (2026-08-25, Sahip).
   * `verification.google` Next'in kendi alanı — elle `<meta>` yazmak yerine
   * bunu kullanmak, Next'in metadata birleştirme mantığıyla çakışmayı önler
   * (ör. başka bir yerde metadata export edilirse elle yazılmış etiket
   * sessizce ezilebilirdi).
   */
  verification: {
    google: 'TJpAQm2xD7QYZQKe_xkdLbjeZqDwUo3ofc4sCe-DClk',
  },
}


/**
 * `interactive-widget: resizes-content` — Android Chrome'da klavye açılınca
 * layout viewport'u küçültür (varsayılan `resizes-visual` küçültmez, sonuç:
 * sabit yükseklikli sohbet ekranı klavyenin altında kalır). iOS Safari bunu
 * yok sayar; orada `useKeyboardViewport` (`visualViewport`) devrede.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${archivoBlack.variable} ${bebasNeue.variable} ${barlowSemiCondensed.variable} ${bodoniModa.variable} h-full antialiased`}
    >
      <head>
        {/* PERF-1 (2026-07-24): Dış görsel kaynaklarına preconnect — DNS+TLS
            el sıkışmasını erkene çeker (görseller sonra gelse de bağlantı hazır).
            Supabase Storage = kendi kapak/avatar kopyalarımız (kritik, preconnect).
            Spotify CDN = playlist kapakları (2 varyant, dns-prefetch yeterli). */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link
            rel="preconnect"
            href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin}
            crossOrigin="anonymous"
          />
        )}
        <link rel="dns-prefetch" href="https://image-cdn-fa.spotifycdn.com" />
        <link rel="dns-prefetch" href="https://image-cdn-ak.spotifycdn.com" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Gezinme çubuğu: useSearchParams gerektirdiği için Suspense şart */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        {/* B2.7 (2026-07-19): StyledRegistry kaldırıldı — kullanılan tek styled
            bileşen (WaveInput) CSS module'e taşındı.
            2026-08-10: styled-components paketi de projeden silindi (ölü 20
            bileşenle birlikte); artık ne render yolunda ne bağımlılıkta. */}
        {children}
        {/* Ölçüm YALNIZ açık rızayla yüklenir (2026-09-22, KVKK denetimi):
            eskiden koşulsuzdu ve banner'daki "Reddet" hiçbir şeyi
            reddetmiyordu — bkz. `lib/privacy/cerez-onay.ts`. */}
        {process.env.VERCEL && <OlcumRizasi />}
      </body>
    </html>
  )
}
