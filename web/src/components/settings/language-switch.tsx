'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setLocale } from '@/lib/i18n/actions'
import { LOCALES, type Locale } from '@/lib/i18n/locales'
import { common } from '@/lib/i18n/messages/en/common'

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function choose(next: Locale) {
    if (next === locale || isPending) return
    startTransition(async () => {
      const result = await setLocale(next)
      if (result.ok) router.refresh()
    })
  }

  return (
    <div
      role="radiogroup"
      aria-label="Interface language"
      className="inline-flex rounded-full border border-[var(--color-border)] p-1 gap-1"
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={locale === code}
          disabled={isPending}
          onClick={() => choose(code)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-[--duration-fast,150ms] disabled:opacity-60 ${
            locale === code
              ? 'bg-[var(--color-accent)] text-white'
              : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
          }`}
        >
          {common.language[code]}
        </button>
      ))}
    </div>
  )
}
