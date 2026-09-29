import { I18nServerProvider } from '@/lib/i18n/server-provider'

/**
 * Bu rota `(dashboard)` grubu DIŞINDA (tasarım/QA önizleme sayfası, auth
 * gerektirmez) — üst layout'un `I18nServerProvider`'ı buraya ulaşmaz.
 * `listening-stats.tsx` artık `useT()` çağırıyor; sarmalayıcı olmadan
 * derleme zamanında statik export patlıyordu (bkz. 2026-09-28 deploy hatası).
 */
export default function PreviewCatalogLayout({ children }: { children: React.ReactNode }) {
  return <I18nServerProvider namespaces={['catalog']}>{children}</I18nServerProvider>
}
