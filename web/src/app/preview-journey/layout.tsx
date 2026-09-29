import { I18nServerProvider } from '@/lib/i18n/server-provider'

/**
 * Bu rota `(dashboard)` grubu DIŞINDA (tasarım/QA önizleme sayfası, auth
 * gerektirmez) — üst layout'un `I18nServerProvider`'ı buraya ulaşmaz.
 * `journey-view.tsx` ve altındaki bileşenler artık `useT()` çağırıyor;
 * sarmalayıcı olmadan derleme zamanında statik export patlıyordu
 * (bkz. 2026-09-28 deploy hatası — `preview-catalog` ile aynı desen).
 */
export default function PreviewJourneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nServerProvider namespaces={['common', 'nav', 'journey']}>
      {children}
    </I18nServerProvider>
  )
}
