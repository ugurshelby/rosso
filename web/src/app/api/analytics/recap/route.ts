import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { apiAuth } from '@/lib/auth'
import {
  getTotalListeningTime,
  getTopTracks,
  getTopArtists,
  getHourlyPattern,
  getPlatformBreakdown,
} from '@/lib/analytics/engine'

const PeriodSchema = z.enum(['week', 'month', 'year', 'alltime'])

export async function GET(request: NextRequest) {
  // 1. Auth
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response
  const user = oturum.user

  // 2. Validate query params
  const { searchParams } = request.nextUrl
  const periodRaw = searchParams.get('period') ?? 'month'

  const parsed = PeriodSchema.safeParse(periodRaw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid period. Use: week, month, year, alltime' },
      { status: 400 }
    )
  }

  const period = parsed.data

  // 3. Fetch analytics data (all functions gracefully return empty on error)
  const [totalTime, topTracks, topArtists, hourlyPattern, platformBreakdown] =
    await Promise.all([
      getTotalListeningTime(user.id, period),
      getTopTracks(user.id, period, 5),
      getTopArtists(user.id, period, 5),
      getHourlyPattern(user.id, period),
      getPlatformBreakdown(user.id, period),
    ])

  return NextResponse.json(
    {
      totalTime,
      topTracks,
      topArtists,
      hourlyPattern,
      platformBreakdown,
    },
    { status: 200 }
  )
}
