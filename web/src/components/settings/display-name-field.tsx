'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateDisplayName } from '@/lib/account/display-name-actions'
import { useToast } from '@/components/ui/toast'
import { useT } from '@/lib/i18n/provider'
import styles from './account-summary.module.css'

/**
 * Görünen ad — yerinde düzenleme (D-FAZ 1, 2026-08-02).
 *
 * V2: sosyal profil yok, ad Supabase Auth `user_metadata.display_name`'de
 * yaşar (bkz. `lib/account/display-name-actions.ts`).
 */
export function DisplayNameField({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialName)
  const [saved, setSaved] = useState(initialName)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useT()

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function cancel() {
    setValue(saved)
    setEditing(false)
  }

  function save() {
    const next = value.trim()
    if (!next || next === saved) {
      cancel()
      return
    }
    startTransition(async () => {
      const res = await updateDisplayName(next)
      if (!res.ok) {
        toast('error', res.error)
        return
      }
      setSaved(res.data.displayName)
      setValue(res.data.displayName)
      setEditing(false)
      toast('success', t('settings.displayName.updated'))
      // Kartın üstündeki hero bandı ve diğer yüzeyler sunucudan gelir.
      router.refresh()
    })
  }

  if (!editing) {
    return (
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{t('settings.displayName.label')}</span>
        <span className={styles.fieldValue}>{saved}</span>
        <button
          type="button"
          className={styles.fieldAction}
          onClick={() => setEditing(true)}
        >
          {t('settings.displayName.edit')}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.fieldRow}>
      <label className={styles.fieldLabel} htmlFor="display-name-input">
        {t('settings.displayName.label')}
      </label>
      <input
        id="display-name-input"
        ref={inputRef}
        className={styles.fieldInput}
        value={value}
        maxLength={60}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); save() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
      />
      <span className={styles.fieldActions}>
        <button
          type="button"
          className={styles.fieldAction}
          onClick={cancel}
          disabled={pending}
        >
          {t('settings.displayName.cancel')}
        </button>
        <button
          type="button"
          className={styles.fieldActionPrimary}
          onClick={save}
          disabled={pending || value.trim().length === 0}
        >
          {pending ? t('settings.displayName.saving') : t('settings.displayName.save')}
        </button>
      </span>
    </div>
  )
}
