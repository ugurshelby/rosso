'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { NotificationMenu } from './notification-menu'
import { AvatarMenu } from './avatar-menu'
import type { DashboardAlert } from '@/lib/platform/dashboard-alerts.types'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n/provider'
import styles from './dashboard-top-actions.module.css'

export function DashboardTopActions({
  compact = false,
  avatarUrl = null,
  displayName = 'Profil',
  alerts = [],
}: {
  compact?: boolean
  /** Profil fotoğrafı — yoksa `UserAvatar` baş harf fallback'i çizer. */
  avatarUrl?: string | null
  /** Erişilebilir ad; baş harf fallback'i de bundan üretilir. */
  displayName?: string
  /** Sistem ve platform uyarıları (senkron gecikmesi, cooldown vb.) */
  alerts?: DashboardAlert[]
}) {
  const { t } = useT()
  return (
    <div className={cn(styles.actions, compact && styles.actionsCompact)}>
      <NotificationMenu
        compact={compact}
        alerts={alerts}
      />

      <Link href="/settings" prefetch={false} className={styles.topAction} aria-label={t('dashboard.topActions.settings')}>
        <Settings size={compact ? 17 : 18} strokeWidth={1.5} aria-hidden />
      </Link>

      {/* Avatar EN SAĞDA (Sahip: seçenek A) — Spotify deseni. */}
      <AvatarMenu avatarUrl={avatarUrl} displayName={displayName} compact={compact} />
    </div>
  )
}
