/**
 * Content-Security-Policy — TEK KAYNAK (2026-08-13, FAZ GÜVENLİK).
 *
 * ─── Neden bu dosya var ──────────────────────────────────────────────────
 * CSP daha önce `next.config.ts` içinde statik bir dize olarak duruyordu.
 * Nonce **istek başına** üretilmek zorunda olduğu için (aynı nonce iki
 * istekte kullanılırsa nonce olmaktan çıkar) CSP artık çalışma zamanında
 * kurulmalı. Kurulum mantığı burada tek yerde tutulur; middleware onu
 * çağırır, testler doğrudan bu fonksiyonları sınar.
 *
 * ─── 2026-07-08 denemesinin KÖK NEDENİ (ölçüldü, 2026-08-13) ─────────────
 * O turda nonce'lu CSP denendi ve "tüm client bileşenler dondu" diye
 * geri alındı; ana planda *"Next 16'nın hydration script'lerine nonce
 * uygulanamadı"* diye kaydedilmişti. **Bu teşhis yanlıştı.**
 *
 * Next.js kaynağı (`next/dist/server/app-render/app-render.js`,
 * `parseRequestHeaders`):
 *
 *     const csp = headers['content-security-policy'] || ...
 *     const nonce = typeof csp === 'string' ? getScriptNonceFromHeader(csp) : undefined
 *
 * Buradaki `headers` **gelen isteğin** başlıkları. `next.config.ts`'teki
 * `headers()` ise yalnız **yanıta** başlık yazar. Yani Next nonce'u
 * request'te aradı, bulamadı, kendi inline hydration script'lerine `nonce`
 * özniteliği basmadı — ama yanıttaki CSP `'nonce-...'` içerdiği için
 * tarayıcı spec gereği `'unsafe-inline'`i yok saydı ve o script'leri
 * blokladı. Sonuç: hydration hiç başlamadı, sayfa dondu.
 *
 * Doğru kurulum: nonce'lu CSP **hem request hem response** başlığına
 * yazılır (bkz. `src/lib/middleware/csp.ts`). Next'in nonce'u okuyup
 * script'lere basması için request kopyası şart.
 *
 * ─── Zemin avantajı (ölçüldü) ───────────────────────────────────────────
 * `src/` içinde elle yazılmış `<script>` ve `dangerouslySetInnerHTML`
 * **sıfır**. Nonce'lanması gereken tek şey Next'in kendi ürettiği
 * script'ler; Next bunu request'ten nonce okuyunca otomatik yapar.
 * Yani uygulama kodunda hiçbir değişiklik gerekmiyor.
 */

/** CSP nonce başlığı — middleware'in ürettiğini sunucu bileşenleri de okuyabilsin. */
export const CSP_NONCE_HEADER = 'x-rosso-csp-nonce'

/**
 * Build sırasında **statik olarak prerender edilen** rotalar.
 *
 * ─── Neden bu liste var: ölçülmüş beyaz-ekran riski ─────────────────────
 * 2026-08-13 production build'inde canlıda ölçüldü: bu rotalar `○ (Static)`
 * olarak üretiliyor, yani HTML **build anında** yazılıyor. O an bir istek —
 * dolayısıyla bir nonce — yok. Next'in RSC hydration payload'ları
 * (`self.__next_f.push(...)`) HTML'e nonce'suz gömülüyor:
 *
 *     /login    → 8 inline script,  0 nonce
 *     /         → 16 inline script, 0 nonce
 *     /pricing  → 11 inline script, 0 nonce
 *
 * Bu sayfalara nonce'lu + `'strict-dynamic'` politika gönderilirse
 * tarayıcı `'unsafe-inline'`i yok sayar, bu script'lerin hiçbiri
 * çalışmaz ve sayfa **tamamen ölür**. 2026-07-08'de yaşanan "tüm client
 * bileşenler dondu" tablosunun mekanizması tam olarak budur.
 *
 * Dinamik rotalarda (`ƒ`) sorun yok — orada Next nonce'u request'ten
 * okuyup her script'e basıyor (ölçüldü: `/artist/[name]` → 17 script,
 * 19 nonce, hepsi başlıktaki değerle birebir aynı).
 *
 * ⚠ BAKIM NOTU: `next build` çıktısında `○ (Static)` işaretli bir rota
 * eklenirse buraya da eklenmeli. Aksi hâlde o sayfa production'da
 * sessizce beyaz ekrana düşer. Kontrol: `npm run build` çıktısında
 * `○` satırlarını bu listeyle karşılaştır.
 */
