'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { SPRING_REVEAL, SPRING_UI, springFor } from '@/lib/motion/apple-spring'
import { useT } from '@/lib/i18n/provider'
import styles from './playlist-action-overlay.module.css'

export type PlaylistActionState = 'loading' | 'success' | 'error' | null

/**
 * Playlist oluşturma / Spotify'a ekleme sonucu — kısa, tam ekran animasyonlu
 * onay (Sahip, 2026-09-16: "created veya failed olmak üzere iki animasyon
 * tipi ekrana gelmeli"). Başarıda çağıran taraf kısa bir gecikmeyle detay
 * sayfasına yönlendirir; overlay kendi kendine ne zaman kapanacağını bilmez,
 * bu yüzden yönlendirme/timeout mantığı çağıran component'te kalır — bu
 * bileşen yalnız görsel geri bildirimdir.
 *
 * 🔴 2026-09-21: `'loading'` durumu EKLENDİ (Sahip: "spotifya eklenene
 * kadar bir loading animasyonu, sonra eklendi onay animasyonu").
 * Öncesinde yükleme geri bildirimi yalnız butonun içindeki 18px'lik
 * spinner'dı; Spotify yazımı 1–3 sn sürüyor ve o sürede ekranda hiçbir şey
 * olmuyordu. Şimdi aynı kart yükleme → onay arasında MORPH ediyor:
 * kart yeniden mount edilmiyor, yalnız içeriği değişiyor. Kartın kendisi
 * yerinde kaldığı için geçiş "yeni bir şey geldi" değil "aynı şey ilerledi"
 * okunuyor (apple-design §7, uzamsal tutarlılık).
 *
 * Frekans: NADİR (bir mood'u Spotify'a ekleme) → `animate` skill'inin
 * "delight budget" katmanı. Amaç: **completion feedback**.
 */
export function PlaylistActionOverlay({
  state,
  successLabel,
  errorLabel,
  loadingLabel,
}: {
  state: PlaylistActionState
  successLabel: string
  errorLabel: string
  /** Yükleme metni — çağıran özelleştirebilir (yıllık export vs mood). */
  loadingLabel?: string
}) {
  const { t } = useT()
  const resolvedLoadingLabel = loadingLabel ?? t('playlists.actionOverlay.addingToSpotify')
  const reduced = useReducedMotion() ?? false

  const durum = state === 'loading' ? 'loading' : state === 'error' ? 'error' : 'success'
  const kartSinifi =
    state === 'loading'
      ? styles.cardLoading
      : state === 'error'
        ? styles.cardError
        : styles.cardSuccess

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={springFor(reduced, SPRING_UI)}
          role="status"
          aria-live="polite"
        >
          <motion.div
            className={`${styles.card} ${kartSinifi}`}
            /* `layout`: kart yükleme → onay geçişinde etiket uzunluğu
               değiştiği için genişliği SIÇRAMADAN büyür/küçülür. */
            layout
            initial={{ scale: 0.85, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={springFor(reduced, SPRING_REVEAL)}
          >
            {/* İkon katmanı: durum değişince çapraz geçiş (crossfade).
                `mode="popLayout"` yerine basit AnimatePresence — ikon
                kutusu sabit 56px, yer değiştirmesi gerekmiyor. */}
            <div className={styles.iconWrap}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={durum}
                  initial={{ scale: reduced ? 1 : 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: reduced ? 1 : 0.8, opacity: 0 }}
                  transition={springFor(reduced, SPRING_REVEAL)}
                  style={{ display: 'flex' }}
                >
                  {state === 'loading' ? (
                    <span className={styles.spinner} aria-hidden />
                  ) : state === 'error' ? (
                    <X size={30} strokeWidth={2.75} aria-hidden />
                  ) : (
                    <Check size={30} strokeWidth={2.75} aria-hidden />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={durum}
                className={styles.label}
                initial={{ opacity: 0, y: reduced ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -4 }}
                transition={springFor(reduced, SPRING_UI)}
              >
                {state === 'loading'
                  ? resolvedLoadingLabel
                  : state === 'error'
                    ? errorLabel
                    : successLabel}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
