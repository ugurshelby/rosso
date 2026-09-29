'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/provider'

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

export function DeleteAccount() {
  const router = useRouter()
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canDelete = password.length > 0 && confirm === CONFIRM_PHRASE

  async function handleDelete() {
    if (!canDelete) return
    setError(null)
    setLoading(true)

    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password, confirm }),
    }).catch(() => null)

    if (!res) {
      setError(t('settings.deleteAccount.errors.connection'))
      setLoading(false)
      return
    }
    if (res.status === 403) {
      setError(t('settings.deleteAccount.errors.wrongPassword'))
      setLoading(false)
      return
    }
    if (!res.ok) {
      setError(t('settings.deleteAccount.errors.generic'))
      setLoading(false)
      return
    }

    // Silindi → çıkış yapıldı, login'e yönlendir.
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-(--color-error) border border-(--color-error) rounded-md px-3 py-1.5 backdrop-blur-md bg-(--color-error)/10 hover:bg-(--color-error) hover:text-white transition-colors"
        >
          {t('settings.deleteAccount.trigger')}
        </button>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('settings.deleteAccount.dialogLabel')}
          className="border border-(--color-error) rounded-md p-4 space-y-3"
        >
          <p className="text-sm text-(--color-text-primary)">
            {t('settings.deleteAccount.instructionsBefore')}{' '}
            <code className="font-(--font-geist-mono)">{CONFIRM_PHRASE}</code>{' '}
            {t('settings.deleteAccount.instructionsAfter')}
          </p>

          <input name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder={t('settings.deleteAccount.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-sm rounded-md border border-(--color-border) bg-transparent px-3 py-2 text-(--color-text-primary)"
          />
          <input name="deleteConfirm"
            type="text"
            placeholder={CONFIRM_PHRASE}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full text-sm rounded-md border border-(--color-border) bg-transparent px-3 py-2 text-(--color-text-primary)"
          />

          {error && (
            <p role="alert" className="text-xs text-(--color-error)">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete || loading}
              className="text-sm font-medium text-white bg-(--color-error) rounded-md px-3 py-1.5 disabled:opacity-50"
            >
              {loading ? t('settings.deleteAccount.deleting') : t('settings.deleteAccount.deletePermanently')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
                setPassword('')
                setConfirm('')
              }}
              disabled={loading}
              className="text-sm text-(--color-text-secondary) px-3 py-1.5"
            >
              {t('settings.deleteAccount.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
