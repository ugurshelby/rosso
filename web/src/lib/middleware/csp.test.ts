import { describe, it, expect, afterEach } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'
import { applyCspNonce, withCspHeader } from './csp'
import { CSP_NONCE_HEADER } from '@/lib/security/csp'

/**
 * Middleware CSP adımı testleri (2026-08-13).
 *
 * Buradaki testlerin ortak konusu tek bir cümle:
 * **nonce request başlığına yazılmazsa site donar.**
 * 2026-07-08'de olan tam olarak buydu (bkz. `src/lib/security/csp.ts`).
 */

/**
 * Gerçek `NextRequest` yerine testin ihtiyaç duyduğu yüzey.
 * Varsayılan yol `/dashboard` — dinamik (nonce alan) bir rota.
 */
function fakeRequest(
  headers: Record<string, string> = {},
  pathname = '/dashboard'
): NextRequest {
  return {
    headers: new Headers(headers),
    nextUrl: { pathname },
  } as unknown as NextRequest
}

const ORIGINAL_MODE = process.env.CSP_NONCE_MODE

afterEach(() => {
  if (ORIGINAL_MODE === undefined) delete process.env.CSP_NONCE_MODE
  else process.env.CSP_NONCE_MODE = ORIGINAL_MODE
})

describe('applyCspNonce', () => {
  it('nonce üretir ve REQUEST başlığına CSP yazar', () => {
    /*
     * En kritik test. Next nonce'u `parseRequestHeaders` içinde
     * gelen isteğin 'content-security-policy' başlığından okur.
     * Bu başlık eksikse Next nonce'u BİLMEZ, hydration script'lerine
     * basmaz, tarayıcı onları bloklar → beyaz ekran.
     */
    const { nonce, requestHeaders } = applyCspNonce(fakeRequest())

    expect(nonce).toBeTruthy()
    const requestCsp = requestHeaders.get('content-security-policy')
    expect(requestCsp).toContain(`'nonce-${nonce}'`)
  })

  it('nonce\'u ayrı bir okunabilir başlıkta da sunar', () => {
    const { nonce, requestHeaders } = applyCspNonce(fakeRequest())
    expect(requestHeaders.get(CSP_NONCE_HEADER)).toBe(nonce)
  })

  it('gelen isteğin diğer başlıklarını KORUR', () => {
    // Header kopyalanırken bir şey düşerse (ör. çerezler, auth başlığı)
    // oturum katmanı sessizce bozulur. Kopyanın tam olduğunu doğrula.
    const { requestHeaders } = applyCspNonce(
      fakeRequest({ cookie: 'sb-x-auth-token=abc', 'x-forwarded-for': '1.2.3.4' })
    )
    expect(requestHeaders.get('cookie')).toBe('sb-x-auth-token=abc')
    expect(requestHeaders.get('x-forwarded-for')).toBe('1.2.3.4')
  })

  it('iki ayrı istekte AYNI nonce\'u kullanmaz', () => {
    const a = applyCspNonce(fakeRequest())
    const b = applyCspNonce(fakeRequest())
    expect(a.nonce).not.toBe(b.nonce)
    expect(a.csp).not.toBe(b.csp)
  })

  it('CSP_NONCE_MODE=off → nonce üretmez, eski davranışa döner', () => {
    // Acil geri dönüş kapısı. Bu bozulursa production'da sorun çıktığında
    // geri dönüş yolu kalmaz — kazanın asıl maliyeti buydu.
    process.env.CSP_NONCE_MODE = 'off'
    const { nonce, csp, requestHeaders } = applyCspNonce(fakeRequest())

    expect(nonce).toBeNull()
    expect(csp).toContain("'unsafe-inline'")
    expect(csp).not.toContain('nonce-')
    expect(requestHeaders.get(CSP_NONCE_HEADER)).toBeNull()
  })

  it('kapalı modda bile REQUEST başlığına CSP yazılır', () => {
    // Tutarlılık: Next her iki modda da aynı yerden okusun.
    process.env.CSP_NONCE_MODE = 'off'
    const { requestHeaders } = applyCspNonce(fakeRequest())
    expect(requestHeaders.get('content-security-policy')).toContain("default-src 'self'")
  })
})

