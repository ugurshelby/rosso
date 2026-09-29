import type { AutosaveStatus } from '@/lib/hooks/use-autosave'
import styles from './autosave-status-pill.module.css'

const LABELS: Record<Exclude<AutosaveStatus, 'idle'>, string> = {
  dirty: 'Unsaved changes',
  saving: 'Kaydediliyor…',
  saved: 'Kaydedildi',
  offline: 'Offline (waiting)',
  error: 'Kaydedilemedi',
}

type Props = {
  status: AutosaveStatus
  errorMessage?: string | null
  className?: string
}

/** Autosave FSM pill — autosave-rehberi.md §2. */
export function AutosaveStatusPill({ status, errorMessage, className }: Props) {
  if (status === 'idle') return null

  const tone =
    status === 'error'
      ? styles.error
      : status === 'offline'
        ? styles.offline
        : status === 'saved'
          ? styles.saved
          : status === 'saving'
            ? styles.saving
            : styles.neutral

  return (
    <div
      className={[styles.pill, tone, className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className={styles.dot} aria-hidden />
      <span>{status === 'error' && errorMessage ? errorMessage : LABELS[status]}</span>
    </div>
  )
}
