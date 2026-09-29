import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { apiAuth } from '@/lib/auth'
import { getHourlyPattern, getWeekdayPattern } from '@/lib/analytics/engine'

const QuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'alltime']),
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
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid period. Use: week, month, year, alltime' },
      { status: 400 }
    )
  }

  const { period } = parsed.data

  const [hourly, weekday] = await Promise.all([
    getHourlyPattern(user.id, period),
    getWeekdayPattern(user.id, period),
  ])

  return NextResponse.json({ hourly, weekday }, { status: 200 })
}