describe('applyCspNonce — nonce yalnız dinamik rotalara', () => {
  /*
   * ⚠ Bu blok doğrudan 2026-07-08 beyaz-ekran kazasının nöbetçisi.
   *
   * Statik sayfaların HTML'i build anında yazılır; içindeki RSC
   * hydration script'leri (`self.__next_f.push(...)`) nonce ALAMAZ
   * (2026-08-13 ölçümü: /login 8 inline script, 0 nonce). Onlara
   * nonce'lu + 'strict-dynamic' politika gitmesi = sayfa tamamen ölür.
   */
  it.each(['/login', '/', '/register', '/pricing', '/privacy', '/help'])(
    '%s için nonce ÜRETMEZ (yoksa sayfa beyaz ekrana düşer)',
    (pathname) => {
      const { nonce, csp } = applyCspNonce(fakeRequest({}, pathname))
      expect(nonce).toBeNull()
      expect(csp).not.toContain('nonce-')
      expect(csp).not.toContain('strict-dynamic')
      // Inline hydration script'leri çalışabilmeli:
      expect(csp).toContain("'unsafe-inline'")
      expect(csp).toContain("script-src 'self'")
    }
  )

  it('statik kökün ALT sayfaları da korunur (/blog/yazi-1)', () => {
    expect(applyCspNonce(fakeRequest({}, '/blog/bir-yazi')).nonce).toBeNull()
  })

  it.each([
    '/xyz-boyle-bir-sey-yok',
    '/rastgele/derin/yol',
    '/dashboardX',
  ])('%s (404\'e düşen tanımsız yol) nonce ALMAZ', (pathname) => {
    /*
     * ⚠ Canlıda ölçülen gerçek kırık (2026-08-13, production sunucusu):
     *
     *     GET /xyz-yok-boyle-bir-sey → 404
     *     CSP:  'nonce-S7Cxr+...' 'strict-dynamic'
     *     HTML: 6 inline script, 0 nonce'lu
     *
     * Tanımsız yollar Next'in statik `/_not-found` sayfasına düşer ama
     * pathname hiçbir statik yolla eşleşmediği için kara liste bunu
     * yakalayamıyordu. Beyaz listeye geçiş bu sınıfın tamamını kapattı.
     */
    expect(applyCspNonce(fakeRequest({}, pathname)).nonce).toBeNull()
  })

  it.each([
    '/dashboard',
    '/taste',
    '/artist/Radiohead',
    '/recap/2026-yaz',
  ])('%s dinamik — nonce ALIR (asıl korunması gereken yüzey)', (pathname) => {
    const { nonce, csp } = applyCspNonce(fakeRequest({}, pathname))
    expect(nonce).toBeTruthy()
    expect(csp).toContain(`'nonce-${nonce}'`)
    expect(csp.split('; ').find((d) => d.startsWith('script-src'))).not.toContain(
      'unsafe-inline'
    )
  })
})

describe('withCspHeader', () => {
  it('yanıta CSP başlığını yazar', () => {
    const res = withCspHeader(NextResponse.next(), "default-src 'self'")
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  })

  it('YÖNLENDİRME yanıtlarına da yazar', () => {
    /*
     * Pipeline üç farklı yanıt üretiyor: 429 · redirect · normal.
     * Bunlardan birinin CSP'siz kalması o yanıtı korumasız bırakır.
     * Yönlendirme özellikle önemli: /login'e giden yanıt da bir belge.
     */
    const res = withCspHeader(
      NextResponse.redirect(new URL('https://x.test/login')),
      "default-src 'self'"
    )
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  })

  it('429 (rate limit) yanıtına da yazar', () => {
    const res = withCspHeader(
      NextResponse.json({ error: 'çok fazla istek' }, { status: 429 }),
      "default-src 'self'"
    )
    expect(res.status).toBe(429)
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  })

  it('aynı nesneyi döndürür (zincirleme için)', () => {
    const res = NextResponse.next()
    expect(withCspHeader(res, "default-src 'self'")).toBe(res)
  })
})
