'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'
import { useT } from '@/lib/i18n/provider'
import { intlLocale } from '@/lib/i18n'
import styles from './freshness-bar.module.css'

interface FreshnessBarProps {
  lastSyncLabel: string | null
}

export function FreshnessBar({ lastSyncLabel }: FreshnessBarProps) {
  const router = useRouter()
  const reduced = usePrefersReducedMotion()
  const { t, locale } = useT()
  const [isPending, startTransition] = useTransition()
  const [cooldown, setCooldown] = useState(false)
  const [localLabel, setLocalLabel] = useState<string | null>(null)

  const displayLabel = localLabel ?? lastSyncLabel

  const busy = isPending || cooldown

  async function handleRefresh() {
    if (busy) return
    setCooldown(true)
    let hasNewEvents = false
    try {
      const res = await fetch('/api/spotify/sync', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.eventsWritten > 0) {
          hasNewEvents = true
        } else {
          const timeStr = new Date().toLocaleTimeString(intlLocale(locale), { hour: 'numeric', minute: '2-digit' })
          setLocalLabel(t('dashboard.time.checkedAt', { time: timeStr }))
        }
      }
    } catch {
      hasNewEvents = true
    }
    
    if (hasNewEvents) {
      startTransition(() => {
        router.refresh()
      })
    }
    window.setTimeout(() => setCooldown(false), 5000)
  }

  return (
    <div className={styles.bar} role="status" aria-live="polite">
      <span className={styles.statusPill}>
        <span
          className={`${styles.dot} ${lastSyncLabel ? styles.dotFresh : styles.dotIdle}`}
          aria-hidden
        />
        <span className={styles.label}>
          {displayLabel
            ? t('dashboard.freshness.lastUpdated', { label: displayLabel })
            : t('dashboard.freshness.noUpdateYet')}
        </span>
      </span>
      <button
        type="button"
        className={styles.refreshBtn}
        onClick={handleRefresh}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? (
          reduced ? (
            <RefreshCw size={14} strokeWidth={1.5} aria-hidden />
          ) : (
            <Loader2 size={14} strokeWidth={1.5} className={styles.spin} aria-hidden />
          )
        ) : (
          <RefreshCw size={14} strokeWidth={1.5} aria-hidden />
        )}
        {t('dashboard.freshness.refresh')}
      </button>
    </div>
  )
}
