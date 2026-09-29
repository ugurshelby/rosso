import { describe, expect, it, vi, beforeEach } from 'vitest'

// next/navigation redirect — çağrıldığında özel bir hata fırlatır (Next.js davranışını taklit)
const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

// Supabase server client mock — auth.getUser dönüşünü test başına ayarlarız
const getUserMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}))

import { getCurrentUser, requireAuth } from './index'

beforeEach(() => {
  redirectMock.mockClear()
  getUserMock.mockReset()
})

describe('getCurrentUser', () => {
  it('oturum yokken null döner', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    await expect(getCurrentUser()).resolves.toBeNull()
  })

  it('oturum varken user döner', async () => {
    const user = { id: 'u1', email: 'a@b.com' }
    getUserMock.mockResolvedValue({ data: { user }, error: null })
    await expect(getCurrentUser()).resolves.toEqual(user)
  })

  it('hata durumunda null döner (patlamaz)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'boom' } })
    await expect(getCurrentUser()).resolves.toBeNull()
  })
})

describe('requireAuth', () => {
  it('oturum yokken /login?next= ile redirect tetikler', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    await expect(requireAuth('/dashboard')).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=%2Fdashboard'
    )
    expect(redirectMock).toHaveBeenCalledWith('/login?next=%2Fdashboard')
  })

  it('next verilmezse sade /login redirect', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('oturum varken user döner, redirect etmez', async () => {
    const user = { id: 'u1', email: 'a@b.com' }
    getUserMock.mockResolvedValue({ data: { user }, error: null })
    await expect(requireAuth('/dashboard')).resolves.toEqual(user)
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
