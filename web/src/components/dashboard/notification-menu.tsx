'use client'

import { useEffect, useRef, useState, useMemo, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Clock,
  AlertTriangle,
  KeyRound,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import type { DashboardAlert } from '@/lib/platform/dashboard-alerts.types'
import { formatWaitLabel } from '@/lib/platform/format-wait-label'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useT } from '@/lib/i18n/provider'
import styles from './notification-menu.module.css'

interface NotificationMenuProps {
  compact?: boolean
  alerts?: DashboardAlert[]
}

function getAlertKey(alert: DashboardAlert): string {
  if (alert.kind === 'spotify_cooldown') return `cooldown:${alert.remainingSeconds}`
  if (alert.kind === 'spotify_veri_izni_gerekli') return 'permission'
  return `sync_delay:${alert.hoursSinceSync}`
}

export function NotificationMenu({
  compact = false,
  alerts = [],
}: NotificationMenuProps) {
  const router = useRouter()
  const { t, tp } = useT()
  const [open, setOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const isMobile = useMediaQuery('(max-width: 639px)')
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = sessionStorage.getItem('rosso_dismissed_notifications')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )


  async function handleManualSync(key: string) {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      const res = await fetch('/api/spotify/sync', { method: 'POST' })
      if (res.ok) {
        dismissAlert(key)
        router.refresh()
      }
    } catch (err) {
      console.error('Manual sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  // Dismiss edilen uyarıları filtrele
  const activeAlerts = useMemo(
    () => alerts.filter((a) => !dismissedKeys.has(getAlertKey(a))),
    [alerts, dismissedKeys],
  )

  const totalCount = activeAlerts.length

  function dismissAlert(key: string) {
    setDismissedKeys((prev) => {
      const next = new Set(prev).add(key)
      try {
        sessionStorage.setItem('rosso_dismissed_notifications', JSON.stringify([...next]))
      } catch {}
      return next
    })
  }

  function clearAll() {
    setDismissedKeys((prev) => {
      const next = new Set(prev)
      for (const a of activeAlerts) {
        next.add(getAlertKey(a))
      }
      try {
        sessionStorage.setItem('rosso_dismissed_notifications', JSON.stringify([...next]))
      } catch {}
      return next
    })
  }

  // Dışarı tıklama + Escape ile kapanış
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (wrapRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const panelNode = (
    <div
      ref={panelRef}
      className={styles.panel}
      role="dialog"
      aria-modal={isMobile ? 'true' : undefined}
      aria-label={t('dashboard.notifications.panelLabel')}
    >
          <div className={styles.panelHeader}>
            <div className={styles.headerLeft}>
              <h3 className={styles.panelTitle}>{t('dashboard.notifications.title')}</h3>
              {totalCount > 0 && (
                <span className={styles.countPill}>{tp('dashboard.notifications.new', totalCount)}</span>
              )}
            </div>
            {activeAlerts.length > 0 && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={clearAll}
              >
                {t('dashboard.notifications.dismissAll')}
              </button>
            )}
          </div>

          <div className={styles.list}>
            {/* Sistem Uyarıları */}
            {activeAlerts.map((alert) => {
              const key = getAlertKey(alert)

              if (alert.kind === 'spotify_cooldown') {
                return (
                  <div key={key} className={styles.card}>
                    <div className={cn(styles.cardIconBox, styles.iconToneWarning)}>
                      <AlertTriangle size={16} strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardTop}>
                        <span className={styles.cardTitle}>{t('dashboard.notifications.rateLimitTitle')}</span>
                        <button
                          type="button"
                          className={styles.dismissBtn}
                          onClick={() => dismissAlert(key)}
                          aria-label={t('dashboard.notifications.dismiss')}
                        >
                          <X size={14} aria-hidden />
                        </button>
                      </div>
                      <p className={styles.cardBody}>
                        {t('dashboard.notifications.rateLimitBody', { wait: formatWaitLabel(alert.remainingSeconds) })}
                      </p>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardHint}>{t('dashboard.notifications.rateLimitHint')}</span>
                      </div>
                    </div>
                  </div>
                )
              }

              if (alert.kind === 'spotify_veri_izni_gerekli') {
                return (
                  <div key={key} className={styles.card}>
                    <div className={cn(styles.cardIconBox, styles.iconToneInfo)}>
                      <KeyRound size={16} strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardTop}>
                        <span className={styles.cardTitle}>{t('dashboard.notifications.permissionTitle')}</span>
                        <button
                          type="button"
                          className={styles.dismissBtn}
                          onClick={() => dismissAlert(key)}
                          aria-label={t('dashboard.notifications.dismiss')}
                        >
                          <X size={14} aria-hidden />
                        </button>
                      </div>
                      <p className={styles.cardBody}>
                        {t('dashboard.notifications.permissionBody')}
                      </p>
                      <Link
                        href="/api/spotify/connect"
                        className={styles.cardLink}
                        onClick={() => setOpen(false)}
                      >
                        {t('dashboard.notifications.grantPermission')}
                      </Link>
                    </div>
                  </div>
                )
              }

              // sync_delay
              return (
                <div key={key} className={styles.card}>
                  <div className={cn(styles.cardIconBox, styles.iconToneInfo)}>
                    <Clock size={16} strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardTitle}>{t('dashboard.notifications.syncTitle')}</span>
                      <button
                        type="button"
                        className={styles.dismissBtn}
                        onClick={() => dismissAlert(key)}
                        aria-label={t('dashboard.notifications.dismiss')}
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </div>
                    <p className={styles.cardBody}>
                      {alert.hoursSinceSync >= 24
                        ? t('dashboard.notifications.syncStale', { hours: alert.hoursSinceSync })
                        : t('dashboard.notifications.syncFresh')}
                    </p>
                    <button
                      type="button"
                      className={styles.cardLink}
                      disabled={isSyncing}
                      onClick={() => handleManualSync(key)}
                    >
                      <RefreshCw
                        size={12}
                        className={cn(isSyncing && 'animate-spin')}
                        aria-hidden
                      />
                      {isSyncing ? t('dashboard.notifications.syncing') : t('dashboard.notifications.syncNow')}
                    </button>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardHint}>
                        {t('dashboard.notifications.autoSyncHint')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Boş Durum */}
            {totalCount === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconPod}>
                  <CheckCircle2 size={20} strokeWidth={1.5} aria-hidden />
                </div>
                <h4 className={styles.emptyTitle}>{t('dashboard.notifications.allCaughtUpTitle')}</h4>
                <p className={styles.emptyDesc}>
                  {t('dashboard.notifications.allCaughtUpBody')}
                </p>
              </div>
            )}
          </div>
    </div>
  )

  return (
    <div className={cn(styles.wrap, open && styles.wrapOpen)} ref={wrapRef}>
      <button
        type="button"
        className={cn(
          styles.trigger,
          compact && styles.triggerCompact,
          open && styles.triggerActive,
        )}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          totalCount > 0
            ? t('dashboard.notifications.unread', { count: totalCount })
            : t('dashboard.notifications.bell')
        }
      >
        <Bell size={compact ? 17 : 18} strokeWidth={1.5} aria-hidden />
        {totalCount > 0 && (
          <span className={styles.badge} aria-hidden>
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        isMobile && mounted ? (
          createPortal(
            <>
              <div
                className={styles.backdrop}
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />
              {panelNode}
            </>,
            document.body,
          )
        ) : (
          panelNode
        )
      )}
    </div>
  )
}
