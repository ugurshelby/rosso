'use client'

import { useEffect } from 'react'
import { useT } from '@/lib/i18n/provider'
// Stiller globals.css'te (.status-page*) — hata sınırının CSS'i her sayfada boşa preload edilmesin (2026-09-24).

// Dashboard hata sınırı — design.md tonu (özür dilemez, ne yapılacağını söyler).
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useT()
  useEffect(() => {
    // Structured logger'a ilet (PII redaction sunucu tarafında uygulanır).
    void fetch('/api/log/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      }),
    }).catch(() => {
      // Log iletimi başarısız olursa kullanıcı akışı etkilenmez.
    })
  }, [error])

  return (
    <div className="status-page">
      <span className="status-page__code">{t('shared.error.code')}</span>
      <h1 className="status-page__title">{t('shared.error.title')}</h1>
      <p className="status-page__description">{t('shared.error.description')}</p>
      <button className="status-page__cta" onClick={reset} type="button">
        {t('shared.error.retry')}
      </button>
    </div>
  )
}
