'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n/provider'
import { ALWAYS_HIGHLIGHTED_HREF, MOBILE_NAV_ITEMS } from './nav-config'
import styles from './nav.module.css'

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isImmersiveRoute(pathname: string): boolean {
  if (pathname === '/journey') return true
  return pathname.startsWith('/recap/') && pathname.length > '/recap/'.length
}

/**
 * Mobil alt gezinme — **STATİK 5 sekme**.
 * Recap · Playlists · Home · Taste · History.
 * Kilitli sekmeler gizlenmez, mühür rozetiyle yerinde durur.
 */
export function BottomNav({
  lockedHrefs = [],
}: {
  lockedHrefs?: string[]
}) {
  const pathname = usePathname()
  const { t } = useT()
  if (isImmersiveRoute(pathname)) {
    return null
  }
  const items = MOBILE_NAV_ITEMS

  return (
    <nav className={styles.bottomNav} aria-label={t('nav.mainMenuMobile')}>
      {items.map(({ href, labelKey, icon: Icon }) => {
        const active = isActive(pathname, href)
        const highlighted = href === ALWAYS_HIGHLIGHTED_HREF
        const isLocked = lockedHrefs.includes(href)
        const label = t(`nav.${labelKey}`)

        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={cn(
              styles.bottomItem,
              active && styles.bottomItemActive,
              highlighted && !active && styles.bottomItemHighlighted,
              isLocked && styles.navItemLocked,
            )}
            aria-current={active ? 'page' : undefined}
            title={isLocked ? `${label} (${t('nav.locked')})` : label}
          >
            <span className={styles.navIconWrap}>
              <Icon size={20} aria-hidden />
              {isLocked && (
                <span className={styles.bottomLockBadge} aria-label={t('nav.locked')}>
                  <Lock size={10} aria-hidden />
                </span>
              )}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

