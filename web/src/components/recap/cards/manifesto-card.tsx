'use client'

import { animate, motion, useReducedMotion } from 'motion/react'
import { SPRING_UI } from '@/lib/motion/apple-spring'
import { useEffect, useMemo, useState } from 'react'
import styles from './manifesto-card.module.css'

/**
 * Kart 2 — Sinematik manifesto poster.
 *
 * FAZ ART-DIRECTION (2026-08-13): kompozisyon merkez-simetrik ızgaradan
 * **sol hizalı editorial poster**e taşındı (gerekçe: manifesto-card.module.css
 * başındaki uzun not). Bileşen tarafındaki karşılığı: tek `RecapStatGrid`
 * yerine üç ayrı hiyerarşi katmanı —
 *   1) hero      → dakika (tek, dev, sol hizalı)
 *   2) primary   → şarkı + sanatçı (birincil çift, tek satır)
 *   3) meta      → kalan istatistikler (künye satırları, etiket→değer)
 *
 * ⚠ `RecapStatGrid` bu kartın web tarafındaki TEK kullanıcısıydı (kardeş
 * kart K12 — year-matrix — 2026-08-11'de kaldırılmıştı), yani bu geçişle
 * `src/components/recap/recap-stat-grid.tsx` sahipsiz kaldı. **Silinmedi**
 * — dosya silmek CLAUDE.md §6 gereği Sahibin onayına tabi. Mobil tarafın
 * (`mobile/.../recap-stat-grid`) AYRI bir kopyası var ve o hâlâ
 * kullanımda, dolayısıyla web kopyasını silmek mobili kırmaz; karar
 * Sahibe bırakıldı.
 */
export interface ManifestoData {
  minutes: number
  tracks: number
  artists: number
  dominant_genre: string | null
  car_hours?: number
  car_sessions?: number
  genre_count?: number
  new_artists?: number
  /**
   * A13.8 — dinleme yaşı. Alan **yoksa satır basılmaz** (doğum tarihi yok ya
   * da release_year kapsaması yetersiz). Uydurma yaş göstermek yasak.
   */
  listening_age?: number
}

const nf = new Intl.NumberFormat('en-US')

function AnimatedMinutes({ value, reduced }: { value: number; reduced: boolean }) {
  if (reduced) {
    return (
      <span className={styles.heroValue} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {nf.format(value)}
      </span>
    )
  }
  return <AnimatedMinutesCounter value={value} />
}

function AnimatedMinutesCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(0, value, {
      ...SPRING_UI,
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value])

  return (
    <span className={styles.heroValue} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {nf.format(display)}
    </span>
  )
}

interface MetaRow {
  label: string
  value: string
  genre?: boolean
}

/**
 * Künye satırları — hero ve birincil çiftin DIŞINDA kalan istatistikler.
 * Değeri olmayan satır hiç basılmaz (eski davranış korunuyor: uydurma
 * değer gösterilmez).
 */
function buildMetaRows(data: ManifestoData): MetaRow[] {
  const rows: MetaRow[] = []

  if (data.dominant_genre) {
    rows.push({
      label: 'dominant genre',
      value: data.dominant_genre.toLocaleLowerCase('en-US'),
      genre: true,
    })
  }
  if (data.genre_count) {
    rows.push({ label: 'unique genres', value: nf.format(data.genre_count) })
  }
  if (data.new_artists) {
    rows.push({ label: 'new artists', value: nf.format(data.new_artists) })
  }
  if (data.listening_age) {
    rows.push({ label: 'your music age', value: nf.format(data.listening_age) })
  }

  return rows
}

export function ManifestoCard({
  data,
  periodLabel,
}: {
  data: ManifestoData
  periodLabel?: string
}) {
  const reduced = useReducedMotion() ?? false
  const eyebrow = periodLabel?.toLocaleUpperCase('en-US')
  const metaRows = useMemo(() => buildMetaRows(data), [data])

  const ease = [0.16, 1, 0.3, 1] as const

  return (
    <div className={styles.frame}>
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.beam} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      <div className={styles.content}>
        <div className={styles.poster}>
          <div className={styles.heroWing}>
            {eyebrow ? (
              <motion.p
                className={styles.eyebrow}
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.45, ease }}
              >
                {eyebrow}
              </motion.p>
            ) : null}

            <div className={styles.heroStack}>
              <div className={styles.heroHalo} aria-hidden />
              <div className={styles.hero}>
                <AnimatedMinutes value={data.minutes} reduced={reduced} />
                <span className={styles.heroUnit}>minutes</span>
              </div>
            </div>

            <p className={styles.statement}>The soundtrack that defined this chapter.</p>
          </div>

          <div className={styles.metaWing}>
            <motion.span
              className={styles.rule}
              aria-hidden
              initial={reduced ? false : { opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              style={{ transformOrigin: 'left center' }}
              transition={reduced ? { duration: 0 } : { duration: 0.5, delay: 0.1, ease }}
            />

            {/* Birincil çift — şarkı + sanatçı. Künyeden belirgin biçimde güçlü. */}
            <motion.div
              className={styles.primaryRow}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.5, delay: 0.14, ease }}
            >
              <span className={styles.primaryItem}>
                <span className={styles.primaryValue}>{nf.format(data.tracks)}</span>
                <span className={styles.primaryLabel}>tracks</span>
              </span>
              <span className={styles.primarySep} aria-hidden />
              <span className={styles.primaryItem}>
                <span className={styles.primaryValue}>{nf.format(data.artists)}</span>
                <span className={styles.primaryLabel}>artists</span>
              </span>
            </motion.div>

            {metaRows.length > 0 ? (
              <div className={styles.meta}>
                {metaRows.map((row, i) => (
                  <motion.div
                    key={row.label}
                    className={styles.metaRow}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.45, delay: 0.2 + i * 0.06, ease }
                    }
                  >
                    <span className={styles.metaLabel}>{row.label}</span>
                    <span className={styles.metaDots} aria-hidden />
                    <span
                      className={`${styles.metaValue} ${row.genre ? styles.metaValueGenre : ''}`}
                    >
                      {row.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
