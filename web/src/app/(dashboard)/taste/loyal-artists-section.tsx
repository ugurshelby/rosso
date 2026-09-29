import { getLoyalArtists } from '@/lib/analytics/identity'
import { LoyalArtists } from '@/components/taste/loyal-artists'
import { getT } from '@/lib/i18n/server'

interface LoyalArtistsSectionProps {
  userId: string
}

/**
 * B2.4 (2026-07-19, gece oturumu performans turu): Taste'in en ağır sorgusu
 * (get_yearly_champion_artists RPC — tüm geçmişi yıl yıl tarar) ayrı async
 * bileşene taşındı — sayfanın hero/DNA bölümleri bunu beklemeden render olur,
 * bu bölüm <Suspense> ile ayrıca akar (page.tsx).
 */
export async function LoyalArtistsSection({ userId }: LoyalArtistsSectionProps) {
  const [loyalArtists, { t }] = await Promise.all([getLoyalArtists(userId), getT()])
  return <LoyalArtists artists={loyalArtists} t={t} />
}
