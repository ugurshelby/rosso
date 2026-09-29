'use client'

import { useState, useTransition } from 'react'
import { useT } from '@/lib/i18n/provider'
import styles from '@/app/(dashboard)/playlists/create/automations.module.css'

/**
 * AutoPlaylistRule — tek bileşen, hem aylık hem yıllık kuralı yönetir
 * (FAZ AUTO-PL-V2, 2026-07-21).
 *
 * Denetim bulgusu: yıllık motor (`top_year`) zaten yazılmıştı ve canlı veriyle
 * doğru çalışıyordu; eksik olan tek şey UI'nın onu kullanıcıya sunmamasıydı.
 * Bu bileşen `variant` ile ikisini de tek koddan üretir — aylık için önceki
 * tek-amaçlı bileşenle birebir aynı davranış korunur.
 *
 * Sahip kararı (2026-07-21): yıllık = geleneksel Ocak ritmi. Temmuz'da açan
 * kullanıcı "kaydettim ama boş" sanmasın diye yıllıkta "Ocak'ta üretilir" notu
 * görünür.
 */
export interface AutoPlaylistRuleData {
  id?: string
  rule_type: string
  track_count: 20 | 50 | 100
  target_platforms: string[]
  enabled: boolean
  last_run_at?: string | null
  /**
   * Sıralama ölçütü (migration 0278). Sahibin kararı (P4.1): kullanıcı
   * "en çok dinleme mi en çok süre mi" seçebilmeli. Varsayılan `plays` —
   * eski davranış, mevcut kuralların listesi değişmez.
   *
   * Ölçüldü (2026-08-15): ikisi gerçekten farklı liste üretiyor —
   * çalma sayısı → "Dance Up · Sun · Lose My Mind",
   * süre → "Ara Beni Lütfen · Dance Up · Smooth Operator".
   */
  sort_by?: 'plays' | 'duration'
}

interface Props {
  variant: 'monthly' | 'yearly'
  initialRule: AutoPlaylistRuleData | null
}

const TRACK_COUNT_OPTIONS: Array<20 | 50 | 100> = [20, 50, 100]

const PLATFORM_OPTIONS = [
  { value: 'spotify', color: '#1DB954' },
] as const

/** Örnek isimler: bir önceki ay/yıl (jenerik, canlı hesap değil — yalnız önizleme). */
const PREVIEW_NAMES = {
  monthly: 'May 2026',
  yearly: '2025',
} as const

