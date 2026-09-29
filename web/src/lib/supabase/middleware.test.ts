import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Middleware çerez kapısı testleri (Bulgu 0.1-A, 2026-07-30).
 *
 * NEDEN VAR: Bu değişiklik AUTH KAPISINA dokunuyor. Kazanç gerçek (oturumsuz
 * isteklerde Supabase turu atlanıyor) ama yanlış yazılırsa iki felaket mümkün:
 *   1. Korumalı sayfa oturumsuz açılır  → veri sızıntısı
 *   2. Oturumlu kullanıcı login'e atılır → herkes dışarıda kalır
 *
 * Testler bu ikisini de kapatıyor. `auth.getUser` casus fonksiyonla izleniyor;
 * "çağrıldı mı" sorusu kazancın KANITI, "ne döndü" sorusu güvenliğin kanıtı.
 */

const getUserSpy = vi.fn()

/*
 * 2026-09-25: middleware `getUser()` yerine `getClaims()` kullanıyor. Testler
 * "Supabase'e soruldu mu / ne döndü" sorusunu aynı casusla sormaya devam etsin
 * diye `getClaims`, casusun `{ data: { user } }` cevabını `{ data: { claims } }`
 * biçimine çevirir. Casusun adı tarihsel; ölçtüğü şey "kimlik doğrulaması".
 */
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => {
        const r = (await getUserSpy()) as { data: { user: { id: string } | null } }
        return { data: r.data.user ? { claims: { sub: r.data.user.id } } : null, error: null }
      },
      signOut: vi.fn(),
    },
  }),
}))

import { updateSession } from './middleware'
import type { NextRequest } from 'next/server'

/** Gerçek NextRequest yerine testin ihtiyaç duyduğu en küçük şekil. */
function makeRequest(pathname: string, cookieNames: string[] = []): NextRequest {
  const url = new URL(`https://rosso.test${pathname}`)
  return {
    nextUrl: Object.assign(url, { clone: () => new URL(url.toString()) }),
    url: url.toString(),
    cookies: {
      getAll: () => cookieNames.map((name) => ({ name, value: 'x' })),
      set: vi.fn(),
    },
    headers: new Headers(),
    method: 'GET',
  } as unknown as NextRequest
}

/** `@supabase/ssr`'ın gerçek adlandırması: sb-<project-ref>-auth-token[.N] */
const AUTH_COOKIE = 'sb-your-project-ref-auth-token'

beforeEach(() => {
  getUserSpy.mockReset()
  getUserSpy.mockResolvedValue({ data: { user: null } })
})

