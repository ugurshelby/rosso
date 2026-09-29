import { NextResponse, type NextRequest } from 'next/server'
import {
  CSP_NONCE_HEADER,
  buildCsp,
  generateNonce,
  isNonceEligiblePath,
  resolveCspMode,
} from '@/lib/security/csp'

/**
 * Pipeline adım 0 — istek başına CSP nonce (2026-08-13, FAZ GÜVENLİK).
 *
 * Kök neden ve mimari gerekçe: `src/lib/security/csp.ts` başlığı.
 * Özeti: Next nonce'u **request** başlığından okur, `next.config.ts`
 * yalnız **response**'a yazabilir — bu yüzden nonce middleware'e ait.
 *
 * ─── Nonce'un iki kere yazılmasının sebebi ──────────────────────────────
 *   1. REQUEST  → Next okur, kendi hydration script'lerine `nonce` basar
 *   2. RESPONSE → tarayıcı okur, politikayı uygular
 * Biri eksikse sistem **sessizce** bozulur:
 *   • request eksik  → script'ler nonce'suz kalır, tarayıcı bloklar (2026-07-08 hatası)
 *   • response eksik → politika hiç uygulanmaz, koruma yok
 *
 * ─── Neden `NextResponse.next({ request })` ─────────────────────────────
 * Next bu çağrıdaki `request.headers`'ı `x-middleware-request-*` önekiyle
 * taşır ve render aşamasında gerçek istek başlığı gibi okur (doğrulandı:
 * `next/dist/server/web/spec-extension/response.js`).
 */
export function applyCspNonce(request: NextRequest): {
  nonce: string | null
  csp: string
  requestHeaders: Headers
} {
  const isProd = process.env.NODE_ENV === 'production'
  const mode = resolveCspMode(process.env.CSP_NONCE_MODE)

  /*
   * Nonce YALNIZ bilinen dinamik rotalara uygulanır (beyaz liste).
   *
   * Statik prerender edilen sayfaların HTML'i build anında yazılır;
   * içlerindeki RSC hydration script'leri nonce taşımaz. Onlara nonce'lu
   * + `'strict-dynamic'` politika göndermek tarayıcıya o script'leri
   * bloklatır ve sayfa tamamen ölür — 2026-07-08 beyaz-ekran kazasının
   * mekanizması tam olarak budur.
   *
   * Kara liste (statik yolları saymak) YETMEDİ: tanımsız her yol
   * (`/xyz`) Next'in statik `/_not-found` sayfasına düşer ama pathname
   * hiçbir statik yolla eşleşmez. Canlıda ölçüldü — 404 sayfası
   * nonce'lu politika alıp 6 script'ini kaybediyordu. Beyaz liste bu
   * sınıfın tamamını kapatır: **bilmediğimiz yol güvenli tarafa düşer.**
   *
   * Kayıp sınırlı: nonce'suz kalan yüzeyler marketing/auth/404 —
   * kullanıcı verisi render etmezler, XSS'i besleyecek enjeksiyon
   * yüzeyleri yoktur. Asıl korunması gereken her şey (dashboard,
   * profil, sosyal, mesajlar) beyaz listede ve tam koruma altında.
   */
  const eligible = isNonceEligiblePath(request.nextUrl.pathname)

  const nonce = mode === 'on' && eligible ? generateNonce() : null
  const csp = buildCsp(nonce, isProd)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('content-security-policy', csp)
  if (nonce) {
    /*
     * Sunucu bileşenleri nonce'a `headers()` ile ulaşabilsin diye ayrı bir
     * başlık. Bugün kimse kullanmıyor (kodda inline script yok) ama
     * ileride bir `<script>` gerekirse doğru yol bu — `'unsafe-inline'`e
     * geri dönmek değil.
     */
    requestHeaders.set(CSP_NONCE_HEADER, nonce)
  }

  return { nonce, csp, requestHeaders }
}

/**
 * CSP başlığını bir yanıta yazar.
 *
 * Pipeline'ın sonraki adımları (rate-limit 429, oturum yönlendirmesi,
 * normal yanıt) FARKLI `NextResponse` nesneleri üretiyor. Politika
 * hepsinde olmalı — bir yönlendirme yanıtının CSP'siz kalması, o yanıtı
 * koruma dışında bırakır.
 */
export function withCspHeader(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp)
  return response
}
