'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, ListPlus } from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import styles from './history.module.css'

interface HistoryPlaylistDialogProps {
  open: boolean
  onClose: () => void
  rangeLabel: string
}

/**
 * "Playlist oluştur" diyaloğu. stats.fm'de bu ekran ayrı bir playlist motoru
 * kurar; Rosso'da AYRI bir sistem KURMUYORUZ — mevcut Otomasyonlar
 * (`auto_playlist_rules`, /settings/automations) zaten "top ay/yıl → playlist"
 * yapıyor. Bu diyalog kullanıcıyı oraya, bağlamı koruyarak yönlendirir
 * (paralel ikilik yaratmadan — Sahip ilkesi).
 */
export function HistoryPlaylistDialog({ open, onClose, rangeLabel }: HistoryPlaylistDialogProps) {
  const { t } = useT()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.dialogOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-playlist-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.dialogClose} onClick={onClose} aria-label={t('history.playlistDialog.closeAriaLabel')}>
          <X size={18} />
        </button>
        <div className={styles.dialogIcon} aria-hidden>
          <ListPlus size={22} />
        </div>
        <h2 id="history-playlist-title" className={styles.dialogTitle}>
          {t('history.playlistDialog.title')}
        </h2>
        <p className={styles.dialogText}>
          {t('history.playlistDialog.body', { range: rangeLabel })}
        </p>
        <Link href="/settings/automations" className={styles.dialogCta}>
          {t('history.playlistDialog.cta')}
        </Link>
      </div>
    </div>
  )
}
