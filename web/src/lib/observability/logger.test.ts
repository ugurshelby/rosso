// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

describe('redactMetadata', () => {
  it('drops ip_addr and ip-like keys entirely', async () => {
    const { redactMetadata } = await import('./logger')
    const out = redactMetadata({ ip_addr: '1.2.3.4', client_ip: '5.6.7.8', ok: 1 }) as Record<
      string,
      unknown
    >
    expect(out).not.toHaveProperty('ip_addr')
    expect(out).not.toHaveProperty('client_ip')
    expect(out.ok).toBe(1)
  })

  it('masks token/secret/password values', async () => {
    const { redactMetadata } = await import('./logger')
    const out = redactMetadata({
      access_token: 'abc',
      refreshToken: 'def',
      password: 'p',
      api_key: 'k',
      safe: 'value',
    }) as Record<string, unknown>
    expect(out.access_token).toBe('[REDACTED]')
    expect(out.refreshToken).toBe('[REDACTED]')
    expect(out.password).toBe('[REDACTED]')
    expect(out.api_key).toBe('[REDACTED]')
    expect(out.safe).toBe('value')
  })

  it('redacts nested objects and arrays', async () => {
    const { redactMetadata } = await import('./logger')
    const out = redactMetadata({
      nested: { token: 't', items: [{ secret: 's', name: 'n' }] },
    }) as Record<string, Record<string, unknown>>
    expect(out.nested.token).toBe('[REDACTED]')
    const items = out.nested.items as Array<Record<string, unknown>>
    expect(items[0].secret).toBe('[REDACTED]')
    expect(items[0].name).toBe('n')
  })
})

describe('systemLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('writes redacted metadata without ip_addr', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null })
    const { createServiceClient } = await import('@/lib/supabase/server')
    ;(createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(() => ({ insert: insertFn })),
    })

    const { systemLog } = await import('./logger')
    await systemLog({
      operation: 'apple_auth',
      severity: 'error',
      metadata: { ip_addr: '1.2.3.4', access_token: 'secret', detail: 'ok' },
    })

    const callArg = insertFn.mock.calls[0][0] as { metadata: Record<string, unknown> }
    expect(callArg.metadata).not.toHaveProperty('ip_addr')
    expect(callArg.metadata.access_token).toBe('[REDACTED]')
    expect(callArg.metadata.detail).toBe('ok')
  })

  it('does not throw when DB insert fails', async () => {
    const { createServiceClient } = await import('@/lib/supabase/server')
    ;(createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(() => ({ insert: vi.fn().mockRejectedValue(new Error('DB down')) })),
    })

    const { systemLog } = await import('./logger')
    await expect(systemLog({ operation: 'x', severity: 'error' })).resolves.toBeUndefined()
  })
})