describe('middleware çerez kapısı — kazanç', () => {
  it('çerez YOKSA kök sayfası normal (200) açılır, Supabase’e HİÇ gitmez', async () => {
    const res = await updateSession(makeRequest('/'))

    expect(getUserSpy).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('çerez YOKSA yasal metinde Supabase’e gitmez', async () => {
    for (const path of ['/help', '/privacy']) {
      getUserSpy.mockReset()
      const res = await updateSession(makeRequest(path))
      expect(getUserSpy, `${path} için çağrı yapılmamalı`).not.toHaveBeenCalled()
      expect(res.status, path).toBe(200)
    }
  })

  it('çerez YOKSA fiyat/blog normal (200) açılır', async () => {
    for (const path of ['/pricing', '/blog', '/blog/bir-yazi']) {
      getUserSpy.mockReset()
      const res = await updateSession(makeRequest(path))
      expect(getUserSpy, `${path} için çağrı yapılmamalı`).not.toHaveBeenCalled()
      expect(res.status, path).toBe(200)
    }
  })

  it('çerez YOKSA kayıt sayfası (/register) açılır, login’e düşmez', async () => {
    const res = await updateSession(makeRequest('/register'))
    expect(getUserSpy).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('bot/robots.txt gibi istekler de bedava geçer', async () => {
    await updateSession(makeRequest('/robots.txt'))
    expect(getUserSpy).not.toHaveBeenCalled()
  })
})

describe('middleware çerez kapısı — güvenlik', () => {
  it('çerez YOKSA korumalı sayfa login’e YÖNLENDİRİLİR (sızıntı yok)', async () => {
    const res = await updateSession(makeRequest('/dashboard'))

    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    // Kullanıcı giriş sonrası geldiği yere dönebilmeli
    expect(location.searchParams.get('next')).toBe('/dashboard')
    // Kazanç burada da geçerli: yönlendirme için Supabase'e sormaya gerek yok
    expect(getUserSpy).not.toHaveBeenCalled()
  })

  it('her korumalı alt-ağaç kapalı kalır', async () => {
    for (const path of ['/settings/automations', '/taste', '/playlists/abc']) {
      const res = await updateSession(makeRequest(path))
      expect(res.status, `${path} korumalı olmalı`).toBe(307)
    }
  })

  it('çerez VARSA tam doğrulama eskisi gibi çalışır', async () => {
    await updateSession(makeRequest('/dashboard', [AUTH_COOKIE]))

    // Kapı yalnız "sormaya değer mi" diyor; gerçek doğrulama hâlâ Supabase'de
    expect(getUserSpy).toHaveBeenCalledTimes(1)
  })

  it('SAHTE çerez kapıdan geçer ama getUser’a takılır — güvenlik yüzeyi değişmez', async () => {
    getUserSpy.mockResolvedValue({ data: { user: null } })

    const res = await updateSession(makeRequest('/dashboard', [AUTH_COOKIE]))

    expect(getUserSpy).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })

  it('parçalanmış çerez (.0 / .1) de tanınır', async () => {
    await updateSession(makeRequest('/dashboard', [`${AUTH_COOKIE}.0`, `${AUTH_COOKIE}.1`]))

    expect(getUserSpy).toHaveBeenCalledTimes(1)
  })

  it('alakasız çerezler kapıyı AÇMAZ', async () => {
    await updateSession(makeRequest('/dashboard', ['theme', 'sb-locale', 'analytics-id']))

    expect(getUserSpy).not.toHaveBeenCalled()
  })
})

describe('middleware — oturumlu kullanıcı', () => {
  it('login sayfasına giden oturumlu kullanıcı dashboard’a gider', async () => {
    getUserSpy.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const res = await updateSession(makeRequest('/login', [AUTH_COOKIE]))

    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard')
  })

  it('oturumlu kullanıcı login?error= ile hatayı GÖRÜR (sessizce dashboard’a atılmaz)', async () => {
    getUserSpy.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const res = await updateSession(makeRequest('/login?error=auth_failed', [AUTH_COOKIE]))

    expect(res.status).toBe(200)
  })

  it('oturumlu kullanıcı login?next= ile güvenli hedefe gider', async () => {
    getUserSpy.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = makeRequest('/login?next=/taste', [AUTH_COOKIE])
    const res = await updateSession(req)

    expect(new URL(res.headers.get('location')!).pathname).toBe('/taste')
  })

  it('oturumlu kullanıcı login?next= open redirect ile dashboard’a düşer', async () => {
    getUserSpy.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = makeRequest('/login?next=//evil.com', [AUTH_COOKIE])
    const res = await updateSession(req)

    expect(new URL(res.headers.get('location')!).pathname).toBe('/dashboard')
  })

  it('çerezsiz ziyaretçi login sayfasını görebilir (yönlendirme döngüsü yok)', async () => {
    const res = await updateSession(makeRequest('/login'))

    expect(res.status).toBe(200)
    expect(getUserSpy).not.toHaveBeenCalled()
  })

  it('oturumlu kullanıcı korumalı yola erişebilir (dashboard’a zorlanmaz)', async () => {
    getUserSpy.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } })

    const res = await updateSession(makeRequest('/taste', [AUTH_COOKIE]))

    expect(res.status).toBe(200)
  })
})


describe('middleware — görsel proxy auth turu (2026-09-24 performans)', () => {
  it('/api/images/* için oturumlu istekte bile Supabase’e GİTMEZ (rota apiAuth ile doğrular)', async () => {
    for (const path of ['/api/images/track/abc', '/api/images/tracks?ids=a,b', '/api/images/artist?name=X']) {
      getUserSpy.mockReset()
      const res = await updateSession(makeRequest(path, [AUTH_COOKIE]))
      expect(getUserSpy, `${path} için çağrı yapılmamalı`).not.toHaveBeenCalled()
      expect(res.status, path).toBe(200)
    }
  })

  it('diğer API yolları ve sayfalar eskisi gibi oturum turunu yapar', async () => {
    getUserSpy.mockResolvedValue({ data: { user: { id: 'u1' } } })
    for (const path of ['/api/quick-start', '/dashboard', '/api/imagesX']) {
      getUserSpy.mockClear()
      await updateSession(makeRequest(path, [AUTH_COOKIE]))
      expect(getUserSpy, `${path} için çağrı yapılmalı`).toHaveBeenCalledTimes(1)
    }
  })
})
