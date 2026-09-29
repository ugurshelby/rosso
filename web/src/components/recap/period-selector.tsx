'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { Period } from '@/lib/analytics/engine'
import { useT } from '@/lib/i18n/provider'
import styles from '@/app/(dashboard)/recap/recap.module.css'

interface PeriodSelectorProps {
  value: Period
  onChange?: (p: Period) => void
  basePath?: string
  /**
   * P0.6 — hangi dönemler seçilebilir (faz kilidi).
   * Verilmezse dördü de açık (Faz 3/4 davranışı, geriye dönük uyumlu).
   * Faz 2'de `['week','month']` gelir: API penceresi ~20 gün olduğu için
   * "Yıllık"/"Tüm Zamanlar" sekmeleri yanıltıcı olurdu (Sahip onayı 30 Tem).
   */
  periods?: Period[]
}

const ALL_PERIODS: Period[] = ['week', 'month', 'year', 'alltime']

export function PeriodSelector({
  value,
  onChange,
  basePath = '/recap',
  periods = ALL_PERIODS,
}: PeriodSelectorProps) {
  const router = useRouter()
  const { t } = useT()

  const PERIOD_LABELS: Record<Period, string> = {
    week: t('recap.periodSelector.week'),
    month: t('recap.periodSelector.month'),
    year: t('recap.periodSelector.year'),
    alltime: t('recap.periodSelector.alltime'),
  }

  function getPeriodSubLabel(period: Period): string | null {
    const now = new Date()
    if (period === 'month') {
      return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    if (period === 'year') {
      return String(now.getFullYear())
    }
    if (period === 'week') {
      const from = new Date(now)
      from.setDate(from.getDate() - 7)
      const fromStr = from.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      const toStr = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      return `${fromStr} – ${toStr}`
    }
    // `alltime` eskiden null dönüyordu: diğer üç sekmede tarih yazarken bu sekme
    // seçilince alan tamamen boşalıyor, şerit "eksik" görünüyordu (2026-08-14
    // kullanıcı testi, Ş-12). Kapsamı söyleyen sabit bir etiket veriliyor.
    if (period === 'alltime') {
      return t('recap.periodSelector.alltimeSubLabel')
    }
    return null
  }

  const subLabel = getPeriodSubLabel(value)
  // KATMAN 3 (2026-07-25): filtre değişince "donmuş hissi" vardı (skeleton yok).
  // router.push'u transition'a sar → isPending sırasında selector dimmed/pulse
  // görsel geri bildirim verir (tıklama anında "işleniyor").
  const [isPending, startTransition] = useTransition()

  function handleClick(p: Period) {
    if (onChange) {
      onChange(p)
    } else {
      startTransition(() => {
        router.push(`${basePath}?period=${p}`, { scroll: false })
      })
    }
  }

  return (
    <div className={styles.periodSelectorWrap}>
      <SegmentedControl
        layoutId="recap-period-pill"
        ariaLabel={t('recap.periodSelector.ariaLabel')}
        options={periods.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
        value={value}
        onChange={handleClick}
        pending={isPending}
        fullWidthOnMobile
      />
      {subLabel && (
        <span className={styles.periodSubLabel} aria-live="polite">
          {subLabel}
        </span>
      )}
    </div>
  )
}