export const STATIC_PRERENDERED_PATHS = [
  '/',
  '/blog',
  '/forgot-password',
  '/help',
  '/login',
  /* '/preview/manifesto' — 2026-08-15: sayfa SİLİNDİ (Sahip: "gereksiz ölü
     link olmasın"). Kullanıcı bomboş siyah ekran görüyordu; kartın kendisi
     gerçek `/recap` destesinde zaten sorunsuz çalışıyor. Girdi de kaldırıldı:
     olmayan rotayı beyaz listede tutmak, listeyi güvenilmez yapar. */
  '/pricing',
  '/privacy',
  '/register',
  '/update-password',
] as const

/**
 * Nonce uygulanabilen **dinamik** rota kökleri (`ƒ` — server-rendered).
 *
 * ─── Neden kara liste değil BEYAZ liste ─────────────────────────────────
 * İlk kurulumda yalnız `STATIC_PRERENDERED_PATHS` vardı ve "listede
 * yoksa dinamiktir" varsayılıyordu. Canlıda ölçüldü (2026-08-13,
 * production sunucusu) ve **kırık çıktı**:
 *
 *     GET /xyz-yok-boyle-bir-sey  → 404
 *     CSP: 'nonce-S7Cxr+...' 'strict-dynamic'
 *     HTML: 6 inline script, 0 nonce'lu
 *
 * Sebep: tanımsız her yol Next'in `/_not-found` sayfasına düşer ve o
 * sayfa `○ (Static)` üretilir. Ama isteğin *pathname*'i `/xyz-yok`
 * olduğu için statik listeyle eşleşmez → nonce'lu politika alır →
 * 404 sayfasının script'leri bloklanır.
 *
 * Kara listeyle bu düzeltilemez: hangi yolun 404 olacağı önceden
 * bilinemez (sonsuz küme). Beyaz liste doğru yön — **bilmediğimiz her
 * yol güvenli tarafa düşer.** Yeni bir dinamik rota eklendiğinde nonce
 * koruması almaz (fark edilir, güvenlik kaybı yok); yanlış yönde hata
 * yapılsaydı sayfa ölürdü (fark edilmez, kullanıcı kaybı var).
 *
 * ⚠ BAKIM: `next build` çıktısında `ƒ` işaretli yeni bir sayfa kökü
 * çıkarsa buraya eklenir. Eklenmezse o sayfa çalışır ama nonce
 * korumasından yararlanmaz.
 */
export const NONCE_ELIGIBLE_PREFIXES = [
  '/dashboard',
  '/recap',
  '/gecmis',
  '/mood',
  '/taste',
  '/playlists',
  '/migrate',
  '/settings',
  '/journey',
  '/data',
  '/track',
  '/artist',
] as const

/**
 * Bu yola nonce uygulanabilir mi?
 *
 * Yalnız **bilinen dinamik** rotalar `true` döner. Statik sayfalar,
 * 404'e düşen tanımsız yollar ve API rotaları güvenli tarafta kalır.
 */
