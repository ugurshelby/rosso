'use client'

import Link from 'next/link'
import { yerelYol } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import styles from '@/app/(marketing)/marketing.module.css'
import { useMarketingDil } from './use-marketing-dil'
import { DilDegistirici } from './dil-degistirici'

/*
 * Blog ve Planlar bağlantıları 2026-09-22'de eklendi: iki sayfaya da hiçbir
 * menüden link yoktu (yalnız 404 sayfasından). İç bağlantısı olmayan sayfayı
 * hem ziyaretçi hem arama motoru zor bulur.
 */
export function MarketingFooter() {
  const { dil } = useMarketingDil()
  const t = SOZLUK[dil].kabuk

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span className={styles.footerNote}>{t.footerNotu}</span>
        <nav className={styles.footerLinks} aria-label={t.footerMenuEtiketi}>
          <Link href={yerelYol(dil, '/modules')} className={styles.footerLink}>
            {t.moduller}
          </Link>
          <Link href={yerelYol(dil, '/blog')} className={styles.footerLink}>
            {t.blog}
          </Link>
          <Link href={yerelYol(dil, '/pricing')} className={styles.footerLink}>
            {t.planlar}
          </Link>
          <Link href={yerelYol(dil, '/help')} className={styles.footerLink}>
            {t.yardim}
          </Link>
          <Link href={yerelYol(dil, '/privacy')} className={styles.footerLink}>
            {t.gizlilik}
          </Link>
          <DilDegistirici className={styles.footerLink} />
          <Link href="/login" prefetch={false} className={styles.footerLink}>
            {t.girisYap}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
