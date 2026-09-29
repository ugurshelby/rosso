'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n/provider'
import type { Translator } from '@/lib/i18n/translate'
import styles from './settings-platform-connections.module.css'

// 2026-07-28 (plan 07): Rosso saf Spotify. Tip tek platforma indi.
export type SettingsPlatformId = 'spotify'

export interface SettingsPlatformStatus {
  platform: SettingsPlatformId
  displayName: string
  connected: boolean
  subscriptionActive?: boolean
  reAuthRequired?: boolean
  lastSyncedAt?: string | null
}

interface SettingsPlatformConnectionsProps {
  platforms: SettingsPlatformStatus[]
  connectedPlatform?: string
  errorCode?: string
}

function platformLabels(): Record<string, string> {
  return { spotify: 'Spotify' }
}

const PLATFORM_COLORS: Record<SettingsPlatformId, string> = {
  spotify: '#1DB954',
}

function errorMessages(t: Translator['t']): Record<string, string> {
  return {
    spotify_denied: t('settings.platformConnections.errors.spotifyDenied'),
    spotify_state_mismatch: t('settings.platformConnections.errors.spotifyStateMismatch'),
    spotify_token_failed: t('settings.platformConnections.errors.spotifyTokenFailed'),
    spotify_config: t('settings.platformConnections.errors.spotifyConfig'),
    spotify_db: t('settings.platformConnections.errors.spotifyDb'),
    // BYOC (2026-09-23): en olası sebep kullanıcının kendi Spotify app'ine
    // Rosso'nun redirect URI'sini eklememiş olması — bkz. callback/route.ts.
    spotify_byoc_redirect_uri: t('settings.platformConnections.errors.spotifyByocRedirectUri'),
  }
}

const DISCONNECT_ENDPOINTS: Record<SettingsPlatformId, string> = {
  spotify: '/api/spotify/connect',
}

function formatLastSync(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SettingsPlatformConnections({
  platforms,
  connectedPlatform,
  errorCode,
}: SettingsPlatformConnectionsProps) {
  const { t } = useT()
  const [busy, setBusy] = useState<SettingsPlatformId | null>(null)
  const [confirmPlatform, setConfirmPlatform] = useState<SettingsPlatformId | null>(null)
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

  async function handleConnect() {
    setBusy('spotify')
    try {
      window.location.href = '/api/spotify/connect'
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect(platform: SettingsPlatformId) {
    setBusy(platform)
    setBanner(null)
    try {
      const res = await fetch(DISCONNECT_ENDPOINTS[platform], { method: 'DELETE' })
      if (!res.ok) {
        setBanner({
          type: 'error',
          message: t('settings.platformConnections.errors.removeFailed'),
        })
        return
      }
      window.location.reload()
    } catch {
      setBanner({
        type: 'error',
        message: t('settings.platformConnections.errors.connectionError'),
      })
    } finally {
      setBusy(null)
      setConfirmPlatform(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.lockNote}>
        {t('settings.platformConnections.lockNote')}
      </p>

      {banner && (
        <div
          role="alert"
          className={`${styles.banner} ${banner.type === 'success' ? styles.bannerSuccess : styles.bannerError}`}
        >
          {banner.message}
        </div>
      )}

      <div className={styles.list}>
        {platforms.map((p) => {
          const color = PLATFORM_COLORS[p.platform]
          const confirming = confirmPlatform === p.platform
          const isBusy = busy === p.platform

          let statusText: string
          if (p.connected && p.lastSyncedAt) {
            statusText = t('settings.platformConnections.lastSync', { date: formatLastSync(p.lastSyncedAt) })
          } else if (p.connected) {
            statusText = t('settings.platformConnections.connected')
          } else {
            statusText = t('settings.platformConnections.notConnected')
          }

          return (
            <div
              key={p.platform}
              className={[styles.card, p.connected ? styles.cardConnected : ''].filter(Boolean).join(' ')}
              style={p.connected ? ({ ['--platform-color']: color } as Record<string, string>) : undefined}
            >
              <div className={styles.cardRow}>
                <div className={styles.info}>
                  <span
                    aria-hidden
                    className={`${styles.dot} ${p.connected ? '' : styles.dotIdle}`}
                    style={p.connected ? { background: color } : undefined}
                  />
                  <div className={styles.meta}>
                    <div className={styles.nameRow}>
                      <span className={styles.name}>{p.displayName}</span>
                    </div>
                    <p className={styles.status}>{statusText}</p>
                  </div>
                </div>

                {!confirming && (
                  <div className={styles.actions}>
                    {p.connected ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className={styles.removeBtn}
                        onClick={() => setConfirmPlatform(p.platform)}
                        disabled={isBusy}
                        aria-label={t('settings.platformConnections.ariaRemove', { platform: p.displayName })}
                      >
                        {t('settings.platformConnections.removeConnection')}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConnect()}
                        disabled={isBusy}
                        aria-label={t('settings.platformConnections.ariaConnect', { platform: p.displayName })}
                      >
                        {isBusy ? (
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
                )}
              </div>

              {confirming && (
                <div
                  className={styles.confirm}
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('settings.platformConnections.confirm.ariaLabel', { platform: p.displayName })}
                >
                  <p className={styles.confirmTitle}>{t('settings.platformConnections.confirm.title')}</p>
                  <p className={styles.confirmBody}>
                    {t('settings.platformConnections.confirm.body')}
                  </p>
                  <div className={styles.confirmActions}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDisconnect(p.platform)}
                      disabled={isBusy}
                      loading={isBusy}
                    >
                      {t('settings.platformConnections.confirm.yes')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmPlatform(null)}
                      disabled={isBusy}
                    >
                      {t('settings.platformConnections.confirm.no')}
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}
