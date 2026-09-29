'use client'

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { yerelYol } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import styles from '@/app/(marketing)/marketing.module.css'
import { useMarketingDil } from './use-marketing-dil'
import { DilDegistirici } from './dil-degistirici'

export function MarketingNav() {
  const { dil } = useMarketingDil()
  const t = SOZLUK[dil].kabuk

  return (
    <nav className={styles.nav} aria-label={t.menuEtiketi}>
      <Link href={yerelYol(dil, '/')} className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>
          <Image
            src="/brand/rosso-mark.png"
            alt=""
            width={20}
            height={20}
            className={styles.brandImage}
            priority
          />
        </span>
        ROSSO
      </Link>
      <div className={styles.navLinks}>
        <Link href={yerelYol(dil, '/help')} className={cn(styles.navLink, styles.navLinkHideMobile)}>
          {t.yardim}
        </Link>
        <Link
          href={yerelYol(dil, '/privacy')}
          className={cn(styles.navLink, styles.navLinkHideMobile)}
        >
          {t.gizlilik}
        </Link>
        <DilDegistirici className={styles.navLink} />
        <Link href="/login" prefetch={false} className={styles.navCta}>
          {t.girisYap}
        </Link>
      </div>
    </nav>
  )
}
