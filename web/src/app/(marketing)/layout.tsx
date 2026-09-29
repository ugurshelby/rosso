import { MarketingNav } from '@/components/marketing/marketing-nav'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { CookiesBanner } from '@/components/marketing/cookies-banner'
import { MarketingThemeScope } from '@/components/marketing/marketing-theme-scope'
import { MarketingDilKapsami } from '@/components/marketing/marketing-dil-kapsami'
import '@/styles/marketing-theme.css'
import '@/styles/marketing-surfaces.css'
import styles from './marketing.module.css'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MarketingDilKapsami className={`${styles.page} marketing-theme`}>
      <MarketingThemeScope />
      <div className={styles.navFade} aria-hidden />
      <MarketingNav />
      {children}
      <MarketingFooter />
      <CookiesBanner />
    </MarketingDilKapsami>
  )
}
