import type { ReactNode } from 'react'

export type MenuAction = {
  id: string
  label: string
  description?: string
  icon?: ReactNode
  href?: string
  external?: boolean
  onSelect?: () => void
  destructive?: boolean
  disabled?: boolean
  /** Bilgi satırı — tıklanamaz */
  kind?: 'action' | 'meta'
}

export type ActionMenuTriggerProps = {
  ref: React.RefObject<HTMLButtonElement | null>
  onClick: () => void
  'aria-expanded': boolean
  'aria-haspopup': 'menu'
  'aria-controls'?: string
  'aria-label': string
  longPressHandlers: ReturnType<typeof import('@/lib/hooks/use-long-press').useLongPress>
}
