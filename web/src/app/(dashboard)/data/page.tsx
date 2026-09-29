import { Link2, History, Radio, FileQuestion } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SpotifyExport } from '../settings/spotify-export'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getByocStatus } from '@/lib/spotify/byoc'
import { getAppOrigin } from '@/lib/platform-auth'
import { PlatformConnectionsGrid } from '@/components/settings/platform-connections-grid'
import { SpotifyByocWizard } from '@/components/data/spotify-byoc-wizard'
import { SpotifyZipGuide } from '@/components/data/spotify-zip-guide'
import { getT } from '@/lib/i18n/server'
import styles from './data.module.css'

async function getPlatformStatuses(userId: string) {
  const supabase = await createClient()
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, is_active, last_synced_at, apple_reauth_required, subscription_active')
    .eq('user_id', userId)
    .eq('is_active', true)

  const byPlatform = Object.fromEntries(
    (connections ?? []).map((c) => [c.platform, c]),
  )

  // 2026-07-28 (plan 07): Rosso saf Spotify.
  const spotify = byPlatform['spotify']

  return [
    {
      platform: 'spotify' as const,
      displayName: 'Spotify',
      connected: Boolean(spotify?.is_active),
      lastSyncedAt: spotify?.last_synced_at ?? null,
    },
  ]
}

interface DataPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>
}

export default async function DataPage({ searchParams }: DataPageProps) {
  const user = await requireAuth()
  const { t } = await getT()
  const [platforms, byocStatus, params] = await Promise.all([
    getPlatformStatuses(user.id),
    getByocStatus(user.id),
    searchParams,
  ])

  /*
   * ⚠ "BYOC bağlı" ≠ "Spotify bağlı" (2026-09-23, Claude Code gözden geçirmesi).
   * Kullanıcı paylaşılan app'le bağlıyken BYOC kimliğini doğrulayıp OAuth'u
   * yarıda bırakabilir — o durumda Spotify bağlı AMA BYOC değil. Kilit kartı
   * yalnız bağlantı gerçekten BYOC app'iyle kurulduysa gösterilmeli
   * (`byocStatus.active`, migration 0341'in `oauth_client_id`'sinden gelir).
   */
  const isSpotifyConnected = byocStatus.active

  // Redirect URI ortama göre: prod'da your-app.example, yerelde 127.0.0.1:3847 —
  // sabit prod adresi yerel testte OAuth'u "uyuşmazlık"la kırardı.
  const redirectUri = `${getAppOrigin()}/api/spotify/callback`

  return (
    <>
      <PageHeader
        title={t('data.page.title')}
        subtitle={t('data.page.subtitle')}
      />

      <div className={styles.wrap}>
        {/*
          Yerleşim (2026-09-23, Sahip): önce "ne yapacağım" (iki rehber),
          sonra "yap" (bağlantı durumu + ZIP yükleme). Rehberler yükleme
          alanına "aşağıdaki" diye atıfta bulunur — sıra değişirse metni de güncelle.
        */}
        {/* ── Spotify Canlı Senkronizasyon (BYOC Sihirbazı) ── */}
        <section>
          <h2 className={styles.sectionLabel}>
            <Radio size={13} strokeWidth={1.75} aria-hidden />
            <span lang="en">SPOTIFY</span> {t('data.sections.liveSync').toUpperCase()}
          </h2>
          <SpotifyByocWizard
            initialStatus={byocStatus}
            isSpotifyConnected={isSpotifyConnected}
            errorCode={params.error}
            redirectUri={redirectUri}
          />
        </section>

        {/* ── Spotify Geçmiş Veri Alma Rehberi (ZIP) ── */}
        <section>
          <h2 className={styles.sectionLabel}>
            <FileQuestion size={13} strokeWidth={1.75} aria-hidden />
            <span lang="en">SPOTIFY</span> {t('data.sections.historyGuide').toUpperCase()}
          </h2>
          <SpotifyZipGuide />
        </section>

        {/* ── Platform Bağlantıları — 3 yan yana kart ── */}
        <section>
          <h2 className={styles.sectionLabel}>
            <Link2 size={13} strokeWidth={1.75} aria-hidden />
            {t('data.sections.connections')}
          </h2>
          <PlatformConnectionsGrid
            platforms={platforms}
            connectedPlatform={params.connected}
            errorCode={params.error}
          />
        </section>

        {/* ── Spotify Export (ZIP Yükleme & Geçmiş) ── */}
        <section>
          <h2 className={styles.sectionLabel}>
            <History size={13} strokeWidth={1.75} aria-hidden />
            {/* ⚠ "Spotify" ÖZEL İSİM. Başlık `text-transform: uppercase`
                taşıyor ve sayfa `lang="en"` — Türkçe kurallarında `i` → `İ`
                dönüyor, marka "SPOTİFY" olarak bozuluyordu (2026-08-14
                kullanıcı testi, Ş-30). Marka adı elle büyük yazılıp
                `lang="en"` ile locale dönüşümünden korunuyor. */}
            <span lang="en">SPOTIFY</span> {t('data.sections.listeningHistory')}
          </h2>
          <SpotifyExport />
        </section>

      </div>
    </>
  )
}

