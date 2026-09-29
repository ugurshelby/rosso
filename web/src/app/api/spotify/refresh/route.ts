import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ensureValidToken } from '@/lib/services/token-refresh'

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await ensureValidToken(user.id, 'spotify')
  if (!token) {
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 502 })
  }

  return NextResponse.json({ success: true, refreshed: true })
}
