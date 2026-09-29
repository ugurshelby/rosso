'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { SPRING_UI } from '@/lib/motion/apple-spring'
import { useEffect, type ReactNode } from 'react'
import styles from './recap-stage.module.css'

/**
 * RecapStage — story-deck'in TEK sahne kontratı (FAZ R0/R0.1/R1.1, 2026-07-20).
 *
 * recap-journey-design.md §1: story-deck üç ayrı turda "tam viewport, scroll
 * yok" kuralını bozdu çünkü yükseklik yönetimi her kartın kendi CSS'ine
 * dağılmıştı. Bu bileşen tek doğruluk kaynağıdır: kartlar yalnız İÇERİK
 * verir, kendi height/overflow kararı ALMAZ.
 *
 * 🔴 Arıza turlarının özeti:
 *   1-3 → sahnenin İÇİNDE arandı (aspect-ratio, yükseklik zinciri, html overflow)
 *   4   → sahne `fixed` yapıldı ama `left: 220px` SABİTİ vardı; sidebar dar
 *         pencerede daralınca/gizlenince sahne yanlış yerden başlıyor, sağda
 *         ve altta boşluk kalıyordu
 *   5   → Sahibin talimatı: sidebar bu katmanda TAMAMEN gizlenir, sahne tüm
 *         viewport'u kaplar. Ofset yok → hizalama hatası da yok.
 *
 * Kontrat: .stage (fixed, tüm viewport) → .motionLayer (height:100% ALIR —
 * geçmişte bir motion.div yükseklik almayıp zinciri kırmıştı) → .cardShell
 * → children (kart, height'ını miras alır, override etmez).
 */
export function RecapStage({
  cardKey,
  children,
  touchHandlers,
}: {
  /** Kart değiştiğinde AnimatePresence'ın yeni kartı algılaması için. */
  cardKey: string
  children: ReactNode
  /** Dokunmatik swipe — useStoryDeck'ten gelir, sahne köküne bağlanır. */
  touchHandlers?: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
}) {
  const reduced = useReducedMotion()

  // Sahne açıkken kabuk navigasyonu gizlenir + gövde kaydırması kilitlenir.
  // Sınıf <body>'de yaşar çünkü sidebar/bottom-nav bu bileşenin DOM ağacının
  // dışında (kardeş seçici erişemez). Ayrılırken mutlaka temizlenir — kalırsa
  // kullanıcı başka sayfada menüsüz kalır.
  useEffect(() => {
    document.body.classList.add('recap-stage-open')
    return () => document.body.classList.remove('recap-stage-open')
  }, [])

  return (
    <div
      className={styles.stage}
      onTouchStart={touchHandlers?.onTouchStart}
      onTouchEnd={touchHandlers?.onTouchEnd}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={cardKey}
          className={styles.motionLayer}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : SPRING_UI
          }
        >
          <div className={styles.cardShell}>{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
