'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { passwordSchema } from '@/lib/auth/validation'
import { useT } from '@/lib/i18n/provider'
import type { MessageKey } from '@/lib/i18n/messages'
import { AuthPasswordField } from '@/components/auth/auth-field'
import styles from '../auth.module.css'

/**
 * Supabase'in gerçek hata nedenini kullanıcıya doğru söyler. Eskiden HER hata
 * "bağlantı süresi doldu" diye gösteriliyordu; oysa en sık neden yeni şifrenin
 * eskisiyle AYNI olmasıydı (422 same_password) — bağlantı sağlamdı.
 */
export function updatePasswordErrorMessage(
  err: { code?: string; message?: string; status?: number },
  t?: (key: MessageKey) => string,
): string {
  const code = err.code ?? ''
  const msg = (err.message ?? '').toLowerCase()
  if (code === 'same_password' || msg.includes('different from the old password')) {
    return t ? t('auth.updatePassword.errors.samePassword') : 'Your new password must be different from your current one — choose another.'
  }
  if (code === 'weak_password' || msg.includes('weak') || msg.includes('at least')) {
    return t ? t('auth.updatePassword.errors.weakPassword') : 'That password is too weak — use at least 8 characters with a mix of letters and numbers.'
  }
  if (code === 'reauthentication_needed' || code === 'reauthentication_not_valid') {
    return t ? t('auth.updatePassword.errors.reauthNeeded') : 'For security, please request a new reset link and open it right away.'
  }
  if (msg.includes('session') || code === 'session_not_found' || err.status === 401) {
    return t ? t('auth.updatePassword.errors.sessionNotFound') : 'This reset link has expired or was opened in another browser — request a new one and open it in the same browser.'
  }
  return t ? t('auth.updatePassword.errors.genericError') : 'Password couldn’t be updated — try again, or request a new reset link.'
}

export function UpdatePasswordForm() {
  const { t } = useT()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const parsed = passwordSchema.safeParse(password)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('auth.updatePassword.errors.invalidPassword'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.updatePassword.errors.mismatch'))
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data,
    })

    if (updateError) {
      setError(updatePasswordErrorMessage(updateError, t))
      setLoading(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label={t('auth.updatePassword.title')}>
      <div className={styles.brand}>
        <span className={styles.title}>{t('auth.updatePassword.title')}</span>
        <span className={styles.subtitle}>{t('auth.updatePassword.subtitle')}</span>
      </div>

      <AuthPasswordField
        id="password"
        label={t('auth.updatePassword.passwordLabel')}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        disabled={loading}
        placeholder="••••••••"
      />

      <AuthPasswordField
        id="confirm"
        label={t('auth.updatePassword.confirmLabel')}
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        disabled={loading}
        placeholder="••••••••"
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? t('auth.updatePassword.submitting') : t('auth.updatePassword.submit')}
      </button>
    </form>
  )
}