export function AutoPlaylistRule({ variant, initialRule }: Props) {
  const { t } = useT()

  const SORT_OPTIONS = [
    { value: 'plays', label: t('automations.autoPlaylistRule.sortOptions.plays') },
    { value: 'duration', label: t('automations.autoPlaylistRule.sortOptions.duration') },
  ] as const satisfies ReadonlyArray<{ value: 'plays' | 'duration'; label: string }>

  const VARIANT_CONFIG = {
    monthly: {
      ruleType: 'top_month',
      title: t('automations.autoPlaylistRule.monthly.title'),
      subtitle: t('automations.autoPlaylistRule.monthly.subtitle'),
      previewName: PREVIEW_NAMES.monthly,
      previewWhen: t('automations.autoPlaylistRule.monthly.previewWhen'),
      toggleAria: t('automations.autoPlaylistRule.monthly.toggleAria'),
      note: null as string | null,
    },
    yearly: {
      ruleType: 'top_year',
      title: t('automations.autoPlaylistRule.yearly.title'),
      subtitle: t('automations.autoPlaylistRule.yearly.subtitle'),
      previewName: PREVIEW_NAMES.yearly,
      previewWhen: t('automations.autoPlaylistRule.yearly.previewWhen'),
      toggleAria: t('automations.autoPlaylistRule.yearly.toggleAria'),
      // Sahip kararı: Wrapped ritmi. Yıl ortasında açan kullanıcı Ocak'a kadar
      // üretim görmez — bu notla "kaydettim ama boş" hissi telafi edilir.
      note: t('automations.autoPlaylistRule.yearly.note'),
    },
  } as const

  const cfg = VARIANT_CONFIG[variant]
  const [rule, setRule] = useState<AutoPlaylistRuleData>(
    initialRule ?? {
      rule_type: cfg.ruleType,
      track_count: 50,
      target_platforms: [],
      enabled: false,
      sort_by: 'plays',
    },
  )
  const [isSaving, startSaving] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  async function save(patch: Partial<AutoPlaylistRuleData>) {
    const next = { ...rule, ...patch }
    setRule(next)

    if (next.target_platforms.length === 0) return

    startSaving(async () => {
      const res = await fetch('/api/automations/playlist-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: cfg.ruleType,
          track_count: next.track_count,
          target_platforms: next.target_platforms,
          enabled: next.enabled,
          sort_by: next.sort_by ?? 'plays',
        }),
      })
      if (res.ok) {
        setFeedback({ ok: true, msg: t('automations.autoPlaylistRule.feedback.saved') })
        setTimeout(() => setFeedback(null), 2000)
      } else {
        setFeedback({ ok: false, msg: t('automations.autoPlaylistRule.feedback.failed') })
      }
    })
  }

  function togglePlatform(platform: string) {
    const platforms = rule.target_platforms.includes(platform)
      ? rule.target_platforms.filter((p) => p !== platform)
      : [...rule.target_platforms, platform]
    save({ target_platforms: platforms })
  }

  return (
    <div className={styles.card}>
      {/* Header — title + toggle */}
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <h3 className={styles.cardTitle}>{cfg.title}</h3>
          <p className={styles.cardSubtitle}>{cfg.subtitle}</p>
        </div>

        <label className={styles.toggle} aria-label={cfg.toggleAria}>
          <input name="autoPlaylistEnabled"
            type="checkbox"
            className={styles.toggleInput}
            checked={rule.enabled}
            onChange={(e) => save({ enabled: e.target.checked })}
            disabled={isSaving}
          />
          <div className={styles.toggleTrack} />
          <div className={styles.toggleThumb} />
        </label>
      </div>

      {/* Content — disabled when off */}
      <div className={`${styles.fieldGroup} ${rule.enabled ? '' : styles.disabled}`}>
        {/* Yıllık için Ocak notu (aylıkta null) */}
        {cfg.note && rule.enabled && (
          <p className={styles.hintText}>{cfg.note}</p>
        )}

        {/* Track count */}
        <div>
          <span className={styles.fieldLabel}>{t('automations.autoPlaylistRule.fieldLabels.trackCount')}</span>
          <div className={styles.chipGroup}>
            {TRACK_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => save({ track_count: n })}
                className={`${styles.chip} ${rule.track_count === n ? styles.chipActive : ''}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Sıralama ölçütü (migration 0278 · Sahibin P4.1 tarifi).
            Aynı dönemde iki ölçüt FARKLI liste üretir: 2 dakikalık bir şarkıyı
            40 kez çalmak "çalma sayısı"nda zirve, "time"de orta sıradır. */}
        <div>
          <span className={styles.fieldLabel}>{t('automations.autoPlaylistRule.fieldLabels.sortBy')}</span>
          <div className={styles.chipGroup} role="radiogroup" aria-label={t('automations.autoPlaylistRule.fieldLabels.sortByAria')}>
            {SORT_OPTIONS.map((o) => {
              const secili = (rule.sort_by ?? 'plays') === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={secili}
                  onClick={() => save({ sort_by: o.value })}
                  className={`${styles.chip} ${secili ? styles.chipActive : ''}`}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Platform */}
        <div>
          <span className={styles.fieldLabel}>{t('automations.autoPlaylistRule.fieldLabels.targetPlatforms')}</span>
          <div className={styles.chipGroup}>
            {PLATFORM_OPTIONS.map(({ value, color }) => {
              const active = rule.target_platforms.includes(value)
              return (
                <button
                  key={value}
                  onClick={() => togglePlatform(value)}
                  className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                >
                  <span
                    className={styles.platformDot}
                    style={{ background: color }}
                    aria-hidden
                  />
                  {t('automations.autoPlaylistRule.platformLabel.spotify')}
                </button>
              )
            })}
          </div>
          {rule.target_platforms.length === 0 && (
            <p className={styles.hintText}>{t('automations.autoPlaylistRule.pickPlatform')}</p>
          )}
        </div>

        {/* Name preview */}
        <div>
          <span className={styles.fieldLabel}>{t('automations.autoPlaylistRule.fieldLabels.nameFormat')}</span>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>{t('automations.autoPlaylistRule.example')}</span>
            <span className={styles.previewValue}>{cfg.previewName}</span>
            <span className={styles.previewSoon}>{cfg.previewWhen}</span>
          </div>
        </div>

        {/* Last run */}
        {rule.last_run_at && (
          <p className={styles.hintText}>
            {t('automations.autoPlaylistRule.lastRun', {
              date: new Date(rule.last_run_at).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            })}
          </p>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <p className={`${styles.feedback} ${feedback.ok ? styles.feedbackOk : styles.feedbackErr}`}>
          {feedback.msg}
        </p>
      )}
    </div>
  )
}
