'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Unlock, Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { animasyonGorulduIsaretle } from '@/lib/quick-start/actions'
import type { AcanAdim, KilitOzelligi, ZipTuru } from '@/lib/quick-start/kilit-katalogu'
import { useT } from '@/lib/i18n/provider'
import styles from './locked-shell.module.css'

interface LockedShellProps {
  /** Kilidin bağlı olduğu katalog özelliği (örn. 'recap', 'playlists', 'journey') */
  featureKey: KilitOzelligi
  /** Bölüm şu an kilitli mi? */
  isLocked: boolean
  /** Kilit açılmış ancak kullanıcının kutlama animasyonunu henüz görmediği durum */
  animationPending?: boolean
  /** Kilidi açan adım */
  actionAdim?: AcanAdim
  /** Eksik ZIP listesi */
  missingZips?: readonly ZipTuru[]
  /** Özel başlık */
  title?: string
  /** Özel açıklama */
  description?: string
  /** Özel CSS sınıfı */
  className?: string
  /** Mühür arkasında yer tutacak gerçek / demo iskelet bileşeni */
  children: ReactNode
  /** Demo persona önizlemesi mi? */
  demo?: boolean
}

const DEFAULT_DESCRIPTIONS: Record<string, { title: string; desc: string; cta: string; href: string }> = {
  spotify: {
    title: 'Connect Spotify to Unlock',
    desc: 'Connect your Spotify account to activate your listening stream, playlists, and real-time dashboard data.',
    cta: 'Connect Spotify',
    href: '/data',
  },
  streaming: {
    title: 'Streaming History Required',
    desc: 'Upload your Spotify Streaming History file to uncover your listening journey, taste graphs, and recaps.',
    cta: 'Upload History',
    href: '/data',
  },
  phase4: {
    title: 'Full Export Required',
    desc: 'Upload your Account Data and Technical Log ZIP files to unlock deep lifetime analytics and liked song timelines.',
    cta: 'Upload Data Files',
    href: '/data',
  },
}

export function LockedShell({
  featureKey,
  isLocked,
  animationPending = false,
  actionAdim,
  missingZips = [],
  title,
  description,
  className,
  children,
  demo = false,
}: LockedShellProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [unlockedAnimationDone, setUnlockedAnimationDone] = useState(false)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const { t } = useT()
  // Kıvılcım mesafeleri bir kez üretilir; render sırasında Math.random çağrılmaz (saflık kuralı).
  const [sparkleDistances] = useState(() => Array.from({ length: 12 }, () => 70 + Math.random() * 50))

  // Bölüm kilitli mi veya henüz kutlama animasyonu bitmedi mi?
  const shouldShowOverlay = isLocked || (animationPending && !unlockedAnimationDone)

  const handleCelebrate = () => {
    if (!animationPending || isCelebrating) return

    setIsCelebrating(true)

    // apple-design yay ve kutlama zamanlaması (~600ms)
    setTimeout(() => {
      setUnlockedAnimationDone(true)
      setIsCelebrating(false)

      // Animasyon bittiğinde sunucuya görüldü kaydı gönder
      startTransition(async () => {
        try {
          await animasyonGorulduIsaretle([`kilit:${featureKey}`])
          router.refresh()
        } catch (e) {
          console.error('[LockedShell] Animasyon kaydı hatası:', e)
        }
      })
    }, 650)
  }

  // Varsayılan metinleri türet
  let defaultInfo = DEFAULT_DESCRIPTIONS.streaming
  if (actionAdim === 'spotify') {
    defaultInfo = DEFAULT_DESCRIPTIONS.spotify
  } else if (missingZips.includes('account') || missingZips.includes('technical')) {
    defaultInfo = DEFAULT_DESCRIPTIONS.phase4
  }

  const finalTitle = title || defaultInfo.title
  const finalDesc = description || defaultInfo.desc
  const ctaText = defaultInfo.cta
  const ctaHref = defaultInfo.href

  return (
    <div className={cn(styles.container, className)}>
      <div
        className={cn(
          styles.contentWrapper,
          shouldShowOverlay ? styles.contentBlurred : styles.contentClear,
        )}
        aria-hidden={shouldShowOverlay}
      >
        {children}
      </div>

      {shouldShowOverlay && (
        <div
          className={cn(
            styles.overlay,
            isCelebrating && styles.overlayDissolving,
          )}
          role="region"
          aria-label={`${finalTitle} — Kilitli Bölüm`}
        >
          {isCelebrating && (
            <div className={styles.celebrateBurst} aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2
                const dist = sparkleDistances[i] ?? 95
                const tx = `${Math.cos(angle) * dist}px`
                const ty = `${Math.sin(angle) * dist}px`
                return (
                  <span
                    key={i}
                    className={styles.sparkle}
                    style={{ '--tx': tx, '--ty': ty } as React.CSSProperties}
                  />
                )
              })}
            </div>
          )}

          <div className={styles.sealBadge}>
            <div
              className={cn(
                styles.iconCircle,
                animationPending && styles.iconVibrating,
              )}
              onClick={animationPending ? handleCelebrate : undefined}
              role={animationPending ? 'button' : undefined}
              tabIndex={animationPending ? 0 : undefined}
              title={animationPending ? 'Kilidi açmak için tıkla' : 'Kilitli'}
            >
              {animationPending ? (
                <Unlock size={22} aria-hidden />
              ) : (
                <Lock size={22} aria-hidden />
              )}
            </div>

            {demo && (
              <div className={styles.demoBadge}>
                <Sparkles size={11} aria-hidden="true" />
                <span>{t('lock.samplePreview')}</span>
                <span className="sr-only"> — {t('lock.samplePreviewAria')}</span>
              </div>
            )}

            <p className={styles.eyebrow}>
              {animationPending ? 'Ready to Unlock' : 'Locked Feature'}
            </p>

            <h3 className={styles.title}>{finalTitle}</h3>
            <p className={styles.description}>{finalDesc}</p>

            {animationPending ? (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleCelebrate}
              >
                <Sparkles size={16} aria-hidden />
                <span>Unlock Now</span>
              </button>
            ) : (
              <Link href={ctaHref} className={styles.actionBtn}>
                <span>{ctaText}</span>
                <ArrowRight size={15} aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
