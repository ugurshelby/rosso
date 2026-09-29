'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MenuAction } from './types'
import styles from './action-menu.module.css'

type Props = {
  actions: MenuAction[]
  onSelect: (action: MenuAction) => void
  onClose: () => void
  variant?: 'popover' | 'sheet'
}

function isActionable(action: MenuAction): boolean {
  return action.kind !== 'meta' && !action.disabled
}

export function MenuItems({ actions, onSelect, onClose, variant = 'popover' }: Props) {
  const itemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([])

  useEffect(() => {
    const first = itemRefs.current.find((el) => el && !el.hasAttribute('data-meta'))
    first?.focus()
  }, [])

  const actionableIndexes = actions
    .map((action, index) => (isActionable(action) ? index : -1))
    .filter((index) => index >= 0)

  function focusIndex(index: number) {
    const target = itemRefs.current[index]
    target?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    const active = document.activeElement
    const currentIndex = itemRefs.current.findIndex((el) => el === active)
    const pos = actionableIndexes.indexOf(currentIndex)
    if (pos === -1) {
      focusIndex(actionableIndexes[0] ?? 0)
      return
    }

    const nextPos =
      event.key === 'ArrowDown'
        ? (pos + 1) % actionableIndexes.length
        : (pos - 1 + actionableIndexes.length) % actionableIndexes.length
    focusIndex(actionableIndexes[nextPos] ?? 0)
  }

  /**
   * İlk yıkıcı eylemin indeksi — ayırıcı çizgi YALNIZ onun üstüne çizilir
   * ("Sil" gibi eylemler görsel olarak ayrılsın).
   *
   * ⚠ Önce `map` içinde `let sawDestructive` bayrağı güncelleniyordu; bu
   * render sırasında dış değişkeni değiştirmek demek. React aynı render'ı
   * atabilir/tekrarlayabilir (StrictMode, concurrent) — bayrak kirli kalınca
   * çizgi yanlış satıra düşebilir veya hiç çıkmaz. Değeri önceden hesaplamak
   * hem saf hem de niyeti açık kılıyor.
   */
  const ilkYikiciIndeks = actions.findIndex((a) => a.kind !== 'meta' && a.destructive)

  return (
    <ul
      className={variant === 'sheet' ? `${styles.list} ${styles.sheetList}` : styles.list}
      role="menu"
      onKeyDown={handleKeyDown}
    >
      {actions.map((action, index) => {
        if (action.kind === 'meta') {
          return (
            <li key={action.id} role="none">
              <p className={styles.meta} data-meta>
                {action.label}
              </p>
            </li>
          )
        }

        const showDivider = index === ilkYikiciIndeks && index > 0

        const className = [
          styles.item,
          action.destructive ? styles.itemDestructive : '',
          action.disabled ? styles.itemDisabled : '',
        ]
          .filter(Boolean)
          .join(' ')

        const body = (
          <>
            {action.icon}
            <span className={styles.itemBody}>
              <span className={styles.itemTitle}>{action.label}</span>
              {action.description ? (
                <span className={styles.itemDesc}>{action.description}</span>
              ) : null}
            </span>
          </>
        )

        return (
          <li key={action.id} role="none">
            {showDivider ? <div className={styles.divider} role="separator" /> : null}
            {action.href ? (
              action.external ? (
                <a
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  href={action.href}
                  role="menuitem"
                  className={className}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSelect(action)}
                >
                  {body}
                </a>
              ) : (
                <Link
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  href={action.href}
                  role="menuitem"
                  className={className}
                  onClick={() => onSelect(action)}
                >
                  {body}
                </Link>
              )
            ) : (
              <button
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                type="button"
                role="menuitem"
                className={className}
                disabled={action.disabled}
                onClick={() => onSelect(action)}
              >
                {body}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

type BottomSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      className={styles.sheetDialog}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <div className={styles.sheetInner}>
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>{title}</h2>
          <Button variant="icon" onClick={onClose} aria-label="Kapat">
            <X size={20} aria-hidden />
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
