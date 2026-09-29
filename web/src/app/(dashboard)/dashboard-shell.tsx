'use client'

import { usePathname } from 'next/navigation'
import { useLayoutEffect } from 'react'
import { useSidebar } from '@/lib/sidebar-context'
import { DashboardTopActions } from '@/components/dashboard/dashboard-top-actions'
import styles from './dashboard-shell.module.css'
import { cn } from '@/lib/cn'
import '@/styles/dashboard-atmosphere.css'

/** Journey ve Recap story-deck — topBar yok, içerik tam yükseklik. `/recap` liste sayfası dahil değil. */
function isImmersiveRoute(pathname: string): boolean {
  if (pathname === '/journey') return true
  return pathname.startsWith('/recap/') && pathname.length > '/recap/'.length
}

/**
 * Geniş kapsayıcı (1440px) alan rotalar.
 *
 * ─── Neden bir liste, tek rota değil ────────────────────────────────────
 * FAZ DASHBOARD-REDESIGN (2026-08-13) Sahibin şu gerekçesiyle açıldı:
 * *"masaüstünde sağda kalan %40 boş alan giderilir."* O tur yalnız
 * `/dashboard`ı kapsıyordu.
 *
 * 2026-08-25 playlist turunda ölçüldü: 1920px ekranda `/playlists/mood`
 * kartları **1100px'e sıkışıyor**, 5 kolon çıkıyor ve sayfanın alt yarısı
 * boş kalıyor. Oysa ızgara `repeat(auto-fill, minmax(180px, 1fr))` —
 * yani genişlik verilirse sütun sayısını KENDİSİ artırıyor. Dar kapsayıcı
 * ızgaranın işini yapmasına engel oluyordu.
 *
 * ⚠ Ölçüt "sayfa önemli mi" değil, **içerik ızgara mı**: kart ızgarası
 * genişlikten faydalanır, uzun metin faydalanmaz. `/taste`, `/recap`,
 * `/settings` gibi okuma ağırlıklı sayfalar 1100px'te kalır — orada
 * geniş satır okumayı zorlaştırır (satır uzunluğu ~75 karakteri aşmamalı).
 *
 * `/playlists/[id]` DIŞARIDA: şarkı listesi tek kolon, genişletmek
 * satırları esnetip kapak ile süre arasını boşluğa çevirirdi.
 */
const GENIS_KAPSAYICI_ROTALARI = [
  '/dashboard',
  '/playlists',
  '/playlists/mood',
  '/playlists/liked',
] as const

function isGenisKapsayiciRoute(pathname: string): boolean {
  return (GENIS_KAPSAYICI_ROTALARI as readonly string[]).includes(pathname)
}

/**
 * Dashboard kabuğu + global üst aksiyon şeridi.
 * Navbar'ımız sidebar olduğu için sayfa-içi sağ üst köşede ince bir aksiyon
 * şeridi durur (Gmail deseni): her sayfada aynı yerde ⚙ Ayarlar. İleride
 * bildirim/arama gibi ikonlar buraya eklenir.
 *
 * Mode switch (2026-07-18, Sahip madde: Date/Music Mode) — yalnız mobilde
 * görünür (desktop sidebar zaten tüm sayfaları gösterir, dokunulmadı).
 * Sağ üstte Ayarlar'ın yanına, hamburger'in (sol üst) simetriği olarak
 * yerleşir — sade, tek dokunuşluk, keşfedilebilir.
 */
import type { DashboardAlert } from '@/lib/platform/dashboard-alerts.types'

export function DashboardShell({
  children,
  avatarUrl = null,
  displayName = 'Profil',
  alerts = [],
}: {
  children: React.ReactNode
  /** Üst şerit avatarı (2026-08-08) — sidebar ile AYNI kaynak. */
  avatarUrl?: string | null
  displayName?: string
  /** Sistem ve platform uyarıları */
  alerts?: DashboardAlert[]
}) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()
  const immersive = isImmersiveRoute(pathname)
  const genisKapsayici = isGenisKapsayiciRoute(pathname)
  const journeyImmersive = pathname === '/journey'

  useLayoutEffect(() => {
    if (!journeyImmersive) return
    document.body.classList.add('journey-immersive')
    return () => document.body.classList.remove('journey-immersive')
  }, [journeyImmersive])

  return (
    <main
      className={cn(
        styles.main,
        collapsed && styles.mainCollapsed,
        immersive && styles.mainImmersive,
      )}
    >
      {/* Her zaman aynı DOM — immersive'de CSS ile gizlenir (hydration uyumu). */}
      <div className="dash-atmosphere" aria-hidden>
        <div className="dash-atmosphere__accent" />
        <div className="dash-atmosphere__warm" />
        <div className="dash-atmosphere__cool" />
        <div className="dash-atmosphere__vignette" />
      </div>
      <div
        className={cn(
          styles.content,
          immersive && styles.contentImmersive,
          genisKapsayici && styles.contentGenis,
        )}
      >
        {!immersive && (
          <div className={styles.topBar}>
            <DashboardTopActions
              avatarUrl={avatarUrl}
              displayName={displayName}
              alerts={alerts}
            />
          </div>
        )}
        {children}
      </div>
    </main>
  )
}
