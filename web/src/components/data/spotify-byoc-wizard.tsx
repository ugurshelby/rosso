'use client'

import { useState } from 'react'
import {
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Radio,
  Unplug,
} from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import styles from './spotify-byoc-wizard.module.css'

export const SPOTIFY_REDIRECT_URI = 'https://your-app.example/api/spotify/callback'

export interface SpotifyByocStatus {
  configured: boolean
  verified: boolean
  clientId: string | null
  verifiedAt: string | null
}

export interface SpotifyByocWizardProps {
  initialStatus: SpotifyByocStatus
  isSpotifyConnected: boolean
  errorCode?: string
  /** Ortama göre (prod/yerel) doğru callback — sayfa sunucuda getAppOrigin() ile verir. */
  redirectUri?: string
}

const HEX32_REGEX = /^[0-9a-f]{32}$/i

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function SpotifyByocWizard({
  initialStatus,
  isSpotifyConnected,
  errorCode,
  redirectUri = SPOTIFY_REDIRECT_URI,
}: SpotifyByocWizardProps) {
  const { t } = useT()
  const [status, setStatus] = useState<SpotifyByocStatus>(initialStatus)
  const [clientId, setClientId] = useState(initialStatus.clientId ?? '')
  const [clientSecret, setClientSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Plan §5.2 Adım 4 & 5: Doğrulama VE platform bağlantısı aktifse alan kilitlenir.
  // İstisna: redirect URI hatası varsa kullanıcı form ekranında tutulur.
  const isConnected =
    status.verified && isSpotifyConnected && errorCode !== 'spotify_byoc_redirect_uri'

  const isRedirectUriError = errorCode === 'spotify_byoc_redirect_uri'

  async function handleCopyRedirectUri() {
    try {
      await navigator.clipboard.writeText(redirectUri)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Pano erişilemezse sessiz fallback
    }
  }

  async function handleVerifyAndConnect(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmedClientId = clientId.trim()
    const trimmedSecret = clientSecret.trim()

    if (!trimmedClientId || !trimmedSecret) {
      setErrorMsg(t('data.byoc.errors.missingFields'))
      return
    }

    if (!HEX32_REGEX.test(trimmedClientId) || !HEX32_REGEX.test(trimmedSecret)) {
      setErrorMsg(t('data.byoc.errors.invalidFormat'))
      return
    }

    setIsVerifying(true)
    try {
      const res = await fetch('/api/spotify/byoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: trimmedClientId,
          clientSecret: trimmedSecret,
        }),
      })

      if (!res.ok) {
        if (res.status === 429) {
          setErrorMsg(t('data.byoc.errors.rateLimited'))
          return
        }

        const data = (await res.json().catch(() => ({}))) as { error?: string }
        switch (data.error) {
          case 'gecersiz_bicim':
            setErrorMsg(t('data.byoc.errors.serverInvalidFormat'))
            break
          case 'spotify_reddetti':
            setErrorMsg(t('data.byoc.errors.rejected'))
            break
          case 'ag_hatasi':
            setErrorMsg(t('data.byoc.errors.network'))
            break
          case 'db_hatasi':
            setErrorMsg(t('data.byoc.errors.db'))
            break
          default:
            setErrorMsg(t('data.byoc.errors.generic'))
            break
        }
        return
      }

      setSuccessMsg(t('data.byoc.verifiedSuccess'))
      setStatus((prev) => ({
        ...prev,
        configured: true,
        verified: true,
        clientId: trimmedClientId,
        verifiedAt: new Date().toISOString(),
      }))

      // Plan §5.2 Adım 3: Başarıda Spotify OAuth akışı başlatılır
      setTimeout(() => {
        window.location.href = '/api/spotify/connect'
      }, 750)
    } catch {
      setErrorMsg(t('data.byoc.errors.networkGeneric'))
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true)
    try {
      // DELETE /api/spotify/connect BYOC kaydını da siler (Plan §3.4)
      await fetch('/api/spotify/connect', { method: 'DELETE' })
      window.location.reload()
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* ─── Plan §5.2 Adım 6: Redirect URI Hatası Uyarısı ─── */}
      {isRedirectUriError && (
        <div className={styles.alertBanner} role="alert">
          <AlertTriangle size={18} className={styles.alertIcon} aria-hidden />
          <div className={styles.alertContent}>
            <span className={styles.alertTitle}>
              {t('data.byoc.redirectUriErrorTitle')}
            </span>
            <p className={styles.alertDesc}>
              {t('data.byoc.redirectUriErrorDescBefore')}{' '}
              <strong>{t('data.byoc.redirectUrisField')}</strong>{' '}
              {t('data.byoc.redirectUriErrorDescAfter')}
            </p>
            <div className={styles.copyBox} style={{ maxWidth: '440px' }}>
              <span className={styles.copyBoxValue}>{redirectUri}</span>
              <button
                type="button"
                className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
                onClick={handleCopyRedirectUri}
                aria-label={t('data.byoc.copyRedirectUriAria')}
              >
                {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                <span>{copied ? t('data.byoc.copied') : t('data.byoc.copy')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Durum 1: Bağlı & Kilitli Görünüm (User Management Mockup) ─── */}
      {isConnected ? (
        <div className={styles.connectedCard}>
          <div className={styles.connectedHeader}>
            <div className={styles.connectedBadgeGroup}>
              <div className={styles.liveDotPulse} aria-hidden />
              <div className={styles.connectedTitleWrap}>
                <h3 className={styles.connectedMainTitle}>
                  {t('data.byoc.connectedTitle')}
                </h3>
                <span className={styles.connectedSubTitle}>
                  {t('data.byoc.connectedSubtitle')}
                </span>
              </div>
            </div>

            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLinkBtn}
            >
              <span>{t('data.byoc.openDashboard')}</span>
              <ExternalLink size={12} aria-hidden />
            </a>
          </div>

          <div className={styles.connectedMetaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{t('data.byoc.metaClientId')}</span>
              <span className={styles.metaValue}>
                {status.clientId
                  ? `${status.clientId.slice(0, 6)}••••••••••••••••••••${status.clientId.slice(-4)}`
                  : t('data.byoc.metaClientIdActive')}
              </span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{t('data.byoc.metaVerified')}</span>
              <span className={styles.metaValue}>
                {status.verifiedAt ? formatDate(status.verifiedAt) : t('data.byoc.metaVerifiedYes')}
              </span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{t('data.byoc.metaQuota')}</span>
              <span className={styles.metaValue} style={{ color: '#1ed760' }}>
                <ShieldCheck size={14} aria-hidden />
                {t('data.byoc.metaQuotaUnlimited')}
              </span>
            </div>
          </div>

          <div className={styles.connectedFooter}>
            <p className={styles.connectedNote}>
              {t('data.byoc.connectedNote')}
            </p>

            <button
              type="button"
              className={styles.disconnectBtn}
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 size={13} className="animate-spin" aria-hidden />
              ) : (
                <Unplug size={13} aria-hidden />
              )}
              <span>{isDisconnecting ? t('data.byoc.disconnecting') : t('data.byoc.disconnect')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* ─── Durum 2: Yapıştırma & Kurulum Sihirbazı (Spotify Ekranlarını Taklit Eden Mockup) ─── */
        <div className={styles.windowCard}>
          {/* Pencere Başlığı */}
          <div className={styles.windowHeader}>
            <div className={styles.windowMeta}>
              <span className={styles.spotifyBrandIcon} aria-hidden>
                <Radio size={16} />
              </span>
              <div className={styles.windowTitle}>
                <span>{t('data.byoc.windowTitle')}</span>
                <span className={styles.windowBreadcrumb}>{t('data.byoc.windowBreadcrumb')}</span>
              </div>
            </div>

            <div className={styles.headerActions}>
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLinkBtn}
              >
                <span>{t('data.byoc.openDashboardCta')}</span>
                <ExternalLink size={12} aria-hidden />
              </a>
            </div>
          </div>

          {/* Pencere Gövdesi: 2 Adımlı Akış */}
          <div className={styles.windowBody}>
            <div className={styles.twoColGrid}>
              {/* Adım 1: Spotify Create App Formu Mockup'ı */}
              <div className={styles.mockupPanel}>
                <div className={styles.stepBadge}>{t('data.byoc.step1Badge')}</div>
                <h3 className={styles.panelTitle}>{t('data.byoc.step1Title')}</h3>
                <p className={styles.panelDesc}>
                  {t('data.byoc.step1DescBefore')} <strong>{t('data.byoc.createApp')}</strong>{' '}
                  {t('data.byoc.step1DescAfter')}
                </p>
                {/*
                  Claude Code (2026-09-23): Spotify'ın Şubat 2026 kuralı — geliştirici
                  modundaki app yalnız sahibi Premium'dayken çalışır; Premium biterse
                  app durur ve Rosso'nun canlı senkronu da durur. Kullanıcı bunu
                  kurulumdan ÖNCE bilmeli, sonradan anlamsız 403'le değil.
                */}
                <p className={styles.fieldHint}>
                  {t('data.byoc.premiumHint')}
                </p>

                <div className={styles.spotifyFormMock}>
                  <div className={mockFieldWrap(styles)}>
                    <span className={styles.mockLabel}>{t('data.byoc.mockAppName')}</span>
                    <div className={styles.mockValue}>{t('data.byoc.mockAppNameValue')}</div>
                  </div>

                  <div className={mockFieldWrap(styles)}>
                    <span className={styles.mockLabel}>{t('data.byoc.mockAppDesc')}</span>
                    <div className={styles.mockValue}>
                      {t('data.byoc.mockAppDescValue')}
                    </div>
                  </div>

                  <div className={styles.copyBoxContainer}>
                    <div className={styles.copyBoxLabel}>
                      <span>{t('data.byoc.redirectUrisRequired')}</span>
                    </div>
                    <div className={styles.copyBox}>
                      <span className={styles.copyBoxValue}>{redirectUri}</span>
                      <button
                        type="button"
                        className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
                        onClick={handleCopyRedirectUri}
                        aria-label={t('data.byoc.copyRedirectUriAria')}
                      >
                        {copied ? (
                          <Check size={12} aria-hidden />
                        ) : (
                          <Copy size={12} aria-hidden />
                        )}
                        <span>{copied ? t('data.byoc.copied') : t('data.byoc.copy')}</span>
                      </button>
                    </div>
                  </div>

                  <div className={mockFieldWrap(styles)}>
                    <span className={styles.mockLabel}>{t('data.byoc.mockApiField')}</span>
                    <div className={styles.mockValue} style={{ color: '#1ed760' }}>
                      {t('data.byoc.mockApiValue')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Adım 2: Client ID / Secret Yapıştırma Alanı (Basic Information Mockup) */}
              <div className={styles.mockupPanel}>
                <div className={styles.stepBadge}>{t('data.byoc.step2Badge')}</div>
                <h3 className={styles.panelTitle}>{t('data.byoc.step2Title')}</h3>
                <p className={styles.panelDesc}>
                  {t('data.byoc.step2DescBefore')} <strong>{t('data.byoc.settingsPage')}</strong>{' '}
                  {t('data.byoc.step2DescAfter')}
                </p>

                {/*
                  Tarayıcılar metin + şifre alanı ikilisini giriş formu sanıp
                  kayıtlı e-posta/şifreyi otomatik dolduruyordu. autoComplete="off"
                  şifre alanında yok sayılır; "new-password" + alan adları +
                  şifre yöneticisi işaretleri doldurmayı keser.
                */}
                <form
                  className={styles.inputForm}
                  onSubmit={handleVerifyAndConnect}
                  autoComplete="off"
                >
                  <div className={styles.formField}>
                    <div className={styles.fieldLabelRow}>
                      <label htmlFor="byoc-client-id" className={styles.fieldLabel}>
                        {t('data.byoc.clientId')}
                      </label>
                      <span className={styles.fieldHint}>{t('data.byoc.clientIdHint')}</span>
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        id="byoc-client-id"
                        name="spotify-app-client-id"
                        type="text"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        data-bwignore
                        spellCheck="false"
                        className={styles.textInput}
                        placeholder={t('data.byoc.clientIdPlaceholder')}
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        disabled={isVerifying}
                      />
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <div className={styles.fieldLabelRow}>
                      <label htmlFor="byoc-client-secret" className={styles.fieldLabel}>
                        {t('data.byoc.clientSecret')}
                      </label>
                      <span className={styles.fieldHint}>{t('data.byoc.clientSecretHint')}</span>
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        id="byoc-client-secret"
                        name="spotify-app-client-secret"
                        type={showSecret ? 'text' : 'password'}
                        autoComplete="new-password"
                        data-1p-ignore
                        data-lpignore="true"
                        data-bwignore
                        spellCheck="false"
                        className={styles.textInput}
                        placeholder={t('data.byoc.clientSecretPlaceholder')}
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        disabled={isVerifying}
                      />
                      <button
                        type="button"
                        className={styles.inputIconRight}
                        onClick={() => setShowSecret((prev) => !prev)}
                        aria-label={showSecret ? t('data.byoc.hideSecretAria') : t('data.byoc.showSecretAria')}
                      >
                        {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/*
                    Claude Code (2026-09-23): Redirect URI app'e eklenmemişse
                    Spotify bizim sayfamıza HİÇ dönmez — kendi ekranında
                    "INVALID_CLIENT: Invalid redirect URI" yazıp durur. Kullanıcı
                    orada takılınca ne olduğunu anlasın diye önceden söylenir.
                  */}
                  <p className={styles.fieldHint}>
                    {t('data.byoc.invalidClientHint')}
                  </p>

                  {errorMsg && (
                    <div className={styles.errorMsg} role="alert">
                      <AlertTriangle size={14} aria-hidden />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className={styles.successMsg} role="status">
                      <Check size={14} aria-hidden />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isVerifying || !clientId || !clientSecret}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden />
                        <span>{t('data.byoc.verifying')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} aria-hidden />
                        <span>{t('data.byoc.verifyAndConnect')}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function mockFieldWrap(styles: Record<string, string>): string {
  return styles.mockField || ''
}
