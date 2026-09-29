import { describe, it, expect } from 'vitest'
import {
  buildCsp,
  generateNonce,
  resolveCspMode,
  isStaticPrerenderedPath,
  STATIC_PRERENDERED_PATHS,
  CSP_NONCE_HEADER,
} from './csp'

/**
 * CSP nonce testleri (2026-08-13, FAZ GÜVENLİK).
 *
 * Bu testler bir davranışı değil, bir **kaza senaryosunu** koruyor:
 * 2026-07-08'de nonce'lu CSP production'ı dondurdu. Aşağıdaki her test,
 * o kazanın bir bileşenini yeniden yaşamamak için var.
 */

describe('generateNonce', () => {
  it('her çağrıda FARKLI değer üretir', () => {
    // Nonce'un tek şartı: tahmin edilemez ve tekrarlanmaz olması.
    // Aynı nonce iki istekte kullanılırsa saldırgan onu bir kez öğrenip
    // sonsuza dek kullanabilir — nonce olmaktan çıkar.
    const values = new Set(Array.from({ length: 200 }, () => generateNonce()))
    expect(values.size).toBe(200)
  })

  it('geçerli base64 üretir ve Next.js regex\'ine uyar', () => {
    /*
     * Next nonce'u KENDİ regex'iyle ayrıştırıyor:
     *   /^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/
     * (next/dist/server/app-render/get-script-nonce-from-header.js)
     *
     * Bu regex'e uymayan bir nonce SESSİZCE yok sayılır — Next nonce'u
     * bulamaz, script'lere basmaz, tarayıcı bloklar, sayfa donar.
     * Yani bu test doğrudan 2026-07-08 senaryosunun nöbetçisi.
     */
    const nextNonceRegex = /^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/
    for (let i = 0; i < 100; i++) {
      expect(`'nonce-${generateNonce()}'`).toMatch(nextNonceRegex)
    }
  })

  it('en az 128 bit entropi taşır (CSP Level 3 önerisi)', () => {
    // 16 bayt → base64'te 24 karakter (padding dahil)
    expect(generateNonce().length).toBeGreaterThanOrEqual(22)
  })
})

describe('resolveCspMode', () => {
  it('varsayılan "on" — güvenli taraf varsayılandır', () => {
    expect(resolveCspMode(undefined)).toBe('on')
    expect(resolveCspMode('')).toBe('on')
    expect(resolveCspMode('anything')).toBe('on')
  })

  it('yalnız açık "off" kapatır (büyük/küçük harf ve boşluk toleranslı)', () => {
    // Geri dönüş kapısı acil durumda kullanılacak; " OFF " gibi bir
    // yazım yüzünden çalışmaması kabul edilemez.
    expect(resolveCspMode('off')).toBe('off')
    expect(resolveCspMode('OFF')).toBe('off')
    expect(resolveCspMode('  Off  ')).toBe('off')
  })
})

describe('buildCsp — nonce modu', () => {
  const nonce = 'TESTnonce123456789012=='

  it('nonce\'u script-src\'e yazar', () => {
    expect(buildCsp(nonce, true)).toContain(`'nonce-${nonce}'`)
  })

  it("'strict-dynamic' içerir — chunk'lar aksi hâlde bloklanır", () => {
    /*
     * Next bootstrap script'i diğer chunk'ları dinamik yüklüyor.
     * 'strict-dynamic' olmadan her chunk ayrı izin isterdi ve
     * bulamayınca bloklanırdı → yine donmuş sayfa.
     */
    expect(buildCsp(nonce, true)).toContain("'strict-dynamic'")
  })

  it("nonce modunda script-src'te 'unsafe-inline' KALMAZ", () => {
    // Bu turun asıl kazancı. 'unsafe-inline' kalırsa nonce'un anlamı yok.
    const scriptSrc = buildCsp(nonce, true)
      .split('; ')
      .find((d) => d.startsWith('script-src'))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain('unsafe-inline')
  })

  it("production'da 'unsafe-eval' yok, development'ta var", () => {
    expect(buildCsp(nonce, true)).not.toContain("'unsafe-eval'")
    expect(buildCsp(nonce, false)).toContain("'unsafe-eval'")
  })
})

