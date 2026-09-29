'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { emailSchema } from '@/lib/auth/validation'
import { useT } from '@/lib/i18n/provider'
import { AuthField } from '@/components/auth/auth-field'
import styles from '../auth.module.css'

export function ForgotPasswordForm({ linkInvalid = false }: { linkInvalid?: boolean }) {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(
    linkInvalid
      ? t('auth.forgotPassword.errors.linkInvalid')
      : null,
  )
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('auth.forgotPassword.errors.invalidEmail'))
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      parsed.data,
      { redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password` }
    )

    // Güvenlik: e-posta kayıtlı olsun olmasın aynı onay gösterilir (enumeration önleme)
    if (resetError) {
      setError(t('auth.forgotPassword.errors.sendFailed'))
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className={styles.form}>
        <div className={styles.brand}>
          <span className={styles.title}>{t('auth.forgotPassword.checkEmailTitle')}</span>
        </div>
        <p className={styles.success}>
          {t('auth.forgotPassword.checkEmailDesc', { email })}
        </p>
        <Link className={styles.linkAccent} href="/login">
          {t('auth.forgotPassword.backToSignIn')}
        </Link>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label={t('auth.forgotPassword.title')}>
      <div className={styles.brand}>
        <span className={styles.title}>{t('auth.forgotPassword.title')}</span>
        <span className={styles.subtitle}>{t('auth.forgotPassword.subtitle')}</span>
      </div>

      <AuthField
        id="email"
        label={t('auth.forgotPassword.emailLabel')}
        icon="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        disabled={loading}
        placeholder="you@example.com"
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
      </button>

      <p className={styles.switchLine}>
        {t('auth.forgotPassword.rememberPassword')}{' '}
        <Link className={styles.linkAccent} href="/login">
          {t('auth.forgotPassword.signIn')}
        </Link>
      </p>
    </form>
  )
}
