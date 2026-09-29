'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import type { CreateOption } from '@/lib/playlists/create-options'
import { useT } from '@/lib/i18n/provider'
import styles from './secim-paneli.module.css'

/**
 * Çoklu seçim paneli — tür ve sanatçı seçimi için.
 *
 * Sahibin tarifi (P4.2, kabul kriteri): *"Tür dedik, artist dedik, zaman
 * aralığı dedik — bunlar tıklanınca açılan türden olmalı, yani tıklanınca
 * panel açılmalı, türleri orda görüp seçebilmeliyim."*
 *
 * Tasarım kararları:
 * - **Özet satır tetikleyici**: kapalıyken seçimi söyler ("3 tür seçili"),
 *   boşken "Hepsi" der — filtre YOKSA hepsi demektir, kullanıcı boş bırakınca
 *   ne olacağını merak etmesin.
 * - **Arama**: 300 sanatçı listede; aramasız seçim işkence olurdu.
 * - **"Hepsini seç / temizle"**: Sahip *"tek tek tüm türleri seçebilmeli
 *   veya hepsini seçebilmeli"* dedi.
 * - Seçim **panel kapanınca değil anında** uygulanır; kullanıcı önizlemede
 *   sonucu görerek karar verir.
 */
export function SecimPaneli({
  label,
  options,
  selected,
  onChange,
  emptyLabel,
  searchPlaceholder,
}: {
  label: string
  options: CreateOption[]
  selected: string[]
  onChange: (next: string[]) => void
  emptyLabel?: string
  searchPlaceholder?: string
}) {
  const { t } = useT()
  const resolvedEmptyLabel = emptyLabel ?? t('playlists.selectionPanel.all')
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('playlists.selectionPanel.searchPlaceholder')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('en-US')
    if (!q) return options
    return options.filter((o) => o.value.toLocaleLowerCase('en-US').includes(q))
  }, [options, query])

  const ozet =
    selected.length === 0
      ? resolvedEmptyLabel
      : selected.length <= 2
        ? selected.join(', ')
        : t('playlists.selectionPanel.selectedCount', { count: selected.length })

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    )
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <span className={styles.triggerLabel}>{label}</span>
        <span className={styles.triggerValue}>
          {ozet}
          <ChevronDown size={15} strokeWidth={1.75} aria-hidden />
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={label}>
        <div className={styles.panel}>
          {options.length > 12 && (
            <div className={styles.searchRow}>
              <Search size={15} strokeWidth={1.75} aria-hidden className={styles.searchIcon} />
              <input name="selectionSearch"
                type="text"
                className={styles.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={resolvedSearchPlaceholder}
                aria-label={t('playlists.selectionPanel.searchAriaLabel', { label })}
              />
              {query && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setQuery('')}
                  aria-label={t('playlists.selectionPanel.clearSearchAriaLabel')}
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              )}
            </div>
          )}

          <div className={styles.bulkRow}>
            <span className={styles.bulkInfo}>
              {selected.length === 0
                ? t('playlists.selectionPanel.noFilterHint', { label: resolvedEmptyLabel })
                : t('playlists.selectionPanel.selectedCount', { count: selected.length })}
            </span>
            <span className={styles.bulkActions}>
              <button
                type="button"
                className={styles.bulkBtn}
                onClick={() => onChange(filtered.map((o) => o.value))}
              >
                {t('playlists.selectionPanel.selectAll')}
              </button>
              <button
                type="button"
                className={styles.bulkBtn}
                onClick={() => onChange([])}
                disabled={selected.length === 0}
              >
                {t('playlists.selectionPanel.clear')}
              </button>
            </span>
          </div>

          <ul className={styles.list}>
            {filtered.length === 0 && (
              <li className={styles.empty}>{t('playlists.selectionPanel.noMatches')}</li>
            )}
            {filtered.map((o) => {
              const isSel = selected.includes(o.value)
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    className={`${styles.item} ${isSel ? styles.itemOn : ''}`}
                    onClick={() => toggle(o.value)}
                    aria-pressed={isSel}
                  >
                    <span className={styles.itemCheck} aria-hidden>
                      {isSel && <Check size={13} strokeWidth={2.5} />}
                    </span>
                    <span className={styles.itemName}>{o.value}</span>
                    <span className={styles.itemCount}>{o.count.toLocaleString('en-US')}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </Modal>
    </>
  )
}
