import { MarketingThemeScope } from '@/components/marketing/marketing-theme-scope'
import { I18nServerProvider } from '@/lib/i18n/server-provider'
import '@/styles/marketing-theme.css'
import '@/styles/marketing-surfaces.css'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <I18nServerProvider namespaces={['common', 'auth']}>
      <MarketingThemeScope />
      {children}
    </I18nServerProvider>
  )
}
