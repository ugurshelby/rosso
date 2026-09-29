'use client'

import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useT } from '@/lib/i18n/provider'

// 2026-07-28 (plan 07): Rosso saf Spotify.
export type PlatformId = 'spotify'

interface PlatformConnectionCardProps {
  platform: PlatformId
  displayName: string
  connected: boolean
  /**
   * OAuth tamamlandı ama Spotify hesabı allowlist'te DEĞİL — veri akmıyor.
   * Bu durumda kart "Bağlı" DEMEZ (2026-08-01, Sahibin bug raporu:
   * ekranda iki uyarı "kayıtlı değilsin" derken kart "Bağlı ✓" gösteriyordu;
   * üçü aynı anda doğru olamaz). Canlı kanıt: bir kullanıcının
   * `is_active=true` ama Spotify /me 403 "user is not registered".
   */
  awaitingApproval?: boolean
  reAuthRequired?: boolean
  lastSyncedAt?: string | null
  onConnect: () => void
  onDisconnect: () => void
  isConnecting?: boolean
}

const PLATFORM_COLORS: Record<PlatformId, string> = {
  spotify: '#1DB954',
}

function formatLastSync(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function PlatformConnectionCard({
  platform,
  displayName,
  connected,
  awaitingApproval,
  reAuthRequired,
  lastSyncedAt,
  onConnect,
  onDisconnect,
  isConnecting = false,
}: PlatformConnectionCardProps) {
  const color = PLATFORM_COLORS[platform]
  const { t } = useT()

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        background: 'var(--color-surface)',
      }}
    >
      {/* Sol: platform bilgisi */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1 }}>
        {/* Bağlantı durumu noktası */}
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: awaitingApproval
              ? 'var(--color-warning)'
              : connected
                ? color
                : 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{displayName}</span>

            {connected && !reAuthRequired && !awaitingApproval && (
              <CheckCircle
                size={14}
                aria-label={t('settings.platformConnections.connected')}
                style={{ color }}
              />
            )}

            {/* neutral: bu bir hata değil, bekleyen bir durum. Accent (mor)
                kullanılmaz — mor "aksiyon alabilirsin" der, burada kullanıcının
                yapacağı bir şey yok (dashboard-design.md §3.1). */}
            {awaitingApproval && <Badge tone="neutral">{t('settings.platformConnections.awaitingApproval')}</Badge>}

            {reAuthRequired && (
              <Badge tone="error">{t('settings.platformConnections.reAuthBadge')}</Badge>
            )}
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {/* Rozet "yeniden giriş gerekli" diyor; NEDEN gerektiğini burada
                söylüyoruz. Sebepsiz bir uyarı kullanıcıyı tıklatmaz. */}
            {reAuthRequired
              ? t('settings.platformConnections.reAuthDesc')
              : awaitingApproval
                ? t('settings.platformConnections.awaitingApprovalDesc')
                : connected && lastSyncedAt
                  ? t('settings.platformConnections.lastSync', { date: formatLastSync(lastSyncedAt) })
                  : connected
                    ? t('settings.platformConnections.connected')
                    : t('settings.platformConnections.notConnected')}
          </p>
        </div>
      </div>

      {/* Sağ: aksiyon.
          İzin eksikse birincil eylem "Kes" DEĞİL "Reconnect": kullanıcının
          burada yapması gereken tek şey yetkiyi tazelemek. Önce kesmek zorunda
          bırakmak, çözümü iki adıma bölüp terk edilme ihtimalini artırırdı.
          `/api/spotify/connect` var olan bağlantıyı günceller — kesme gerekmez. */}
      {connected && reAuthRequired ? (
        <Button
          variant="primary"
          onClick={onConnect}
          disabled={isConnecting}
          aria-label={t('settings.platformConnections.ariaRefresh', { platform: displayName })}
        >
          {isConnecting ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden />
              {t('settings.platformConnections.connecting')}
            </>
          ) : (
            t('settings.platformConnections.reconnect')
          )}
        </Button>
      ) : connected ? (
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
