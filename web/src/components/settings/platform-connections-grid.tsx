'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useT } from '@/lib/i18n/provider'
import type { Translator } from '@/lib/i18n/translate'
import styles from './platform-connections-grid.module.css'

// 2026-07-28 (plan 07): Rosso saf Spotify.
type PlatformId = 'spotify'

interface PlatformStatus {
  platform: PlatformId
  displayName: string
  connected: boolean
  reAuthRequired?: boolean
  lastSyncedAt?: string | null
}

interface PlatformConnectionsGridProps {
  platforms: PlatformStatus[]
  connectedPlatform?: string
  errorCode?: string
}

function platformLabels(): Record<string, string> {
  return { spotify: 'Spotify' }
}

function errorMessages(t: Translator['t']): Record<string, string> {
  return {
    spotify_denied: t('settings.platformConnections.errors.spotifyDenied'),
    spotify_state_mismatch: t('settings.platformConnections.errors.spotifyStateMismatch'),
    spotify_token_failed: t('settings.platformConnections.errors.spotifyTokenFailed'),
    spotify_config: t('settings.platformConnections.errors.spotifyConfig'),
    spotify_db: t('settings.platformConnections.errors.spotifyDb'),
    // BYOC (2026-09-23): BYOC akışının OAuth dönüşü artık `/data`'ya geliyor.
    spotify_byoc_redirect_uri: t('settings.platformConnections.errors.spotifyByocRedirectUri'),
    spotify_pending_access: t('settings.platformConnections.errors.spotifyPendingAccess'),
  }
}

const PLATFORM_META: Record<PlatformId, {
  /** Ham marka rengi. Karıştırma/alfa kararları CSS'te (`color-mix`) — burada
      türetilmiş varyant tutulmaz (E-FAZ 2, 2026-08-02: `bgGlow` kaldırıldı). */
  color: string
  icon: string
}> = {
  spotify: {
    color: '#1DB954',
    icon: '♪',
  },
}

function formatLastSync(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function PlatformCard({
  platform,
  displayName,
  connected,
  reAuthRequired,
  lastSyncedAt,
  isConnecting,
  onConnect,
  onDisconnect,
}: PlatformStatus & { isConnecting: boolean; onConnect: () => void; onDisconnect: () => void }) {
  const meta = PLATFORM_META[platform]
  const { t } = useT()

  return (
    <div
      className={`${styles.card} ${connected ? styles.cardConnected : ''}`}
      style={{
        // Platforma özel marka rengi — veriye bağlı, statik değil; design
        // system'in "hardcoded hex yasak" kuralı statik stiller içindir,
        // bu değer PLATFORM_META'dan (veri) geliyor.
        //
        // E-FAZ 2 (2026-08-02): türetilmiş `${color}40` gibi alfa-ekli
        // değişkenler kaldırıldı — CSS artık `color-mix` ile aynı işi tek
        // kaynaktan yapıyor. Buradan yalnız HAM renk geçer; karıştırma
        // kararı stil dosyasında kalır.
        '--platform-color': meta.color,
      } as React.CSSProperties}
    >
      {/* Subtle corner glow when connected */}
      {connected && <div aria-hidden="true" className={styles.cardGlow} />}

      {/* Icon + status row */}
      <div className={styles.cardTop}>
        <div className={styles.cardIcon}>{meta.icon}</div>
        <span
          aria-hidden
          className={`${styles.statusDot} ${connected ? styles.statusDotConnected : ''}`}
        />
      </div>

      {/* Name + status */}
      <div className={styles.cardBody}>
        <div className={styles.cardNameRow}>
          <span className={styles.cardName}>{displayName}</span>
          {reAuthRequired && <Badge tone="error">{t('settings.platformConnections.reAuthShort')}</Badge>}
        </div>

        <p className={styles.cardMeta}>
          {connected && lastSyncedAt
            ? t('settings.platformConnections.lastSync', { date: formatLastSync(lastSyncedAt) })
            : t('settings.platformConnections.platformDesc.spotify')}
        </p>
      </div>

      {/* Action button */}
      {connected ? (
        <Button
          variant="secondary"
          onClick={onDisconnect}
          disabled={isConnecting}
          aria-label={t('settings.platformConnections.ariaDisconnect', { platform: displayName })}
        >
          {t('settings.platformConnections.disconnect')}
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={onConnect}
          disabled={isConnecting}
          aria-label={t('settings.platformConnections.ariaConnect', { platform: displayName })}
        >
          {isConnecting ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden />
              {t('settings.platformConnections.connecting')}
            </>
          ) : (
            t('settings.platformConnections.connect')
          )}
        </Button>
      )}
    </div>
  )
}

export function PlatformConnectionsGrid({
  platforms,
  connectedPlatform,
  errorCode,
}: PlatformConnectionsGridProps) {
  const { t } = useT()
  const [connecting, setConnecting] = useState<PlatformId | null>(null)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!connectedPlatform && !errorCode) return
    const id = requestAnimationFrame(() => {
      if (connectedPlatform) {
        const label = platformLabels()[connectedPlatform] ?? connectedPlatform
        setBanner({ type: 'success', message: t('settings.platformConnections.connectedBanner', { platform: label }) })
      } else if (errorCode) {
        const msg = errorMessages(t)[errorCode] ?? t('settings.platformConnections.errors.generic')
        setBanner({ type: 'error', message: msg })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [connectedPlatform, errorCode, t])

  async function handleConnect(platform: PlatformId) {
    setConnecting(platform)
    try {
      window.location.href = '/api/spotify/connect'
    } finally {
      setConnecting(null)
    }
  }

  async function handleDisconnect(platform: PlatformId) {
    setConnecting(platform)
    try {
      await fetch('/api/spotify/connect', { method: 'DELETE' })
      window.location.reload()
    } finally {
      setConnecting(null)
    }
  }

  return (
    <div className={styles.wrap}>
      {banner && (
        <div
          role="alert"
          className={`${styles.banner} ${banner.type === 'success' ? styles.bannerSuccess : styles.bannerError}`}
        >
          {banner.message}
        </div>
      )}

      {/* Kart sayisi kadar kolon (auto-fit) — bos hucre yok. */}
      <div className={styles.grid}>
        {platforms.map((p) => (
          <PlatformCard
            key={p.platform}
            {...p}
            isConnecting={connecting === p.platform}
            onConnect={() => handleConnect(p.platform)}
            onDisconnect={() => handleDisconnect(p.platform)}
          />
        ))}
      </div>
    </div>
  )
}
