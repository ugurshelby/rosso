'use client'

import { useState, useTransition } from 'react'
import { useT } from '@/lib/i18n/provider'

interface Props {
  includeIncognito: boolean
  collaborativeSync: boolean
}

export function PrivacyToggles({ includeIncognito, collaborativeSync }: Props) {
  const { t } = useT()
  const [prefs, setPrefs] = useState({ includeIncognito, collaborativeSync })
  const [, startTransition] = useTransition()

  async function toggle(key: 'includeIncognito' | 'collaborativeSync') {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    startTransition(async () => {
      await fetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          include_incognito: next.includeIncognito,
          collaborative_sync: next.collaborativeSync,
        }),
      })
    })
  }

  return (
    // flex+justify-between (2026-07-30): HESAP kartı artık daha uzun (hero bandı,
    // bkz. account-summary.module.css) — grid satırı eşit yüksekliğe gerilince
    // bu kart içeriği eşit yayılsın diye (bkz. settings.module.css .bentoContent).
    <div className="flex h-full flex-col justify-between gap-4">
      {/* Incognito toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-(--color-text-primary)">
            {t('settings.privacyToggles.incognito.title')}
          </p>
          <p className="text-xs text-(--color-text-secondary) mt-0.5">
            {t('settings.privacyToggles.incognito.desc')}
          </p>
        </div>
        {/* p-2.5 -m-2.5: dokunma hedefini 44px'e büyütür, görünen anahtar boyutu değişmez. */}
        <label className="relative inline-flex items-center shrink-0 cursor-pointer p-2.5 -m-2.5">
          <input name="includeIncognito"
            type="checkbox"
            className="sr-only peer"
            checked={prefs.includeIncognito}
            onChange={() => toggle('includeIncognito')}
          />
          <div className="relative w-11 h-6 bg-[var(--color-border)] rounded-full peer
            peer-checked:bg-[var(--color-accent)]
            after:content-[''] after:absolute after:top-0.5 after:left-0.5
            after:bg-white after:rounded-full after:h-5 after:w-5
            after:transition-all motion-reduce:after:transition-none peer-checked:after:translate-x-5" />
        </label>
      </div>

      <hr className="border-[var(--color-border)]" />

      {/* Collaborative sync toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-(--color-text-primary)">
            {t('settings.privacyToggles.collaborative.title')}
          </p>
          <p className="text-xs text-(--color-text-secondary) mt-0.5">
            {t('settings.privacyToggles.collaborative.desc')}
          </p>
        </div>
        <label className="relative inline-flex items-center shrink-0 cursor-pointer p-2.5 -m-2.5">
          <input name="collaborativeSync"
            type="checkbox"
            className="sr-only peer"
            checked={prefs.collaborativeSync}
            onChange={() => toggle('collaborativeSync')}
          />
          <div className="relative w-11 h-6 bg-[var(--color-border)] rounded-full peer
            peer-checked:bg-[var(--color-accent)]
            after:content-[''] after:absolute after:top-0.5 after:left-0.5
            after:bg-white after:rounded-full after:h-5 after:w-5
            after:transition-all motion-reduce:after:transition-none peer-checked:after:translate-x-5" />
        </label>
      </div>

      <p className="text-xs text-(--color-text-secondary)">
        {t('settings.privacyToggles.dataPolicy')}{' '}
        <a href="/privacy" className="underline hover:text-(--color-accent) inline-block py-1">
          {t('settings.privacyToggles.privacyPageLink')}
        </a>
      </p>
    </div>
  )
}
