import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth'
import {
  getGenreDistribution,
  getChronotype,
  getLoyalArtists,
  getEraShift,
  type GenreDistribution,
  type ChronotypeSummary,
  type LoyalArtist,
  type EraShift,
} from '@/lib/analytics/identity'

export async function GET() {
  const oturum = await apiAuth()
  if (!oturum.ok) return oturum.response
  const user = oturum.user

  const [genre, chronotype, loyalArtists, eraShift] = await Promise.all([
    getGenreDistribution(user.id),
    getChronotype(user.id),
    getLoyalArtists(user.id, 5),
    getEraShift(user.id),
  ])

  const response: {
    genre: GenreDistribution
    chronotype: ChronotypeSummary
    loyalArtists: LoyalArtist[]
    eraShift: EraShift
  } = {
    genre,
    chronotype,
    loyalArtists,
    eraShift,
  }

  return NextResponse.json(response, { status: 200 })
}
