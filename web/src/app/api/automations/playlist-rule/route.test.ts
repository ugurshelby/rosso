// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { POST, GET, DELETE } from './route'
import { createClient } from '@/lib/supabase/server'

function makeRequest(method: string, body?: unknown, url = 'http://localhost/api/automations/playlist-rule'): NextRequest {
  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest
}

function mockAuth(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

describe('POST /api/automations/playlist-rule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    )
    const res = await POST(makeRequest('POST', { target_platforms: ['spotify'] }))
    expect(res.status).toBe(401)
  })

  it('returns 422 for invalid rule_type', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    )
    const res = await POST(
      makeRequest('POST', { rule_type: 'not_a_real_type', target_platforms: ['spotify'] }),
    )
    expect(res.status).toBe(422)
  })

  it('returns 422 when target_platforms is empty', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    )
    const res = await POST(makeRequest('POST', { target_platforms: [] }))
    expect(res.status).toBe(422)
  })

  it('upserts rule with defaults and returns 200 + rule row', async () => {
    const upsertMock = vi.fn().mockReturnThis()
    const selectMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'rule-1', user_id: 'u1', rule_type: 'top_month', track_count: 50, target_platforms: ['spotify'], enabled: true, sort_by: 'plays' },
      error: null,
    })
    const client = {
      ...mockAuth({ id: 'u1' }),
      from: vi.fn(() => ({ upsert: upsertMock, select: selectMock, single: singleMock })),
    }
    vi.mocked(createClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(makeRequest('POST', { target_platforms: ['spotify'] }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rule.id).toBe('rule-1')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        rule_type: 'top_month', // varsayılan
        track_count: 50, // varsayılan
        sort_by: 'plays', // varsayılan
        enabled: true, // varsayılan
        target_platforms: ['spotify'],
      }),
      { onConflict: 'user_id,rule_type' },
    )
  })

  it('returns 500 on DB error', async () => {
    const client = {
      ...mockAuth({ id: 'u1' }),
      from: vi.fn(() => ({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db exploded' } }),
      })),
    }
    vi.mocked(createClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await POST(makeRequest('POST', { target_platforms: ['spotify'] }))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/automations/playlist-rule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    )
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns rules and recentRuns scoped to the user', async () => {
    const rulesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'rule-1' }] }),
    }
    const runsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 'run-1' }] }),
    }
    let call = 0
    const client = {
      ...mockAuth({ id: 'u1' }),
      from: vi.fn(() => {
        call++
        return call === 1 ? rulesChain : runsChain
      }),
    }
    vi.mocked(createClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rules).toEqual([{ id: 'rule-1' }])
    expect(json.recentRuns).toEqual([{ id: 'run-1' }])
  })
})

describe('DELETE /api/automations/playlist-rule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    )
    const res = await DELETE(makeRequest('DELETE', undefined, 'http://localhost/api/automations/playlist-rule?id=11111111-1111-4111-8111-111111111111'))
    expect(res.status).toBe(401)
  })

  it('returns 422 for missing/invalid id', async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockAuth({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    )
    const res = await DELETE(makeRequest('DELETE', undefined, 'http://localhost/api/automations/playlist-rule?id=not-a-uuid'))
    expect(res.status).toBe(422)
  })

  it('deletes rule scoped to user_id (cannot delete others\' rules)', async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    // Son .eq() çağrısı sonucu döner — Promise-like davranış için resolved value.
    deleteChain.eq.mockImplementation(function (this: typeof deleteChain) {
      return Object.assign(Promise.resolve({ error: null }), this)
    })
    const client = {
      ...mockAuth({ id: 'u1' }),
      from: vi.fn(() => deleteChain),
    }
    vi.mocked(createClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>)

    const ruleId = '11111111-1111-4111-8111-111111111111'
    const res = await DELETE(makeRequest('DELETE', undefined, `http://localhost/api/automations/playlist-rule?id=${ruleId}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.deleted).toBe(true)
    expect(deleteChain.eq).toHaveBeenCalledWith('id', ruleId)
    expect(deleteChain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })
})
