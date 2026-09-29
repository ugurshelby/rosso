'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'
import styles from './modal.module.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  hideTitleText?: boolean
  children: React.ReactNode
}

/**
 * Native <dialog> tabanlı modal — focus trap ve Escape tarayıcıdan gelir.
 * Açılış 250ms ease-out (design.md §7). Backdrop tıklaması kapatır.
 */
export function Modal({ open, onClose, title, hideTitleText = false, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Escape ve native close → onClose senkronu
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick}>
      <div className={styles.inner}>
        {(title || hideTitleText) && (
          <div className={hideTitleText ? styles.headerDismissOnly : styles.header}>
            {title && (
              <h2 className={hideTitleText ? styles.srOnly : styles.title}>{title}</h2>
            )}
            <Button variant="icon" onClick={onClose} aria-label="Kapat" className={styles.closeBtn}>
              <X size={18} aria-hidden />
            </Button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  )
}
