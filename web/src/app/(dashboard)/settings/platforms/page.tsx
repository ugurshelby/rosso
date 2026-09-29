import { PageHeader } from '@/components/ui/page-header'
import { PlatformConnectionsSection } from '@/components/settings/platform-connections-section'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSpotifyAccessStatus, spotifyEpostasiBiliniyorMu } from '@/lib/spotify/allowlist'
import { begeniYazmaIzniVarMi } from '@/lib/spotify/scope-durumu'
import { getT } from '@/lib/i18n/server'

async function getPlatformStatuses(userId: string) {
  const supabase = await createClient()

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, is_active, last_synced_at, apple_reauth_required, subscription_active')
    .eq('user_id', userId)
    .in('platform', ['spotify'])

  const byPlatform = Object.fromEntries(
    (connections ?? []).map((c) => [c.platform, c]),
  )

  // 2026-07-28 (plan 07): Rosso saf Spotify — YT Music + Apple Music kaldırıldı.
  const spotify = byPlatform['spotify']

  // 2026-08-05: beğeni yazma izni (`user-library-modify`) o tarihte eklendi.
  // Daha önce bağlanmış hesaplarda yok → kalp butonu 403 alır. Kullanıcı
  // bunu ancak burada görüp yeniden bağlanarak çözebilir.
  const eskiBaglanti =
    Boolean(spotify?.is_active) &&
    !(await begeniYazmaIzniVarMi(userId))

  return [
    {
      platform: 'spotify' as const,
      displayName: 'Spotify',
      connected: Boolean(spotify?.is_active),
      lastSyncedAt: spotify?.last_synced_at ?? null,
      reAuthRequired: eskiBaglanti,
    },
  ]
}

interface PlatformsPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>
}

export default async function PlatformsPage({ searchParams }: PlatformsPageProps) {
  const user = await requireAuth()
  const { t } = await getT()
  const [platforms, params, spotifyAccess, spotifyEmailBiliniyor] = await Promise.all([
    getPlatformStatuses(user.id),
    searchParams,
    // FAZ 6: Spotify sınırlı beta'da. Kullanıcı bağlantıyı kurmuş ama allowlist'e
    // henüz eklenmemişse verisi akmaz — bunu banner'ın ötesinde, sayfaya her
    // gelişinde görmeli. Yoksa "neden boş?" sorusuyla baş başa kalır.
    getSpotifyAccessStatus(user.id),
    // B17: e-posta zaten kayıtlıysa form gösterilmez.
    spotifyEpostasiBiliniyorMu(user.id),
  ])

  return (
    <>
      <PageHeader
        title={t('settings.platformsPage.title')}
        subtitle={t('settings.platformsPage.subtitle')}
      />
      <PlatformConnectionsSection
        platforms={platforms}
        connectedPlatform={params.connected}
        errorCode={params.error}
        spotifyAccess={spotifyAccess}
        spotifyEmailBiliniyor={spotifyEmailBiliniyor}
      />
    </>
  )
}
