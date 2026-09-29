import { Home, ListMusic, BarChart2, History, AudioWaveform } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** `nav.<labelKey>` sözlük anahtarına karşılık gelir (bkz. lib/i18n/messages/{en,tr}/nav.ts). */
export type NavLabelKey = 'home' | 'playlists' | 'taste' | 'recap' | 'history'

export interface NavItem {
  href: string
  labelKey: NavLabelKey
  icon: LucideIcon
}

/**
 * Rosso Çok Kullanıcılı Navigasyon Yapısı
 *
 * Sıra mobil uygulamayla uyumlu; Dashboard 3. sırada (başparmak).
 */

/**
 * Hiyerarşi (V2): Dashboard > Playlists / Taste > Recap / History.
 * Masaüstünde yukarıdan aşağı, mobilde ortadan kenara doğru azalır;
 * iki liste aynı seviye sırasını taşır. Journey menüde değil, Dashboard'dan açılır.
 */

/** Desktop sidebar sırası — yukarıdan aşağı. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'home', icon: Home },
  { href: '/playlists', labelKey: 'playlists', icon: ListMusic },
  { href: '/taste', labelKey: 'taste', icon: AudioWaveform },
  { href: '/recap', labelKey: 'recap', icon: BarChart2 },
  { href: '/gecmis', labelKey: 'history', icon: History },
]

/** Mobil alt bar — Home ortada, seviye kenara doğru düşer. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/recap', labelKey: 'recap', icon: BarChart2 },
  { href: '/playlists', labelKey: 'playlists', icon: ListMusic },
  { href: '/dashboard', labelKey: 'home', icon: Home },
  { href: '/taste', labelKey: 'taste', icon: AudioWaveform },
  { href: '/gecmis', labelKey: 'history', icon: History },
]

export const ALWAYS_HIGHLIGHTED_HREF = '/dashboard'

