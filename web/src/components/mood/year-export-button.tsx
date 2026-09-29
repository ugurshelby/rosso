'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/provider'
import styles from './mood.module.css'

/**
 * Your Years — tek seferlik Spotify export butonu. Gizleme/haftalık senkron
 * YOK (Sahibin kararı, 2026-09-18) — `MoodWorkspace`'in sadeleştirilmiş
 * karşılığı, yalnız bir aksiyonu var.
 */
export function YearExportButton({ year }: { year: number }) {
  const { t } = useT()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleExport() {
    setState('loading')
    try {
      const res = await fetch('/api/mood/year-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      if (!res.ok) throw new Error('export failed')
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <button
      type="button"
      className={styles.yearExportBtn}
      onClick={handleExport}
      disabled={state === 'loading' || state === 'done'}
    >
      {state === 'done' ? t('mood.yearExport.added') : state === 'loading' ? t('mood.yearExport.adding') : t('mood.yearExport.addToSpotify')}
      {state === 'error' && <span className={styles.workspaceError}>{t('mood.yearExport.error')}</span>}
    </button>
  )
}
