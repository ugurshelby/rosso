// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateJsonBody, validateSearchParams, invalidInput } from './validate'

const Schema = z.object({ name: z.string().min(1), count: z.number().int() })

function jsonRequest(body: unknown): Request {
  return new Request('http://test/api', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('validateJsonBody', () => {
  it('returns typed data on valid body', async () => {
    const out = await validateJsonBody(jsonRequest({ name: 'a', count: 2 }), Schema)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data).toEqual({ name: 'a', count: 2 })
  })

  it('returns 422 on schema mismatch', async () => {
    const out = await validateJsonBody(jsonRequest({ name: '', count: 'x' }), Schema)
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.response.status).toBe(422)
  })

  it('returns 422 on non-JSON body', async () => {
    const bad = new Request('http://test/api', { method: 'POST', body: 'not json' })
    const out = await validateJsonBody(bad, Schema)
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.response.status).toBe(422)
  })
})

describe('validateSearchParams', () => {
  const QuerySchema = z.object({ period: z.enum(['month', 'year', 'all']) })

  it('validates query params', () => {
    const out = validateSearchParams(new URLSearchParams('period=year'), QuerySchema)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data.period).toBe('year')
  })

  it('rejects invalid query params with 422', () => {
    const out = validateSearchParams(new URLSearchParams('period=decade'), QuerySchema)
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.response.status).toBe(422)
  })
})

describe('invalidInput', () => {
  it('builds a 422 response', () => {
    expect(invalidInput().status).toBe(422)
  })
})
