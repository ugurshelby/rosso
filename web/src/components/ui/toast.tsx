'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import styles from './toast.module.css'
import bannerStyles from './banner.module.css'

export type ToastTone = 'success' | 'error' | 'info'
export type BannerTone = 'info' | 'warning' | 'error'

const MAX_TOASTS = 3
const TOAST_MS = 4000

/**
 * Toast aksiyonu — "Geri al" gibi tek dokunuşluk düzeltmeler için.
 * (2026-08-14: beğeniden kaldırma onaysızdı ve geri alınamıyordu; Sahibin
 * kararı onay diyaloğu DEĞİL, geri-al toast'ı — 2.686 satırlık listede her
 * tıklamada onay sormak sürtünme yaratırdı.)
 */
export interface ToastAction {
  label: string
  onAction: () => void
}

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
  action?: ToastAction
  /** Varsayılan TOAST_MS; geri-al gibi karar gerektiren toast'lar daha uzun yaşar. */
  durationMs?: number
}

interface BannerItem {
  id: number
  tone: BannerTone
  message: string
  dismissible: boolean
}

interface NotificationContextValue {
  toast: (
    tone: ToastTone,
    message: string,
    opts?: { action?: ToastAction; durationMs?: number },
  ) => void
  banner: (tone: BannerTone, message: string, opts?: { dismissible?: boolean }) => void
  dismissBanner: (id?: number) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

const TONE_ICON_CLASS = {
  success: styles.successIcon,
  error: styles.errorIcon,
  info: styles.infoIcon,
} as const

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const [banners, setBanners] = useState<BannerItem[]>([])
  const counter = useRef(0)

  const toast = useCallback(
    (
      tone: ToastTone,
      message: string,
      opts?: { action?: ToastAction; durationMs?: number },
    ) => {
      const id = ++counter.current
      setItems((prev) =>
        [...prev, { id, tone, message, action: opts?.action, durationMs: opts?.durationMs }].slice(
          -MAX_TOASTS,
        ),
      )
    },
    [],
  )

  const banner = useCallback(
    (tone: BannerTone, message: string, opts?: { dismissible?: boolean }) => {
      const id = ++counter.current
      setBanners([{ id, tone, message, dismissible: opts?.dismissible ?? true }])
    },
    [],
  )

  const dismissBanner = useCallback((id?: number) => {
    setBanners((prev) => (id == null ? [] : prev.filter((b) => b.id !== id)))
  }, [])

  // `toast`/`banner`/`dismissBanner` referansları zaten sabit (useCallback,
  // deps []) — ama value objesi burada literal olursa her ToastProvider
  // render'ında (her toast/banner state değişiminde) yeni referans üretilir.
  // ToastProvider kök seviyede yaşıyor; useToast()/useBanner() çağıran HER
  // interactive component (like-button, playlist aksiyonları, vb.) bu
  // yüzden ekranda hiç toast yokken bile başka bir yerdeki toast fired
  // olunca gereksiz re-render olurdu. useMemo referansı sabitler.
  const value = useMemo(
    () => ({ toast, banner, dismissBanner }),
    [toast, banner, dismissBanner],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {banners.length > 0 && (
        <div className={bannerStyles.viewport} aria-live="polite">
          {banners.map((item) => (
            <BannerView key={item.id} item={item} onDismiss={() => dismissBanner(item.id)} />
          ))}
        </div>
      )}
      <div className={styles.viewport} role="region" aria-label="Bildirimler">
        {items.map((item) => (
          <ToastView key={item.id} item={item} onDone={() => setItems((p) => p.filter((t) => t.id !== item.id))} />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

function BannerView({ item, onDismiss }: { item: BannerItem; onDismiss: () => void }) {
  return (
    <div
      className={cn(bannerStyles.banner, bannerStyles[item.tone])}
      role={item.tone === 'error' ? 'alert' : 'status'}
    >
      <p className={bannerStyles.message}>{item.message}</p>
      {item.dismissible && (
        <button type="button" className={bannerStyles.dismiss} onClick={onDismiss} aria-label="Bildirimi kapat">
          <X size={18} aria-hidden />
        </button>
      )}
    </div>
  )
}

function ToastView({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setTimeout(onDone, item.durationMs ?? TOAST_MS)
    return () => clearTimeout(t)
  }, [onDone, paused, item.id, item.durationMs])

  const Icon = TONE_ICON[item.tone]
  const liveRole = item.tone === 'error' ? 'alert' : 'status'

  return (
    <div
      className={cn(styles.toast, styles[item.tone])}
      role={liveRole}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={18} className={cn(styles.icon, TONE_ICON_CLASS[item.tone])} aria-hidden />
      <span className={styles.message}>{item.message}</span>
      {item.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            item.action?.onAction()
            onDone() // aksiyon alındı — toast'ın beklemesi anlamsız
          }}
        >
          {item.action.label}
        </button>
      )}
    </div>
  )
}

export function useToast(): Pick<NotificationContextValue, 'toast'> {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useToast, ToastProvider içinde kullanılmalı.')
  return { toast: ctx.toast }
}

export function useBanner(): Pick<NotificationContextValue, 'banner' | 'dismissBanner'> {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useBanner, ToastProvider içinde kullanılmalı.')
  return { banner: ctx.banner, dismissBanner: ctx.dismissBanner }
}
