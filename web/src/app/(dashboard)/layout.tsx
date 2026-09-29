import { requireAuth } from '@/lib/auth'
import { recoverIfSelfDeleted } from '@/lib/account/recovery'
import {
  getPhaseState,
  isRouteUnlocked,
  shouldShowPhasePanel,
  ROUTE_CAPABILITY,
} from '@/lib/phase/read'
import { PhasePanelLazy } from '@/components/phase/phase-panel-lazy'
import { refreshPlatformTokensIfNeeded } from '@/lib/services/token-refresh'
import { triggerSmartSyncIfNeeded } from '@/lib/services/spotify-sync-recently-played'
import { isTestUser } from '@/lib/auth/test-user'
import { getDashboardAlerts } from '@/lib/platform/dashboard-alerts'
import { Sidebar } from '@/components/nav/sidebar'
import { resolveAvatarUrl } from '@/components/user-avatar'
import { BottomNav } from '@/components/nav/bottom-nav'
import { ToastProvider } from '@/components/ui/toast'
import { SidebarProvider } from '@/lib/sidebar-context'
import { DashboardShell } from './dashboard-shell'
import { I18nServerProvider } from '@/lib/i18n/server-provider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  // Fire-and-forget: do not block dashboard layout render
  void recoverIfSelfDeleted(user.id).catch((err) => {
    console.error('[dashboard-layout] recoverIfSelfDeleted error:', err)
  })

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User'

  const [phaseState, showPhasePanel, dashboardAlerts] = await Promise.all([
    getPhaseState(user.id),
    shouldShowPhasePanel(user.id),
    getDashboardAlerts(user.id),
  ])
  const avatarUrl = resolveAvatarUrl(user.user_metadata)

  const lockedHrefs = Object.keys(ROUTE_CAPABILITY).filter(
    (href) => !isRouteUnlocked(href, phaseState),
  )

  // Organik / Test Profili Ayrımı:
  // Test kullanıcıları play_events verilerini test-fixtures'tan alır.
  // Spotify API ve token yenileme fonksiyonları test profilleri için HİÇ çağrılmaz.
  if (!isTestUser(user)) {
    void refreshPlatformTokensIfNeeded(user.id).catch((err) => {
      console.warn('[dashboard-layout] Platform token refresh hatası:', err)
    })
    // Akıllı Arka Plan Sync (Faz 3): Sayfayı asla bloklamaz (0ms gecikme),
    // 30 dk DB kota kalkanıyla son dinlenenleri sessizce taze tutar.
    void triggerSmartSyncIfNeeded(user.id).catch((err) => {
      console.warn('[dashboard-layout] Akıllı sync arka plan hatası:', err)
    })
  }

  return (
    /* Dil altyapısı (2026-09-24, docs/plans/yeni-kullanici-deneyimi-quick-start.md §13):
       alt ağaç kullanıcının diliyle `<div lang>` içinde çizilir ve istemci
       bileşenleri `useT()` kullanabilir. `namespaces` = istemciye gönderilecek
       sözlük yüzeyleri; yeni yüzey eklerken buraya da ekle (paket boyutu). */
    <I18nServerProvider namespaces={[
      'common', 'nav', 'lock', 'quickStart', 'onboarding',
      'dashboard', 'taste', 'playlists', 'settings', 'automations', 'data', 'mood',
      'catalog', 'shared', 'history', 'journey', 'recap',
    ]}>
    <ToastProvider>
      <SidebarProvider>
          <Sidebar
            displayName={displayName}
            avatarUrl={avatarUrl}
            lockedHrefs={lockedHrefs}
          />
          <DashboardShell
            avatarUrl={avatarUrl}
            displayName={displayName}
            alerts={dashboardAlerts}
          >
            {children}
          </DashboardShell>
          <BottomNav lockedHrefs={lockedHrefs} />
          {showPhasePanel && <PhasePanelLazy phase={phaseState.phase} />}
      </SidebarProvider>
    </ToastProvider>
    </I18nServerProvider>
  )
}