describe('buildCsp — kapalı mod (geri dönüş)', () => {
  it("nonce null ise eski 'unsafe-inline' davranışına döner", () => {
    // CSP_NONCE_MODE=off yolunun gerçekten çalışan bir site bıraktığını
    // doğrular — acil geri dönüşün işe yaraması buna bağlı.
    const csp = buildCsp(null, true)
    expect(csp).toContain("'unsafe-inline'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain('nonce-')
    expect(csp).not.toContain('strict-dynamic')
  })
})

describe('buildCsp — her iki modda korunan direktifler', () => {
  for (const [label, nonce] of [
    ['nonce modu', 'abc123=='],
    ['kapalı mod', null],
  ] as const) {
    it(`${label}: temel kısıtlamalar bozulmadan durur`, () => {
      const csp = buildCsp(nonce, true)
      // Bunlar mevcut korumalar — nonce turu bunları GEVŞETMEMELİ.
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain("base-uri 'self'")
      expect(csp).toContain("form-action 'self'")
      expect(csp).toContain('connect-src')
    })

    it(`${label}: Supabase bağlantısına izin sürüyor`, () => {
      // Kesilirse tüm veri katmanı ölür — sessiz ve yıkıcı.
      const csp = buildCsp(nonce, true)
      expect(csp).toContain('https://*.supabase.co')
      expect(csp).toContain('wss://*.supabase.co')
    })

    it(`${label}: Tailwind için style-src 'unsafe-inline' korunur`, () => {
      expect(buildCsp(nonce, true)).toContain("style-src 'self' 'unsafe-inline'")
    })

    /*
     * 2026-09-21: landing hero videoları Blob'a taşındı ve production'da
     * CSP tarafından SESSİZCE kesildi (`video.error.code = 4`). Konsol
     * dışında hiçbir belirti yoktu; sayfa yüklendi, yalnız video siyah
     * kaldı. Bu test o hatanın geri gelmesini engelliyor.
     */
    it(`${label}: Vercel Blob medyası açık ve kapsam DAR`, () => {
      const csp = buildCsp(nonce, true)
      expect(csp).toContain('media-src')
      expect(csp).toContain('https://*.public.blob.vercel-storage.com')
      // `media-src https:` yazılmamalı — dar kapsam bilinçli.
      expect(csp).not.toContain('media-src \'self\' blob: https:;')
    })
  }
})

describe('isStaticPrerenderedPath', () => {
  it('build çıktısındaki tüm statik rotaları tanır', () => {
    // Liste `next build` çıktısındaki `○ (Static)` satırlarından alındı.
    for (const p of STATIC_PRERENDERED_PATHS) {
      expect(isStaticPrerenderedPath(p)).toBe(true)
    }
  })

  it('kök "/" statiktir ama "/dashboard" değildir', () => {
    // `/` özel: startsWith('/') her yolu yakalardı — ayrı ele alınıyor.
    expect(isStaticPrerenderedPath('/')).toBe(true)
    expect(isStaticPrerenderedPath('/dashboard')).toBe(false)
    expect(isStaticPrerenderedPath('/profile')).toBe(false)
  })

  it('statik kökün alt yollarını da kapsar', () => {
    expect(isStaticPrerenderedPath('/blog/bir-yazi')).toBe(true)
    expect(isStaticPrerenderedPath('/help/sss')).toBe(true)
  })

  it('benzer ADLI dinamik yolları yanlışlıkla yakalamaz', () => {
    // '/login' statik ama '/logins' diye bir yol olsa dinamik olurdu.
    expect(isStaticPrerenderedPath('/loginx')).toBe(false)
    expect(isStaticPrerenderedPath('/pricing-plans')).toBe(false)
  })
})

describe('CSP_NONCE_HEADER', () => {
  it('Next\'in kendi başlıklarıyla çakışmayan bir ad kullanır', () => {
    expect(CSP_NONCE_HEADER).toBe('x-rosso-csp-nonce')
    expect(CSP_NONCE_HEADER.startsWith('x-middleware')).toBe(false)
    expect(CSP_NONCE_HEADER.startsWith('x-next')).toBe(false)
  })
})
