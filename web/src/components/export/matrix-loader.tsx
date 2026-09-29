'use client'

import { useT } from '@/lib/i18n/provider'
import styles from './matrix-loader.module.css'

// Orijinal tasarımdaki 8 haneli 0/1 dizisi (design-components kaynağı birebir).
const DIGITS: readonly string[] = ['0', '1', '0', '1', '1', '0', '0', '1']

/**
 * Matrix tarzı veri-yükleme animasyonu.
 * Export işleme (queued/processing) sırasında, yanıltıcı yüzde yerine
 * "veriler analiz ediliyor" hissi veren bekleme göstergesi olarak kullanılır.
 * Renk tema paletinden (var(--color-accent)) gelir — V1/V2/V3 ile uyumlu.
 */
export function MatrixLoader() {
  const { t } = useT()
  return (
    <div className={styles.loader} role="status" aria-label={t('settings.export.matrixLoaderAria')}>
      {DIGITS.map((digit, i) => (
        <div key={i} className={styles.digit} aria-hidden>
          {digit}
        </div>
      ))}
      <div className={styles.glow} aria-hidden />
    </div>
  )
}
