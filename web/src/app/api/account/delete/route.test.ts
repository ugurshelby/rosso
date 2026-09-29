// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn() }))

function jsonReq(body: unknown) {
  return new Request('http://test/api/account/delete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const VALID = { password: 'pw', confirm: 'DELETE MY ACCOUNT' }

/*
 * ⏱ Zaman aşımı 5sn → 20sn (2026-08-10, ÖLÇÜLDÜ).
 *
 * Bu dosya paralel tam koşuda düşüyor, tek başına 6/6 geçiyordu (6513ms vs
 * eşik 5000ms). Sebep mantık değil ÖLÇÜ: her test `vi.resetModules()` sonrası
 * `await import('./route')` yapıyor, yani İLK test route'u ve tüm bağımlılık
 * ağacını (`next/server` + `zod`) sıfırdan derliyor. Sonraki 5 test cache'li
 * olduğu için hızlı — bu yüzden hep aynı test düşüyordu.
 *
 * 🚫 Global `testTimeout` YÜKSELTİLMEDİ: o, 515 testin tamamını gerçek
 *    takılmalara karşı körleştirirdi. Nefes payı yalnız sebebi ölçülmüş olan
 *    bu dosyaya verildi.
 */
describe('POST /api/account/delete', { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  function mockClients(opts: {
    user?: { id: string; email: string } | null
    reauthError?: boolean
    deleteError?: boolean
    alreadyDeleted?: boolean
  }) {
    // Hesap silme SOFT-delete: account_deletions'a satır eklenir (migration 0354).
    const insertFn = vi.fn().mockResolvedValue({ error: opts.deleteError ? { message: 'fail' } : null })
    const selectMaybe = vi.fn().mockResolvedValue({
      data: opts.alreadyDeleted ? { deleted_at: '2026-07-01T00:00:00Z' } : null,
    })
    return import('@/lib/supabase/server').then((mod) => {
      ;(mod.createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null } }),
          signInWithPassword: vi
            .fn()
            .mockResolvedValue({ error: opts.reauthError ? { message: 'bad' } : null }),
          signOut: vi.fn().mockResolvedValue({}),
        },
      })
      ;(mod.createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: selectMaybe })) })),
          insert: insertFn,
        })),
      })
      return { insertFn }
    })
  }

  it('rejects unauthenticated users with 401', async () => {
    await mockClients({ user: null })
    const { POST } = await import('./route')
    const res = await POST(jsonReq(VALID) as never)
    expect(res.status).toBe(401)
  })

  it('rejects invalid confirmation text with 422', async () => {
    await mockClients({ user: { id: 'u1', email: 'a@b.com' } })
    const { POST } = await import('./route')
    const res = await POST(jsonReq({ password: 'pw', confirm: 'nope' }) as never)
    expect(res.status).toBe(422)
  })

  it('rejects wrong password with 403', async () => {
    await mockClients({ user: { id: 'u1', email: 'a@b.com' }, reauthError: true })
    const { POST } = await import('./route')
    const res = await POST(jsonReq(VALID) as never)
    expect(res.status).toBe(403)
  })

  it('soft-deletes the profile on success (not hard-delete)', async () => {
    const { insertFn } = await mockClients({
      user: { id: 'u1', email: 'a@b.com' },
    })
    const { POST } = await import('./route')
    const res = await POST(jsonReq(VALID) as never)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { soft_deleted?: boolean }
    expect(body.soft_deleted).toBe(true)
    // account_deletions'a satır eklendi (sosyal profil satırı OLMAYAN V2 kullanıcısı için de).
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', deleted_by: 'self', deleted_reason: 'user_requested' }),
    )
  })

  it('is idempotent when already soft-deleted', async () => {
    await mockClients({ user: { id: 'u1', email: 'a@b.com' }, alreadyDeleted: true })
    const { POST } = await import('./route')
    const res = await POST(jsonReq(VALID) as never)
    expect(res.status).toBe(200)
  })

  it('returns 500 if soft-delete insert fails', async () => {
    await mockClients({ user: { id: 'u1', email: 'a@b.com' }, deleteError: true })
    const { POST } = await import('./route')
    const res = await POST(jsonReq(VALID) as never)
    expect(res.status).toBe(500)
  })
})
