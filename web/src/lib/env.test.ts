import { describe, expect, it } from 'vitest'

import { parseServerEnv } from './env'

describe('parseServerEnv', () => {
  it('throws when required server variables are missing', () => {
    expect(() =>
      parseServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).toThrow()
  })

  it('parses when required server variables are present', () => {
    const env = parseServerEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    })

    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('service-role-key')
  })
})
