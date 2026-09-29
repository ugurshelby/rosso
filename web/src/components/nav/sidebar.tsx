'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/cn'
import { Lock } from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import { NAV_ITEMS } from './nav-config'
import styles from './nav.module.css'

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface SidebarProps {
  displayName: string
  avatarUrl?: string | null
  /**
   * Faz kilidi rotaları: menüde gizlenmez, kilit rozetiyle gösterilir.
   * Tıklandığında kilit kabuğuyla sayfa yapısını sergiler.
   */
  lockedHrefs?: string[]
}

export function Sidebar({
  displayName,
  avatarUrl,
  lockedHrefs = [],
}: SidebarProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS
  const { t } = useT()

  return (
    <aside className={styles.sidebar}>
      <Link
        href="/dashboard"
        prefetch={false}
        className={styles.logo}
        aria-label={t('nav.logoHome')}
      >
        <span className={styles.logoWordmark}>Rosso</span>
      </Link>

      <nav className={styles.nav} aria-label={t('nav.mainMenu')}>
        {items.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(pathname, href)
          const isLocked = lockedHrefs.includes(href)
          const label = t(`nav.${labelKey}`)

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={cn(
                styles.navItem,
                active && styles.navItemActive,
                isLocked && styles.navItemLocked,
              )}
              aria-current={active ? 'page' : undefined}
              title={isLocked ? `${label} (${t('nav.locked')})` : label}
            >
              <span className={styles.navIconWrap}>
                <Icon size={17} aria-hidden />
              </span>
              <span className={styles.navLabelText}>{label}</span>
              {isLocked && (
                <span className={styles.navLockBadge} aria-label={t('nav.locked')}>
                  <Lock size={12} aria-hidden />
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <Link
          href="/settings"
          prefetch={false}
          className={cn(
            styles.profile,
            isActive(pathname, '/settings') && styles.navItemActive
          )}
          aria-current={isActive(pathname, '/settings') ? 'page' : undefined}
        >
          <span className={styles.avatar} aria-hidden>
            <UserAvatar
              src={avatarUrl}
              name={displayName}
              alt={displayName}
              imgClassName={styles.avatarImg}
            />
          </span>
          <span className={styles.profileName}>{displayName}</span>
        </Link>
      </div>
    </aside>
  )
}