export function isNonceEligiblePath(pathname: string): boolean {
  return NONCE_ELIGIBLE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

/**
 * Bu yol statik prerender ediliyor mu? (nonce uygulanamaz)
 *
 * `/blog` gibi bir kök, alt sayfalarıyla birlikte değerlendirilir.
 *
 * ⚠ Artık tek başına yeterli DEĞİL — nonce kararı `isNonceEligiblePath`
 * ile verilir (yukarıdaki 404 bulgusu). Bu fonksiyon belgeleme ve test
 * amacıyla korunuyor.
 */
export function isStaticPrerenderedPath(pathname: string): boolean {
  if (pathname === '/') return true
  return STATIC_PRERENDERED_PATHS.some(
    (p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`))
  )
}

/**
 * Nonce modu — **geri dönüş kapısı**.
 *
 * `CSP_NONCE_MODE=off` → nonce üretilmez, eski `'unsafe-inline'` davranışı.
 * Production'da bir sorun çıkarsa Vercel'de TEK env değişkeniyle, kod
 * değiştirmeden, deploy beklemeden geri dönülür. 2026-07-08'de site
 * donduğunda geri dönüş için commit revert + deploy gerekmişti; bu kapı
 * o maliyeti ortadan kaldırıyor.
 *
 * Varsayılan `on` — güvenli olan taraf varsayılan olmalı.
 */
export type CspMode = 'on' | 'off'

export function resolveCspMode(rawEnv: string | undefined): CspMode {
  return rawEnv?.trim().toLowerCase() === 'off' ? 'off' : 'on'
}

/**
 * Kriptografik rastgele nonce (base64, 128 bit).
 *
 * `crypto.getRandomValues` Edge/Node/Web runtime'ların üçünde de var —
 * middleware hangi runtime'da koşarsa koşsun çalışır. `Math.random()`
 * KULLANILAMAZ: tahmin edilebilir bir nonce, nonce olmamakla eşdeğerdir.
 *
 * 16 bayt (128 bit) CSP Level 3 önerisinin (≥128 bit) tam karşılığı.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // btoa Edge runtime'da global; Node 18+ içinde de mevcut.
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/**
 * CSP direktiflerini kurar.
 *
 * @param nonce  `null` ise nonce'suz (eski) mod — `script-src 'unsafe-inline'`
 * @param isProd production'da `'unsafe-eval'` düşer
 */
export function buildCsp(nonce: string | null, isProd: boolean): string {
  /*
   * script-src stratejisi:
   *
   * • nonce VARSA: `'nonce-<x>' 'strict-dynamic'`
   *   `'strict-dynamic'` şart — Next'in nonce'lu bootstrap script'i
   *   başka script'leri (chunk'ları) dinamik olarak yüklüyor. Onsuz her
   *   chunk ayrı ayrı izin isterdi. `'strict-dynamic'` "nonce'la güvendiğim
   *   script'in yüklediği script'e de güven" demek.
   *
   *   ⚠ `'strict-dynamic'` varken tarayıcı `'self'` ve host-tabanlı
   *   kaynakları YOK SAYAR (spec gereği). Bu bilinçli: tüm script'lerimiz
   *   zaten Next bootstrap'i üzerinden yükleniyor. `'self'` yine de
   *   listede bırakılıyor — `'strict-dynamic'` desteklemeyen eski
   *   tarayıcılarda geri düşüş olarak çalışır (spec'in öngördüğü desen).
   *
   * • nonce YOKSA: eski davranış (`'unsafe-inline'`) — `CSP_NONCE_MODE=off`
   */
  const scriptSrc = nonce
    ? [
        "script-src 'self' https://vercel.live",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(isProd ? [] : ["'unsafe-eval'"]),
      ].join(' ')
    : `script-src 'self' https://vercel.live 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`

  // Vercel Live (Feedback) script-src-elem fallback hatasını çözmek için
  const scriptSrcElem = nonce
    ? [
        "script-src-elem 'self' https://vercel.live",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
      ].join(' ')
    : "script-src-elem 'self' https://vercel.live 'unsafe-inline'"

  return [
    "default-src 'self'",
    scriptSrc,
    scriptSrcElem,
    /*
     * style-src 'unsafe-inline' KORUNUYOR — bilinçli karar.
     * Tailwind v4 ve `style={{...}}` prop'ları inline stil üretiyor.
     * Stil enjeksiyonu script enjeksiyonundan kat kat daha az tehlikeli
     * (kod çalıştırmaz); script tarafını sıkmak asıl kazanç.
     */
    "style-src 'self' 'unsafe-inline'",
    'img-src \'self\' data: blob: https:',
    /*
     * media-src — 2026-09-21'de EKLENDİ, ÖLÇÜMLE.
     *
     * Landing hero videoları Vercel Blob'a taşındıktan sonra production'da
     * HİÇ oynamadı: `video.error.code = 4` (SRC_NOT_SUPPORTED), readyState 0.
     * Yerelde ve `curl` ile aynı URL 200 dönüyordu — fark CSP'ydi. Konsol
     * açıkça söyledi: *"'media-src' was not explicitly set, so 'default-src'
     * is used as a fallback"* ve `default-src 'self'` dış medyayı kesiyordu.
     *
     * Ders: `img-src`'ye `https:` vermek medyayı KAPSAMAZ. Video/audio ayrı
     * bir direktiftir ve yazılmadığında sessizce `default-src`'ye düşer —
     * "resimler çalışıyorsa video da çalışır" varsayımı yanlıştır.
     *
     * Kapsam bilinçli olarak DAR: yalnız Vercel Blob'un public alt alanları,
     * `https:` geneli değil. Blob store'ları `<id>.public.blob.vercel-storage.com`
     * biçiminde; store değişse bile desen tutar.
     */
    "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co data: https://vercel.live",
    "frame-src 'self' https://vercel.live",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}
