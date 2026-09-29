'use client'

import { usePathname } from 'next/navigation'
import { yolCoz, type Dil } from '@/lib/marketing/dil'

/**
 * Ortak marketing layout'undaki kabuk (nav, footer, çerez bandı) hangi
 * dilde konuşmalı? Layout her iki dilin sayfalarını da sarıyor ve sayfa
 * parametresini görmüyor; dil yalnızca adresten okunabilir (`/en...`).
 */
export function useMarketingDil(): { dil: Dil; tabanYol: string } {
  return yolCoz(usePathname() ?? '/')
}
