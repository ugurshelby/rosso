import type { NextRequest } from 'next/server'

/** İstemci IP — yalnızca geçici rate-limit anahtarı; loglanmaz/saklanmaz. */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
