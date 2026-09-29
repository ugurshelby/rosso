import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * OAuth başlatma ucu testleri — FAZ KİMLİK-V2 (2026-08-13).
 *
 * Odak: **güvenlik davranışları**. Bu uç kullanıcıyı dış bir siteye
 * yönlendiriyor; doğrulanmayan her girdi bir açık yüzeyi.
 */

const signInWithOAuth = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signInWithOAuth } }),
}))

vi.mock('@/lib/platform-auth', () => ({
  getAppOrigin: () => 'https://rosso.test',
}))

/**
 * ⚠ KİMLİK-V2.1 (2026-08-14): artık İKİ kademeli bayrak var — ana şalter
 * + sağlayıcı başına şalter. Testin ikisini de kurması gerekiyor, aksi
 * hâlde her çağrı `provider_disabled`e düşer.
 */
const FLAG_KEYS = [
  'NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED',
  'NEXT_PUBLIC_AUTH_GOOGLE_ENABLED',
  'NEXT_PUBLIC_AUTH_SPOTIFY_ENABLED',
  'NEXT_PUBLIC_AUTH_APPLE_ENABLED',
] as const

const ORIGINAL_FLAGS = Object.fromEntries(
  FLAG_KEYS.map((k) => [k, process.env[k]])
) as Record<(typeof FLAG_KEYS)[number], string | undefined>

beforeEach(() => {
  signInWithOAuth.mockReset()
  signInWithOAuth.mockResolvedValue({
    data: { url: 'https://accounts.google.com/o/oauth2/auth?x=1' },
    error: null,
  })
  for (const k of FLAG_KEYS) process.env[k] = 'true'
})

afterEach(() => {
  for (const k of FLAG_KEYS) {
    const original = ORIGINAL_FLAGS[k]
    if (original === undefined) delete process.env[k]
    else process.env[k] = original
  }
})

async function call(provider: string, search = '') {
  const { GET } = await import('./route')
  const req = new NextRequest(`https://rosso.test/api/auth/oauth/${provider}${search}`)
  return GET(req, { params: Promise.resolve({ provider }) })
}

/*
 * ⏱ Bu dosyanın 3 `describe` bloğu da 15sn timeout alıyor (2026-08-26,
 * refine turu) — varsayılan 5000ms yerine.
 *
 * Tam paket koşusunda (84 dosya, paralel) ilk test `Test timed out in
 * 5000ms` ile kırıldı; izole koşumda (5 tur) ve sonraki tam koşuda (1 tur)
 * tamamen temizdi. Testlerin kendisi hafif (bir mock HTTP çağrısı) — asılma
 * kodda değil, paralel yükte event loop'un CPU zamanı bulamamasında.
 *
 * Aynı desen `bundle-secrets.test.ts`te de vardı (30sn'ye çıkarılmıştı).
 * Kalıp: dosya sayısı arttıkça hafif testler de yük altında yavaşlıyor —
 * gerçek bir asılma değilse timeout'u büyütmek doğru düzeltme. Tek bir
 * `it`'e değil dosyanın TÜMÜNE uygulandı: kırık ilk testte görüldü ama
 * yük her testi eşit etkiler, sıradaki de aynı riski taşır.
 */
describe('OAuth başlatma — sağlayıcı doğrulama', { timeout: 15_000 }, () => {
  it('geçerli sağlayıcıda Supabase URL\'ine yönlendirir', async () => {
    const res = await call('google')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(
      'https://accounts.google.com/o/oauth2/auth?x=1'
    )
  })

  it('bilinmeyen sağlayıcıyı reddeder — Supabase\'e HİÇ gitmez', async () => {
    const res = await call('facebook')
    expect(res.headers.get('location')).toContain('/login?error=unknown_provider')
    expect(signInWithOAuth).not.toHaveBeenCalled()
  })

  it('sağlayıcı adını hata mesajına YANSITMAZ', async () => {
    // Yansıtılan girdi küçük de olsa bir yüzeydir.
    const res = await call('<script>alert(1)</script>')
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('unknown_provider')
    expect(loc).not.toContain('script')
  })
})

describe('OAuth başlatma — açık yönlendirme koruması', { timeout: 15_000 }, () => {
  it('dış siteye giden `next` değerini reddeder', async () => {
    /*
     * ⚠ Bu testin konusu klasik bir open-redirect: saldırgan
     * `?next=https://evil.test` ile hazırladığı bağlantıyı paylaşır;
     * kullanıcı Rosso'da giriş yapar ve kendini saldırganın sitesinde
     * bulur. `safeNextPath` yalnız aynı-origin göreli yola izin verir.
     */
    for (const evil of [
      '?next=https://evil.test',
      '?next=//evil.test',
      '?next=/\\evil.test',
    ]) {
      signInWithOAuth.mockClear()
      await call('google', evil)
      const opts = signInWithOAuth.mock.calls[0][0]
      expect(opts.options.redirectTo).toContain('next=%2Fdashboard')
      expect(opts.options.redirectTo).not.toContain('evil.test')
    }
  })

  it('güvenli göreli yolu korur', async () => {
    await call('google', '?next=/playlists')
    const opts = signInWithOAuth.mock.calls[0][0]
    expect(opts.options.redirectTo).toContain('next=%2Fplaylists')
  })

  it('redirectTo daima kendi origin\'imize döner', async () => {
    await call('apple')
    const opts = signInWithOAuth.mock.calls[0][0]
    expect(opts.options.redirectTo.startsWith('https://rosso.test/api/auth/callback')).toBe(
      true
    )
  })
})

describe('OAuth başlatma — bayrak ve hata yolları', { timeout: 15_000 }, () => {
  it('ana bayrak kapalıyken akış hiç başlamaz', async () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED = 'false'
    const res = await call('google')
    expect(res.headers.get('location')).toContain('error=provider_disabled')
    expect(signInWithOAuth).not.toHaveBeenCalled()
  })

  it('🔴 sağlayıcı BAŞINA kapalıysa Supabase\'e GİTMEZ (Apple senaryosu)', async () => {
    /*
     * Sahibin Apple Developer hesabı yok (2026-08-14): düğme arayüzde
     * pasif gösteriliyor. Ama arayüzdeki kilit sunucudaki kilidin yerine
     * geçmez — adresi elle yazan biri Supabase'e ulaşıp ham "Unsupported
     * provider" hatasını görürdü.
     *
     * Bu test o boşluğu koruyor: Apple kapalı, Google açıkken Apple ucu
     * Supabase'e HİÇ gitmemeli, Google normal çalışmalı.
     */
    process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED = 'false'

    const appleRes = await call('apple')
    expect(appleRes.headers.get('location')).toContain('error=provider_disabled')
    expect(signInWithOAuth).not.toHaveBeenCalled()

    // Aynı anda Google etkilenmemeli — kilit sağlayıcıya özel.
    const googleRes = await call('google')
    expect(googleRes.status).toBe(302)
    expect(signInWithOAuth).toHaveBeenCalledTimes(1)
  })

  it('Supabase hata dönerse login\'e anlaşılır kodla döner', async () => {
    signInWithOAuth.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const res = await call('google')
    expect(res.headers.get('location')).toContain('error=oauth_start_failed')
  })

  it('Supabase url vermezse sessizce başarılı SAYMAZ', async () => {
    // `{ data: { url: undefined }, error: null }` — sessiz başarısızlık.
    signInWithOAuth.mockResolvedValue({ data: { url: undefined }, error: null })
    const res = await call('google')
    expect(res.headers.get('location')).toContain('error=oauth_start_failed')
  })
})
