'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, makeAuthCookiesSessionOnly } from '@/lib/supabase/client'
import { safeNextPath } from '@/lib/auth/validation'
import { useT } from '@/lib/i18n/provider'
import type { MessageKey } from '@/lib/i18n/messages'
import { ErrorCard } from '@/components/design/error-card'
import { AuthField, AuthPasswordField, RememberRow } from '@/components/auth/auth-field'
import styles from '../auth.module.css'

/**
 * Yönlendirmeyle gelen hata kodlarının kullanıcı diline çevirisi.
 *
 * ⚠ Kodlar sabit bir sözlükten okunuyor — URL'deki ham `error`
 * değeri EKRANA BASILMIYOR. Aksi hâlde saldırgan
 * `/login?error=<script>` benzeri bir bağlantı paylaşarak yansıtılmış
 * içerik enjekte etmeye çalışabilirdi (React kaçışlasa da, bilinmeyen
 * girdiyi hiç göstermemek daha temiz bir sınır).
 */
const OAUTH_ERROR_KEYS: Record<string, MessageKey> = {
  private: 'auth.login.errors.redirect.private',
  provider_disabled: 'auth.login.errors.redirect.providerDisabled',
  unknown_provider: 'auth.login.errors.redirect.unknownProvider',
  oauth_start_failed: 'auth.login.errors.redirect.oauthStartFailed',
  auth_failed: 'auth.login.errors.redirect.authFailed',
  missing_code: 'auth.login.errors.redirect.missingCode',
}

export function LoginForm() {
  const { t } = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))
  // E-posta onayından gelindi mi? (register → callback → /login?confirmed=1)
  const justConfirmed = searchParams.get('confirmed') === '1'
  /*
   * Yönlendirme ile gelen hata kodu (FAZ KİMLİK-V2, 2026-08-13).
   *
   * OAuth başlatma ucu ve `callback` başarısızlıkta `/login?error=…`
   * adresine döner. Bu kod okunmazsa kullanıcı sessizce login
   * ekranında bulur kendini ve NEDEN geri geldiğini bilemez —
   * "tıkladım, hiçbir şey olmadı" hissi. Sessiz hata, yeni bir UI
   * yüzeyinde en sık tekrarlayan boşluklardan biri.
   */
  const redirectErrorCode = searchParams.get('error') ?? ''
  const redirectErrorKey = OAUTH_ERROR_KEYS[redirectErrorCode]
  const redirectError = redirectErrorKey ? t(redirectErrorKey) : undefined

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  /*
   * "Beni hatırla" — varsayılan İŞARETLİ (FAZ KİMLİK-V2.1, 2026-08-14).
   *
   * ⚠ Varsayılanın `true` olması bilinçli: Supabase oturumu bugüne kadar
   * zaten kalıcıydı. `false` yapmak, kutuyu hiç fark etmeyen mevcut
   * kullanıcıları sekme kapanınca oturumdan atardı — sessiz bir davranış
   * değişikliği. Kutu var olan davranışı GÖRÜNÜR kılıyor, değiştirmiyor.
   */
  const [remember, setRemember] = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Sunucu-taraflı brute-force koruması: denemeyi kaydet, limit aşıldıysa bloke.
    const normalizedEmail = email.trim().toLowerCase()

    const guard = await fetch('/api/auth/login-guard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, action: 'check' }),
    }).catch(() => null)

    if (guard?.status === 429) {
      setError(t('auth.login.errors.rateLimited'))
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInError) {
      setError(t('auth.login.errors.invalidCredentials'))
      setLoading(false)
      return
    }

    // Başarılı giriş — başarısız-deneme sayacını temizle.
    void fetch('/api/auth/login-guard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, action: 'success' }),
    }).catch(() => null)

    /*
     * "Beni hatırla" kapalıysa oturumu tarayıcı kapanınca bitir.
     * ⚠ Sırası önemli: çerezler ancak giriş BAŞARILI olduktan sonra
     * var; daha önce çağırmak hiçbir şey bulamazdı.
     */
    if (!remember) makeAuthCookiesSessionOnly()

    router.replace(next)
    router.refresh()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label={t('auth.login.title')}>
      <div className={styles.brand}>
        <span className={styles.title}>{t('auth.login.title')}</span>
        <span className={styles.subtitle}>{t('auth.login.subtitle')}</span>
      </div>

      {justConfirmed && (
        <p className={styles.success} role="status">
          {t('auth.login.confirmedSuccess')}
        </p>
      )}

      {redirectError && !error && (
        <div role="alert">
          <ErrorCard message={t('auth.login.errorTitle')} description={redirectError} />
        </div>
      )}

      <AuthField
        id="email"
        label={t('auth.login.emailLabel')}
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
        label={t('auth.login.passwordLabel')}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        disabled={loading}
        placeholder="••••••••"
      />

      <RememberRow checked={remember} onChange={setRemember} forgotHref="/forgot-password" />

      {error && (
        <div role="alert">
          <ErrorCard
            message={t('auth.login.errorFailedTitle')}
            description={error}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? t('auth.login.submitting') : t('auth.login.submit')}
      </button>

      {/*
        Hesap oluşturma çağrısı — cümle biçiminde (Sahibin beğendiği
        "Don't have an account? Sign Up" kalıbı). Eskiden iki bağlantı yan
        yanaydı ("şifremi unuttum" + "hesap oluştur"); "şifremi unuttum"
        artık şifre alanının hemen altında, ait olduğu yerde (§16 grouping:
        kontrol etkilediği şeyin yanında durur).
      */}
      <p className={styles.switchLine}>
        {t('auth.login.noAccount')}{' '}
        <Link className={styles.linkAccent} href="/register">
          {t('auth.login.signUp')}
        </Link>
      </p>
    </form>
  )
}
