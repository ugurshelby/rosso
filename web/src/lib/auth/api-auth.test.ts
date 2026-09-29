import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `apiAuth` — API rotalarında oturum kapısı.
 *
 * Ölçülmüş kırık (2026-08-22): 16 API rotası `requireAuth()` kullanıyordu
 * ve o fonksiyon `redirect()` çağırıyor. Sonuç: oturumsuz `fetch()` isteği
 * **HTTP 307 + HTML login sayfası** alıyordu. İstemci `res.json()` deyince
 * ayrıştırma hatası veriyor, gerçek sebep ("oturum yok") kayboluyordu.
 *
 * Güvenlik açığı DEĞİLDİ — erişim engelleniyordu. Ama hata mesajı
 * okunamıyordu, yani kullanıcı anlamsız bir arıza görüyordu.
 */

/*
 * ─── ⚠ KARARSIZLIK (flaky) DÜZELTMESİ — 2026-08-25 ──────────────────────
 *
 * Bu dosyada eskiden İKİ mock yarışıyordu:
 *
 *   1. Dosya başında statik `vi.mock('@/lib/supabase/server', …)` →
 *      `createClient: vi.fn()`, yani çağrılınca **undefined** döner.
 *   2. Her testte `vi.doMock(…)` ile gerçek sahte istemci.
 *
 * `vi.mock` hoist edilir ve modül kaydına önce O yerleşir; `vi.doMock`
 * yalnız KENDİNDEN SONRAKİ import'lara etki eder. `resetModules()` bunu
 * telafi etmeye çalışıyordu ama tam paket koşusunda (82 dosya, paralel
 * yük) kayıt bazen statik mock'ta kalıyor ve şu hata düşüyordu:
 *
 *     TypeError: Cannot read properties of undefined (reading 'auth')
 *     ❯ src/lib/auth/index.ts:22  await supabase.auth.getUser()
 *
 * 6 turluk avda 1 kez yakalandı — kodla ilgisi yok, mock sırası yarışı.
 * Çözüm: statik mock KALDIRILDI, `doMock` tek otorite. Ayrıca
 * `getCurrentUserMock` tanımlıydı ama HİÇ kullanılmıyordu (ölü kod) —
 * o da kaldırıldı.
 *
 * Ders kaydı: `docs/reference/ogrenilen-dersler.md`
 */
vi.mock('react', async () => {
  const gercek = await vi.importActual<typeof import('react')>('react')
  return { ...gercek, cache: (fn: unknown) => fn }
})

beforeEach(() => {
  vi.resetModules()
})

async function apiAuthYukle(user: unknown) {
  vi.doMock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }),
  }))
  const mod = await import('./index')

  /*
   * Nöbetçi: mock gerçekten bağlandı mı? Bağlanmadıysa `createClient()`
   * undefined döner ve hata `index.ts` içinde, gerçek sebepten UZAKTA
   * patlar. Burada patlarsa sebep okunur olur.
   */
  const { createClient } = await import('@/lib/supabase/server')
  const istemci = await createClient()
  if (!istemci?.auth) {
    throw new Error(
      'supabase mock bağlanmadı — vi.doMock sırası bozulmuş olabilir (kararsızlık nöbetçisi)'
    )
  }

  return mod.apiAuth
}

describe('apiAuth', () => {
  it('🔴 oturum yoksa 401 döner — YÖNLENDİRMEZ', async () => {
    const apiAuth = await apiAuthYukle(null)
    const sonuc = await apiAuth()

    expect(sonuc.ok).toBe(false)
    if (sonuc.ok) return
    expect(sonuc.response.status, 'yönlendirme yapılıyor olabilir').toBe(401)
    expect(sonuc.response.headers.get('location'), '401 yanıtında location olmamalı').toBeNull()
  })

  it('401 gövdesi JSON ve okunabilir mesaj taşır', async () => {
    const apiAuth = await apiAuthYukle(null)
    const sonuc = await apiAuth()
    if (sonuc.ok) throw new Error('oturumsuzken ok:true dönmemeli')

    expect(sonuc.response.headers.get('content-type')).toContain('application/json')
    const govde = (await sonuc.response.json()) as { error?: string }
    expect(govde.error).toBeTruthy()
  })

  it('oturum varsa kullanıcıyı döner', async () => {
    const apiAuth = await apiAuthYukle({ id: 'kullanici-1' })
    const sonuc = await apiAuth()

    expect(sonuc.ok).toBe(true)
    if (!sonuc.ok) return
    expect(sonuc.user.id).toBe('kullanici-1')
  })

  it('Authorization: Bearer başlığı varsa kullanıcıyı doğrular (mobil istemci)', async () => {
    vi.doMock('next/headers', () => ({
      headers: async () => new Headers({ authorization: 'Bearer test-token-123' }),
    }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
      createServiceClient: async () => ({
        auth: {
          getUser: async (token: string) => {
            if (token === 'test-token-123') {
              return { data: { user: { id: 'mobil-kullanici-1' } }, error: null }
            }
            return { data: { user: null }, error: new Error('invalid') }
          },
        },
      }),
    }))
    const mod = await import('./index')
    const sonuc = await mod.apiAuth()

    expect(sonuc.ok).toBe(true)
    if (!sonuc.ok) return
    expect(sonuc.user.id).toBe('mobil-kullanici-1')
  })
})

