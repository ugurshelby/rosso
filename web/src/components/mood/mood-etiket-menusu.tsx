'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Ban, Check, Heart, Tag, ThumbsDown, X } from 'lucide-react'
import {
  MOOD_ETIKET_BILGISI,
  moodEtiketBilgisi,
  type MoodEtiketi,
} from '@/lib/analytics/mood-etiket'
import { SPRING_UI } from '@/lib/motion/apple-spring'
import { useT } from '@/lib/i18n/provider'
import styles from './mood.module.css'

const IKON: Record<MoodEtiketi, typeof Tag> = {
  alakasiz: Ban,
  alakali_sevmedim: ThumbsDown,
  uygun: Check,
  cok_sevdim: Heart,
}

/** Etiketin görsel tonu — `mood.module.css` → `.etiketAlakasiz` vb. */
const TON: Record<MoodEtiketi, string> = {
  alakasiz: styles.etiketAlakasiz,
  alakali_sevmedim: styles.etiketSevmedim,
  uygun: styles.etiketUygun,
  cok_sevdim: styles.etiketCokSevdim,
}

interface MoodEtiketMenusuProps {
  parcaAdi: string
  etiket: MoodEtiketi | null
  onSec: (etiket: MoodEtiketi | null) => void
  disabled?: boolean
}

/**
 * Tek parçanın uygunluk etiketi — düğme + küçük menü (migration 0338).
 *
 * Hız (Sahip: "işleri daha da hızlandırmak"): menü açıkken 1–4 tuşları
 * doğrudan seçer, 0 etiketi kaldırır, Esc kapatır. Yüzlerce parça
 * etiketlenecek; her etiket en fazla bir tık + bir tuş.
 *
 * Menü satır içinde mutlak konumlu: `TrackTable` paylaşılan bileşen, ona
 * dokunulmadan satır hizasındaki eylem sütununda açılır.
 */
export function MoodEtiketMenusu({ parcaAdi, etiket, onSec, disabled }: MoodEtiketMenusuProps) {
  const { t } = useT()
  const [acik, setAcik] = useState(false)
  const kapRef = useRef<HTMLDivElement>(null)
  const azHareket = useReducedMotion()

  useEffect(() => {
    if (!acik) return
    const disariTik = (e: PointerEvent) => {
      if (!kapRef.current?.contains(e.target as Node)) setAcik(false)
    }
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAcik(false)
        return
      }
      if (e.key === '0' && etiket) {
        e.preventDefault()
        onSec(null)
        setAcik(false)
        return
      }
      const sira = Number(e.key)
      if (sira >= 1 && sira <= MOOD_ETIKET_BILGISI.length) {
        e.preventDefault()
        onSec(MOOD_ETIKET_BILGISI[sira - 1].etiket)
        setAcik(false)
      }
    }
    document.addEventListener('pointerdown', disariTik)
    document.addEventListener('keydown', tus)
    return () => {
      document.removeEventListener('pointerdown', disariTik)
      document.removeEventListener('keydown', tus)
    }
  }, [acik, etiket, onSec])

  const Ikon = etiket ? IKON[etiket] : Tag
  const mevcutAd = etiket ? moodEtiketBilgisi(etiket).ad : t('mood.tagMenu.tagButtonFallback')

  return (
    <div ref={kapRef} className={styles.etiketKap}>
      <button
        type="button"
        className={`${styles.etiketBtn} ${etiket ? TON[etiket] : ''}`}
        onClick={() => setAcik((a) => !a)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={t('mood.tagMenu.ariaLabel', { title: parcaAdi, tag: mevcutAd })}
        title={mevcutAd}
      >
        <Ikon size={15} aria-hidden fill={etiket === 'cok_sevdim' ? 'currentColor' : 'none'} />
      </button>

      <AnimatePresence>
        {acik && (
          <motion.div
            role="menu"
            aria-label={t('mood.tagMenu.menuAriaLabel', { title: parcaAdi })}
            className={styles.etiketMenu}
            initial={azHareket ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={azHareket ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -2, transition: { duration: 0.12 } }}
            transition={azHareket ? { duration: 0.1 } : SPRING_UI}
          >
            {MOOD_ETIKET_BILGISI.map((b, i) => {
              const SecenekIkon = IKON[b.etiket]
              const secili = b.etiket === etiket
              return (
                <button
                  key={b.etiket}
                  type="button"
                  role="menuitemradio"
                  aria-checked={secili}
                  className={`${styles.etiketSecenek} ${TON[b.etiket]} ${secili ? styles.etiketSecenekSecili : ''}`}
                  onClick={() => {
                    onSec(b.etiket)
                    setAcik(false)
                  }}
                >
                  <SecenekIkon
                    size={14}
                    aria-hidden
                    fill={b.etiket === 'cok_sevdim' ? 'currentColor' : 'none'}
                  />
                  <span className={styles.etiketSecenekMetin}>
                    <span className={styles.etiketSecenekAd}>{b.ad}</span>
                    <span className={styles.etiketSecenekAciklama}>{b.aciklama}</span>
                  </span>
                  <kbd className={styles.etiketKisayol} aria-hidden>
                    {i + 1}
                  </kbd>
                </button>
              )
            })}
            {etiket && (
              <button
                type="button"
                role="menuitem"
                className={`${styles.etiketSecenek} ${styles.etiketKaldir}`}
                onClick={() => {
                  onSec(null)
                  setAcik(false)
                }}
              >
                <X size={14} aria-hidden />
                <span className={styles.etiketSecenekMetin}>
                  <span className={styles.etiketSecenekAd}>{t('mood.tagMenu.removeTag')}</span>
                </span>
                <kbd className={styles.etiketKisayol} aria-hidden>
                  0
                </kbd>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
