'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n/provider'
import styles from './avatar-menu.module.css'

/**
 * Üst şerit avatar menüsü — Settings · Sign out.
 *
 * 🔴 NEDEN (2026-08-14 kullanıcı testi, Ş-6): "Çıkış yap" YALNIZCA `/settings`
 * sayfasının içinde duruyordu. Avatara tıklamak doğrudan `/profile`'a gidiyordu,
 * hover'da menü açılmıyordu. Kullanıcı çıkmak için: sağ üst dişli → Ayarlar →
 * sayfayı aşağı kaydır. Web'de çıkış avatar menüsünde beklenir.
 *
 * `/settings` içindeki `SignOutButton` KALDIRILMADI — orada olması yanlış değil,
 * eksik olan buraya erişimdi.
 *
 * Etkileşim: tıkla-aç/kapat (hover DEĞİL — dokunmatikte hover yok), Escape ile
 * kapanır, dışarı tıklayınca kapanır, odak menüye taşınır.
 */
export function AvatarMenu({
  avatarUrl,
  displayName,
  compact = false,
}: {
  avatarUrl: string | null
  displayName: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { t } = useT()
  const wrapRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLAnchorElement>(null)
  const router = useRouter()

  // Dışarı tıklama + Escape → kapat. (Native <dialog> değil: menü sayfayı
  // karartmamalı, akışı kesmemeli.)
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Açılınca odak ilk öğeye — klavye kullanıcısı menüde kalır.
  useEffect(() => {
    if (open) firstItemRef.current?.focus()
  }, [open])

  async function handleSignOut() {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={cn(styles.trigger, compact && styles.triggerCompact)}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('dashboard.avatarMenu.accountMenu', { name: displayName })}
      >
        <UserAvatar
          src={avatarUrl}
          name={displayName}
          className={styles.avatar}
          initialClassName={styles.avatarInitial}
        />
      </button>

      {open && (
        <div className={styles.menu} role="menu" aria-label={t('dashboard.avatarMenu.account')}>
          <p className={styles.menuName}>{displayName}</p>

          <Link
            href="/settings"
            prefetch={false}
            role="menuitem"
            ref={firstItemRef}
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            <Settings size={16} strokeWidth={1.5} aria-hidden />
            {t('dashboard.avatarMenu.settings')}
          </Link>

          <button
            type="button"
            role="menuitem"
            className={cn(styles.item, styles.itemDanger)}
            onClick={handleSignOut}
            disabled={loading}
          >
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
            {loading ? t('dashboard.avatarMenu.signingOut') : t('dashboard.avatarMenu.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
