'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validateRegister } from '@/lib/auth/validation'
import { useT } from '@/lib/i18n/provider'
import { AuthField, AuthPasswordField } from '@/components/auth/auth-field'
import styles from '../auth.module.css'

export function RegisterForm() {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const valid = validateRegister({ email, password, displayName })
    if (!valid.ok) {
      setError(valid.error)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email: valid.data.email,
      password: valid.data.password,
      options: {
        data: { display_name: valid.data.displayName },
        // Onay linki callback'e döner; callback session'ı kurup `next`'e yönlendirir.
        // Kayıt akışında hedef GİRİŞ ekranı (Sahip: "onaydan sonra giriş yap
        // ekranına gitsin"). `confirmed=1` giriş sayfasında "hesabın doğrulandı,
        // giriş yap" mesajı için. Diğer akışlar (OAuth) kendi next'ini kullanır,
        // callback default'u /dashboard bozulmaz.
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/login%3Fconfirmed%3D1`,
      },
    })

    if (signUpError) {
      setError(t('auth.register.errors.signUpFailed'))
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
          <span className={styles.title}>{t('auth.register.checkEmailTitle')}</span>
        </div>
        <p className={styles.success}>
          {t('auth.register.checkEmailDesc', { email })}
        </p>
        <Link className={styles.linkAccent} href="/login">
          {t('auth.register.backToSignIn')}
        </Link>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label={t('auth.register.title')}>
      <div className={styles.brand}>
        <span className={styles.title}>{t('auth.register.title')}</span>
        <span className={styles.subtitle}>{t('auth.register.subtitle')}</span>
      </div>

      <AuthField
        id="displayName"
        label={t('auth.register.displayNameLabel')}
        icon="name"
        autoComplete="name"
        value={displayName}
        onChange={setDisplayName}
        disabled={loading}
        placeholder={t('auth.register.displayNamePlaceholder')}
      />

      <AuthField
        id="email"
        label={t('auth.register.emailLabel')}
        icon="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        disabled={loading}
        placeholder="you@example.com"
      />

      <AuthPasswordField
        id="password"
        label={t('auth.register.passwordLabel')}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        disabled={loading}
        placeholder={t('auth.register.passwordPlaceholder')}
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <p className={styles.legalNote}>
        {t('auth.register.legalPrefix')}
        <Link className={styles.linkAccent} href="/privacy">
          {t('auth.register.legalLink')}
        </Link>
        {t('auth.register.legalSuffix')}
      </p>

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? t('auth.register.submitting') : t('auth.register.submit')}
      </button>

      <p className={styles.switchLine}>
        {t('auth.register.hasAccount')}{' '}
        <Link className={styles.linkAccent} href="/login">
          {t('auth.register.signIn')}
        </Link>
      </p>
    </form>
  )
}
