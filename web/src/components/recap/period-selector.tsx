'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getDateRange, type Period } from '@/lib/analytics/period'
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
  const { t, locale } = useT()

  const PERIOD_LABELS: Record<Period, string> = {
    week: t('recap.periodSelector.week'),
    month: t('recap.periodSelector.month'),
    year: t('recap.periodSelector.year'),
    alltime: t('recap.periodSelector.alltime'),
  }

  // Dönemler TAKVİM değil KAYAN penceredir (engine.getDateRange): "Aylık" = bugünden
  // geriye 1 ay. Eskiden alt etikette "October 2026" / "2026" yazıyordu — takvim ayı
  // sanılıyordu (2026-10-04 Sahip bulgusu). Etiket artık aralığı ve kapsamı söyler,
  // seçili dilde.
  function getPeriodSubLabel(period: Period): string | null {
    if (period === 'alltime') return t('recap.periodSelector.alltimeSubLabel')
    const { from, to } = getDateRange(period)
    if (!from) return null
    const dil = locale === 'tr' ? 'tr-TR' : 'en-US'
    const gunAy: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    const ayYil: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
    const bicim = period === 'year' ? ayYil : gunAy
    const aralik = `${from.toLocaleDateString(dil, bicim)} – ${to.toLocaleDateString(dil, bicim)}`
    const kapsam =
      period === 'week'
        ? t('recap.periodSelector.lastWeek')
        : period === 'month'
          ? t('recap.periodSelector.lastMonth')
          : t('recap.periodSelector.lastYear')
    return `${kapsam} · ${aralik}`
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
