// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

describe('systemLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('does not throw when DB insert fails', async () => {
    const { createServiceClient } = await import('@/lib/supabase/server')
    ;(createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      })),
    })

    const { systemLog } = await import('./system-logger')
    await expect(
      systemLog({ operation: 'test_op', severity: 'error', errorCode: 'TEST_ERROR' }),
    ).resolves.toBeUndefined()
  })

  it('writes correct fields without ip_addr', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null })
    const { createServiceClient } = await import('@/lib/supabase/server')
    ;(createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(() => ({ insert: insertFn })),
    })

    const { systemLog } = await import('./system-logger')
    await systemLog({
      userId: 'user-123',
      operation: 'export_upload',
      severity: 'error',
      errorCode: 'EXPORT_UPLOAD_FAILED',
      errorMessage: 'Storage write failed',
      relatedId: 'job-456',
    })

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        operation: 'export_upload',
        error_code: 'EXPORT_UPLOAD_FAILED',
        severity: 'error',
      }),
    )
    const callArg = insertFn.mock.calls[0][0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('ip_addr')
  })

  it('writes severity correctly for critical level', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null })
    const { createServiceClient } = await import('@/lib/supabase/server')
    ;(createServiceClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(() => ({ insert: insertFn })),
    })

    const { systemLog } = await import('./system-logger')
    await systemLog({
      operation: 'apple_auth',
      severity: 'critical',
      errorCode: 'APPLE_401_REAUTH_REQUIRED',
    })

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'critical',
        error_code: 'APPLE_401_REAUTH_REQUIRED',
      }),
    )
  })
})
