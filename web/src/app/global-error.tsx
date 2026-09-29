'use client'

import { useEffect } from 'react'
import { ERROR_PAGE_THEME } from '@/lib/error-page-theme'

// Kök layout'u da saran son hata sınırı — kendi <html>/<body>'sini render eder.
// CSS değişkenleri burada güvenilir değil; token sabitleri kullanılır.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = ERROR_PAGE_THEME

  /*
   * Kök seviyedeki çökmeler EN CİDDİ olanlar (layout/provider patladı, sayfa
   * hiç açılmadı) ama 2026-09-17'ye kadar buradan hiçbir yere rapor gitmiyordu:
   * `error` prop'u alınıp kullanılmadan atılıyordu. `(dashboard)/error.tsx`
   * zaten raporluyordu — asıl kör nokta buydu.
   */
  useEffect(() => {
    void fetch('/api/log/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: `[global] ${error.message}`,
        digest: error.digest,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      }),
    }).catch(() => {
      // Log iletimi başarısız olursa kullanıcı akışı etkilenmez.
    })
  }, [error])
  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontFamily: 'system-ui, sans-serif',
          background: t.bg,
          color: t.text,
          textAlign: 'center',
          padding: '32px',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: t.muted, maxWidth: 380 }}>
          The app ran into an unexpected error. Try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            background: t.accent,
            color: t.onAccent,
            border: 'none',
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
