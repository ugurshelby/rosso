import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import '@/styles/marketing-surfaces.css'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import { DEFAULT_AUTH_HERO_COVER } from '@/lib/marketing/auth-preview'
import { getT } from '@/lib/i18n/server'
import styles from './auth.module.css'

/**
 * Rosso Auth Shell — Apple HIG & Minimalist Redesign
 *
 * - Sol vitrin (lg+): Tekil odaklanmış cam vitrin sahnesi, nefes alan tipografi.
 * - Sağ panel: Tam odaklanmış form akışı.
 * - Mobil (<lg): Vitrin dikey yığılması kaldırıldı — doğrudan kompakt marka başlığı
 *   ve arkada hafif atmosferik derinlik, forma anında erişim.
 */
interface AuthShellProps {
  eyebrow: string
  title: ReactNode
  feature: string
  footer?: string
  coverSrc?: string
  children: ReactNode
}

export async function AuthShell({
  eyebrow,
  title,
  feature,
  footer,
  coverSrc = DEFAULT_AUTH_HERO_COVER,
  children,
}: AuthShellProps) {
  const { t } = await getT()
  const resolvedFooter = footer ?? t('auth.login.showcase.footer')

  return (
    <div className={`${styles.wrapper} marketing-theme`}>
      <MarketingAtmosphere />

      {/* Sol vitrin paneli (lg+) — Ultra-minimalist, sakin ve lüks */}
      <aside className={styles.leftPanel} aria-label={t('auth.shell.showcaseAria')}>
        <div className={styles.leftPanelAtmosphere} aria-hidden />
        <div className={styles.leftPanelSpot} aria-hidden />

        <div className={styles.leftPanelStage}>
          <header className={styles.showcaseHeader}>
            <div className={styles.brandBadge}>
              <span className={styles.brandBadgeMark} aria-hidden>
                <Image
                  src="/brand/rosso-mark.png"
                  alt=""
                  width={20}
                  height={20}
                  className={styles.brandBadgeImage}
                  priority
                />
              </span>
              <span className={styles.showcaseEyebrow}>{eyebrow}</span>
            </div>

            <h2 className={styles.showcaseTitle}>{title}</h2>
            <p className={styles.showcaseLead}>{feature}</p>
          </header>

          {/* Odaklanmış tekil kahraman cam vitrin kartı */}
          <div className={styles.heroArtifactCard} aria-hidden>
            <div className={styles.heroArtifactFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverSrc}
                alt=""
                className={styles.heroArtifactImg}
                decoding="async"
                loading="eager"
                draggable={false}
              />
              <div className={styles.heroArtifactSheen} />
            </div>

            <div className={styles.heroLiveBadge}>
              <span className={styles.heroLivePulse} />
              <span className={styles.heroLiveText}>{t('auth.shell.heroBadge')}</span>
            </div>
          </div>

          <footer className={styles.showcaseFooter}>
            <span className={styles.footerAccentLine} aria-hidden />
            <span className={styles.footerText}>{resolvedFooter}</span>
          </footer>
        </div>
      </aside>

      {/* 🔴 `<main>` — `<div>` DEĞİL (Lighthouse landmark-one-main kuralı).
          Mobilde büyük bento/mockup şeridi YOKTUR. Yalnızca kompakt marka başlığı
          ve hemen ardından doğrudan odaklanılan form gelir. */}
      <main className={styles.rightPanel}>
        <div className={styles.mobileBrandHeader}>
          <Link href="/" className={styles.mobileBrandLink} aria-label={t('auth.shell.homeAria')}>
            <span className={styles.mobileBrandMark} aria-hidden>
              <Image
                src="/brand/rosso-mark.png"
                alt=""
                width={22}
                height={22}
                className={styles.brandBadgeImage}
                priority
              />
            </span>
            <span className={styles.mobileBrandWordmark}>ROSSO</span>
          </Link>
        </div>

        {children}
      </main>
    </div>
  )
}
