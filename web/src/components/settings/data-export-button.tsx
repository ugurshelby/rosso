'use client'

import { useState } from 'react'
import { Download, Loader2, Check } from 'lucide-react'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import { useT } from '@/lib/i18n/provider'
import styles from './data-export-button.module.css'

/**
 * "Verilerimi talep et" — KVKK/GDPR veri taşınabilirliği (2026-07-27).
 *
 * Tıklayınca POST /api/account/export-data → kullanıcının kişisel veri paketini
 * (JSON) ANINDA indirir. Eskiden bu bir `mailto:` bağlantısıydı (elle süreç);
 * artık uçtan uca otomatik. SMTP kurulunca "maile gönder" seçeneği eklenebilir.
 *
 * Not: settings sayfasının `actionItem` görsel dilini dışarıdan `className` ile
 * alır — stil tek yerde (page.module.css), burada tekrarlanmaz. Yalnız spinner
 * animasyonu buraya ait (reduced-motion'da dönmez, §4.5).
 */
export function DataExportButton({ className, iconClassName, labelClassName }: {
  className?: string
  iconClassName?: string
  labelClassName?: string
}) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const reduced = usePrefersReducedMotion()
  const { t } = useT()

  async function handleExport() {
    if (state === 'working') return
    setState('working')
    try {
      const res = await fetch('/api/account/export-data', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rosso-verilerim-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setState('done')
      setTimeout(() => setState('idle'), 4000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const label =
    state === 'working' ? t('settings.dataExportButton.working')
    : state === 'done' ? t('settings.dataExportButton.done')
    : state === 'error' ? t('settings.dataExportButton.error')
    : t('settings.dataExportButton.idle')

  const icon =
    state === 'working'
      ? <Loader2 size={16} className={`${iconClassName ?? ''} ${reduced ? '' : styles.spin}`.trim()} aria-hidden />
      : state === 'done'
        ? <Check size={16} className={iconClassName} aria-hidden />
        : <Download size={16} className={iconClassName} aria-hidden />

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={state === 'working'}
      className={className}
      aria-busy={state === 'working'}
    >
      {icon}
      <span className={labelClassName}>{label}</span>
    </button>
  )
}
