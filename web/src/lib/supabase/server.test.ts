import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mobil Bearer kanalı (PLAN 4.2, M5). Güvenlik kilidi:
 * - çerez varsa Bearer YOK SAYILIR (web oturumu kazanır),
 * - JWT biçiminde olmayan Bearer (cron/worker sırrı) kullanıcı token'ı sayılmaz,
 * - Bearer istemcisi token'ı PostgREST'e taşır ve `getUser()`'ı onunla doğrular.
 */
let cerezler: Array<{ name: string; value: string }> = []
let basliklar = new Headers()
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => cerezler, set: vi.fn() }),
  headers: async () => basliklar,
}))

const sunucuIstemcisi = { tur: 'cerez' }
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => sunucuIstemcisi) }))

const getUserMock = vi.fn(async (jwt?: string) => ({ data: { user: jwt ? { id: `u:${jwt.slice(-3)}` } : null } }))
const getClaimsMock = vi.fn(async (jwt?: string) => ({ data: jwt ? { claims: { sub: 'x' } } : null }))
const yaratilan: Array<{ anahtar: string; secenek: Record<string, unknown> }> = []
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url: string, anahtar: string, secenek: Record<string, unknown>) => {
    yaratilan.push({ anahtar, secenek })
    return { tur: 'bearer', auth: { getUser: getUserMock, getClaims: getClaimsMock } }
  }),
}))

import { bearerToken, createClient } from './server'

const JWT = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1MSJ9.imzaABC'

beforeEach(() => {
  cerezler = []
  basliklar = new Headers()
  yaratilan.length = 0
  getUserMock.mockClear()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ornek.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
})

describe('bearerToken', () => {
  it('çerez yok + JWT biçimli Bearer → token', async () => {
    basliklar.set('authorization', `Bearer ${JWT}`)
    expect(await bearerToken()).toBe(JWT)
  })

  it('oturum çerezi varsa Bearer yok sayılır', async () => {
    cerezler = [{ name: 'sb-ornek-auth-token', value: 'x' }]
    basliklar.set('authorization', `Bearer ${JWT}`)
    expect(await bearerToken()).toBeNull()
  })

  it('JWT biçiminde olmayan sır (CRON_SECRET) kullanıcı token\'ı sayılmaz', async () => {
    basliklar.set('authorization', 'Bearer cok-gizli-cron-sirri')
    expect(await bearerToken()).toBeNull()
  })

  it('Bearer olmayan başlık ya da boş başlık → null', async () => {
    basliklar.set('authorization', `Basic ${JWT}`)
    expect(await bearerToken()).toBeNull()
    basliklar = new Headers()
    expect(await bearerToken()).toBeNull()
  })
})

describe('createClient', () => {
  it('Bearer varsa anon anahtarlı istemci token\'ı başlıkla taşır, getUser token\'la doğrular', async () => {
    basliklar.set('authorization', `Bearer ${JWT}`)
    const istemci = (await createClient()) as unknown as { tur: string; auth: { getUser: () => Promise<unknown> } }
    expect(istemci.tur).toBe('bearer')
    expect(yaratilan[0].anahtar).toBe('anon')
    expect(yaratilan[0].secenek).toMatchObject({
      global: { headers: { Authorization: `Bearer ${JWT}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    await istemci.auth.getUser()
    expect(getUserMock).toHaveBeenCalledWith(JWT)
  })

  it('Bearer yoksa çerez istemcisi (web) döner', async () => {
    expect(await createClient()).toBe(sunucuIstemcisi)
    expect(yaratilan).toHaveLength(0)
  })

  it('çerez + Bearer birlikteyse çerez istemcisi döner', async () => {
    cerezler = [{ name: 'sb-ornek-auth-token.0', value: 'x' }]
    basliklar.set('authorization', `Bearer ${JWT}`)
    expect(await createClient()).toBe(sunucuIstemcisi)
  })
})
