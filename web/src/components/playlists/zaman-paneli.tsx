'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useT } from '@/lib/i18n/provider'
import type { Translator } from '@/lib/i18n/translate'
import styles from './secim-paneli.module.css'
import zStyles from './zaman-paneli.module.css'

/**
 * Zaman aralığı paneli (P4.2) — tür/sanatçı panelleriyle aynı tetikleyici dili.
 *
 * Hazır aralıklar + serbest tarih. Sahibin tarifi: *"zaman aralığı…
 * tıklanınca panel açılmalı, istediği zaman aralığını seçip sadece o zaman
 * aralığından şarkıları dahil edebilmeli."*
 */

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function hazirAraliklar(t: Translator['t']) {
  const bugun = new Date()
  const gecenAyBas = new Date(bugun.getFullYear(), bugun.getMonth() - 1, 1)
  const gecenAySon = new Date(bugun.getFullYear(), bugun.getMonth(), 0)
  return [
    {
      key: 'son30',
      label: t('playlists.timeRange.presets.last30'),
      from: iso(new Date(bugun.getTime() - 30 * 86400000)),
      to: iso(bugun),
    },
    {
      key: 'gecenAy',
      label: t('playlists.timeRange.presets.lastMonth'),
      from: iso(gecenAySon > gecenAyBas ? gecenAyBas : gecenAyBas),
      to: iso(gecenAySon),
    },
    {
      key: 'buYil',
      label: t('playlists.timeRange.presets.thisYear'),
      from: `${bugun.getFullYear()}-01-01`,
      to: iso(bugun),
    },
    {
      key: 'gecenYil',
      label: t('playlists.timeRange.presets.lastYear'),
      from: `${bugun.getFullYear() - 1}-01-01`,
      to: `${bugun.getFullYear() - 1}-12-31`,
    },
    {
      key: 'tum',
      label: t('playlists.timeRange.presets.allTime'),
      from: '2008-01-01', // Spotify'ın kendi başlangıcından önce veri yok
      to: iso(bugun),
    },
  ]
}

export function ZamanPaneli({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const araliklar = hazirAraliklar(t)

  const eslesen = araliklar.find((a) => a.from === from && a.to === to)
  const ozet = eslesen
    ? eslesen.label
    : `${new Date(from).toLocaleDateString('en-US')} – ${new Date(to).toLocaleDateString('en-US')}`

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <span className={styles.triggerLabel}>{t('playlists.timeRange.trigger')}</span>
        <span className={styles.triggerValue}>
          {ozet}
          <ChevronDown size={15} strokeWidth={1.75} aria-hidden />
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t('playlists.timeRange.modalTitle')}>
        <div className={styles.panel}>
          <div className={zStyles.presets}>
            {araliklar.map((a) => (
              <button
                key={a.key}
                type="button"
                className={`${zStyles.preset} ${
                  a.from === from && a.to === to ? zStyles.presetOn : ''
                }`}
                onClick={() => onChange(a.from, a.to)}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className={zStyles.customRow}>
            <label className={zStyles.dateField}>
              <span className={zStyles.dateLabel}>{t('playlists.timeRange.start')}</span>
              <input name="rangeFrom"
                type="date"
                value={from}
                max={to}
                onChange={(e) => onChange(e.target.value, to)}
                className={zStyles.dateInput}
              />
            </label>
            <label className={zStyles.dateField}>
              <span className={zStyles.dateLabel}>{t('playlists.timeRange.end')}</span>
              <input name="rangeTo"
                type="date"
                value={to}
                min={from}
                onChange={(e) => onChange(from, e.target.value)}
                className={zStyles.dateInput}
              />
            </label>
          </div>
        </div>
      </Modal>
    </>
  )
}
