import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { apiAuth } from '@/lib/auth'
import { getTopTracks } from '@/lib/analytics/engine'

const QuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'alltime']),
  limit: z.coerce.number().int().min(1).max(50).default(5),
})

export async function GET(request: NextRequest) {
  // 1. Auth
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response
  const user = oturum.user

  // 2. Validate query params
  const { searchParams } = request.nextUrl
  const parsed = QuerySchema.safeParse({
    period: searchParams.get('period') ?? 'month',
    limit: searchParams.get('limit') ?? 5,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query params', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { period, limit } = parsed.data

  const tracks = await getTopTracks(user.id, period, limit)

  return NextResponse.json({ tracks }, { status: 200 })
}
