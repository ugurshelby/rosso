'use client'

import React from 'react'
import Link from 'next/link'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import { useT } from '@/lib/i18n/provider'
import styles from './locked-preview.module.css'

export interface LockedPreviewProps {
  /** Kartın/sayfanın gerçek tasarımını temsil eden içerik — arka planda blurlu duracak. */
  children: React.ReactNode
  /** Başlık (Barlow Semi Condensed) */
  title?: string
  /** Şiirsel açıklama metni */
  description?: string
  /** Geriye dönük uyumluluk etiketi */
  label?: string
  /** Üst rozet metni (Geist Mono, örn: "Katman 2 · Dinleme Geçmişi ZIP'i Gerekir") */
  badgeLabel?: string
  /** CTA butonu metni */
  ctaText?: string
  /** Yönlendirme linki (varsayılan: /data) */
  href?: string
  /** Kilit durumu — false ise blur ve overlay olmadan doğrudan children render edilir */
  isLocked?: boolean
  /** Görünüm çeşidi: 'card' (standart bento kartı), 'fullscreen' (tam sayfa vitrini), 'inline' (kompakt) */
  variant?: 'card' | 'fullscreen' | 'inline'
  className?: string
  /** Demo persona önizlemesi mi? */
  demo?: boolean
}

/**
 * Rosso Büyüyen Kimlik — Kilitli/Blur Önizleme (Locked Preview).
 *
 * Rosso'da arayüz asla "veri yok" diyerek boş veya sığ bırakılmaz. Arayüz
 * daima Katman 3 vitriniyle yaşar. Veri henüz gelmemişse arka planda zengin
 * ve cezbedici bir şablon Liquid Glass + Backdrop Blur ile durur; merkezde
 * şiirsel anlatımlı bir kilit rozeti ve doğrudan yükleme alanına yönlendiren
 * CTA yer alır.
 */
export function LockedPreview({
  children,
  title,
  description,
  label,
  badgeLabel = 'Katman 2 · Dinleme Geçmişi ZIP’i Gerekir',
  ctaText = 'Geçmişini Yükle',
  href = '/data',
  isLocked = true,
  variant = 'card',
  className,
  demo = false,
}: LockedPreviewProps) {
  const { t } = useT()

  if (!isLocked) {
    return <>{children}</>
  }

  const resolvedDesc = description ?? label ?? 'Rosso’nun senin hikâyeni tam hatırlayabilmesi için bu veriye ihtiyacı var.'

  return (
    <div
      className={[
        styles.container,
        variant === 'fullscreen' ? styles.variantFullscreen : '',
        variant === 'inline' ? styles.variantInline : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Arka plan — zengin görsel şablon blur arkasında */}
      <div className={styles.backdrop} aria-hidden="true">
        {children}
      </div>

      {/* Ön katman — Liquid Glass kilit paneli */}
      <div className={styles.overlay}>
        <div className={styles.glassCard}>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>
              <Sparkles size={11} className={styles.badgeIcon} aria-hidden="true" />
              <span>{badgeLabel}</span>
            </span>
            {demo && (
              <span className={styles.demoBadge}>
                <span>{t('lock.samplePreview')}</span>
                <span className="sr-only"> — {t('lock.samplePreviewAria')}</span>
              </span>
            )}
          </div>

          <div className={styles.lockIconWrap}>
            <span className={styles.lockPulse} aria-hidden="true" />
            <div className={styles.lockCircle}>
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
            </div>
          </div>

          {title && <h3 className={styles.title}>{title}</h3>}
          <p className={styles.description}>{resolvedDesc}</p>

          <Link href={href} className={styles.ctaButton}>
            <span>{ctaText}</span>
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
