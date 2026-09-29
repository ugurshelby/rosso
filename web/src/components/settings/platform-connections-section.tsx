'use client'

import { useState, useEffect } from 'react'
import { PlatformConnectionCard, type PlatformId } from './platform-connection-card'
import { SpotifyEpostaFormu } from './spotify-eposta-formu'
import { useT } from '@/lib/i18n/provider'
import type { Translator } from '@/lib/i18n/translate'

interface PlatformStatus {
  platform: PlatformId
  displayName: string
  connected: boolean
  subscriptionActive?: boolean
  reAuthRequired?: boolean
  lastSyncedAt?: string | null
}

interface PlatformConnectionsSectionProps {
  platforms: PlatformStatus[]
  connectedPlatform?: string
  errorCode?: string
  /** FAZ 6: Spotify sınırlı beta kabul durumu (null = istek yok). */
  spotifyAccess?: 'pending' | 'approved' | 'active' | 'rejected' | null
  /**
   * B17: `spotify_allowlist_requests.spotify_email` dolu mu?
   * Doluysa e-posta formu gösterilmez — zaten biliyoruz, sormak sürtünme.
   */
  spotifyEmailBiliniyor?: boolean
}

// 2026-07-28 (plan 07): Rosso saf Spotify.
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
  }
}

/**
 * FAZ 6: hata değil, DURUM. Spotify'ın sınırlı beta kotası dolu ya da kullanıcı
 * henüz allowlist'te değil. Kırmızı hata kutusu yanlış olur — bekleyen bir istek
 * var, kullanıcı bir şey yanlış yapmadı.
 */
function infoMessages(t: Translator['t']): Record<string, string> {
  return {
    spotify_pending_access: t('settings.platformConnections.infoMessages.spotifyPendingAccess'),
  }
}

const BANNER_TONE: Record<'success' | 'error' | 'info', { base: string; text: string }> = {
  success: { base: 'var(--color-success)', text: 'var(--color-success)' },
  error: { base: 'var(--color-error)', text: 'var(--color-error)' },
  // Bekleme durumu: alarm kırmızısı değil, dikkat tonu. Accent (mor) KULLANILMAZ
  // — mor "durum ve aksiyon" işaretler, bekleme bildirimi değil
  // (dashboard-design.md §3.1). Metin ana renkte kalır ki kontrast güvenli olsun.
  info: { base: 'var(--color-warning)', text: 'var(--color-text-primary)' },
}

/**
 * FAZ 6: bağlantı kurulmuş ama Spotify tarafında erişim henüz açılmamış olabilir.
 * Bu durum kaybolmaz — kullanıcı sayfaya her geldiğinde görmeli, yoksa "neden
 * verim yok?" sorusuyla yalnız kalır.
 */
function ACCESS_NOTES(t: Translator['t']): Record<string, string> {
  return {
    pending: t('settings.platformConnections.accessNotes.pending'),
    approved: t('settings.platformConnections.accessNotes.approved'),
    rejected: t('settings.platformConnections.accessNotes.rejected'),
  }
}

/**
 * Aynı durum iki kez söylenmez (2026-08-01, Sahibin bug raporu).
 *
 * URL banner'ı (`?error=spotify_pending_access`, OAuth dönüşünde bir kez) ve
 * kalıcı `accessNote` ikisi de "hesabın onay bekliyor" diyordu — ekranda iki
 * uyarı üst üste çıkıyordu. Kalıcı not zaten her ziyarette görünür; geçici
 * banner aynı şeyi tekrarlıyorsa bastırılır.
 */
const BANNER_DUPLICATES_NOTE: Record<string, string[]> = {
  spotify_pending_access: ['pending'],
}

export function PlatformConnectionsSection({
  platforms,
  connectedPlatform,
  errorCode,
  spotifyAccess,
  spotifyEmailBiliniyor = false,
}: PlatformConnectionsSectionProps) {
  const { t } = useT()
  const accessNote = spotifyAccess ? ACCESS_NOTES(t)[spotifyAccess] : undefined
  const [connecting, setConnecting] = useState<PlatformId | null>(null)
  const [banner, setBanner] = useState<
    { type: 'success' | 'error' | 'info'; message: string } | null
  >(null)

  useEffect(() => {
    if (!connectedPlatform && !errorCode) return
    const id = requestAnimationFrame(() => {
      if (connectedPlatform) {
        const label = platformLabels()[connectedPlatform] ?? connectedPlatform
        // Erişim onaylanmadıysa "başarıyla bağlandı" yanıltıcı: OAuth bitti ama
        // veri akmıyor. Durumu olduğu gibi söyle.
        if (spotifyAccess === 'pending') {
          setBanner({
            type: 'info',
            message: t('settings.platformConnections.connectedPendingBanner', { platform: label }),
          })
          return
        }
        setBanner({ type: 'success', message: t('settings.platformConnections.connectedBanner', { platform: label }) })
      } else if (errorCode && infoMessages(t)[errorCode]) {
        // Kalıcı not aynı şeyi söylüyorsa banner'ı gösterme — tek mesaj yeter.
        const duplicates = BANNER_DUPLICATES_NOTE[errorCode] ?? []
        if (spotifyAccess && duplicates.includes(spotifyAccess)) return
        setBanner({ type: 'info', message: infoMessages(t)[errorCode] })
      } else if (errorCode) {
        const msg = errorMessages(t)[errorCode] ?? t('settings.platformConnections.errors.generic')
        setBanner({ type: 'error', message: msg })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [connectedPlatform, errorCode, spotifyAccess, t])

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {banner && (
        <div
          role={banner.type === 'info' ? 'status' : 'alert'}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.55,
            background: `color-mix(in srgb, ${BANNER_TONE[banner.type].base} 12%, transparent)`,
            color: BANNER_TONE[banner.type].text,
            border: `1px solid color-mix(in srgb, ${BANNER_TONE[banner.type].base} 30%, transparent)`,
          }}
        >
          {banner.message}
        </div>
      )}

      {accessNote && (
        <div
          role="status"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.55,
            background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
            color: 'var(--color-text-primary)',
            border: '1px solid color-mix(in srgb, var(--color-warning) 28%, transparent)',
          }}
        >
          {accessNote}

          {/* B17: sırada bekleyen VE e-postası bilinmeyen kullanıcıdan iste.
              `/v1/me` 403 verdiği için otomatik öğrenemiyoruz; e-posta olmadan
              Sahip hesabı Spotify Dashboard'a ekleyemez ve kullanıcı sırada
              kalır. E-posta zaten varsa form GÖSTERİLMEZ. */}
          {spotifyAccess === 'pending' && !spotifyEmailBiliniyor && <SpotifyEpostaFormu />}
        </div>
      )}
      {platforms.map((p) => (
        <PlatformConnectionCard
          key={p.platform}
          platform={p.platform}
          displayName={p.displayName}
          connected={p.connected}
          awaitingApproval={p.platform === 'spotify' && p.connected && spotifyAccess === 'pending'}
          reAuthRequired={p.reAuthRequired}
          lastSyncedAt={p.lastSyncedAt}
          isConnecting={connecting === p.platform}
          onConnect={() => handleConnect(p.platform)}
          onDisconnect={() => handleDisconnect(p.platform)}
        />
      ))}
    </div>
  )
}
