import Link from 'next/link'
import { Upload } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { requireAuth } from '@/lib/auth'
import { DataExportButton } from '@/components/settings/data-export-button'
import { getT } from '@/lib/i18n/server'
import styles from './export.module.css'

/**
 * KVKK / GDPR veri taşınabilirliği — "verilerimi talep et".
 *
 * 🔄 2026-08-15: Bu sayfa eskiden **ZIP YÜKLEME** ekranıydı (`SpotifyExport`),
 * yani adının tam tersini yapıyordu: URL `/export`, başlık "Veri İçe Aktarma".
 * Üstelik aynı yükleme alanı `/data` sayfasında birebir tekrar ediyordu.
 * Kullanıcı "verilerimi indireceğim" diye gelip yükleme ekranı buluyordu
 * (2026-08-14 kullanıcı testi, Ş-34).
 *
 * Sahibin kararı: *"/settings/export 'verilerimi talep et' olmalı; zip
 * yükleme sadece veri & bağlantılar kısmında olmalı."*
 *   → içe aktarma TEK yerde: `/data`
 *   → dışa aktarma TEK yerde: burası
 */
export default async function ExportPage() {
  await requireAuth()
  const { t } = await getT()

  return (
    <>
      <PageHeader
        title={t('settings.exportPage.title')}
        subtitle={t('settings.exportPage.subtitle')}
      />

      <section className={styles.card}>
        <p className={styles.lede}>
          {t('settings.exportPage.lede')}
        </p>

        <DataExportButton
          className={styles.action}
          iconClassName={styles.actionIcon}
          labelClassName={styles.actionLabel}
        />

        <p className={styles.note}>
          {t('settings.exportPage.note')}
        </p>
      </section>

      {/* Karışıklığın kaynağı buydu: kullanıcı ZIP yüklemeyi burada arıyordu.
          Artık yönü açıkça gösteriyoruz. */}
      <section className={styles.card}>
        <h2 className={styles.subTitle}>{t('settings.exportPage.uploadPrompt.title')}</h2>
        <p className={styles.lede}>
          {t('settings.exportPage.uploadPrompt.lede')}
        </p>
        <Link href="/data" className={styles.action}>
          <Upload size={16} className={styles.actionIcon} aria-hidden />
          <span className={styles.actionLabel}>{t('settings.exportPage.uploadPrompt.cta')}</span>
        </Link>
      </section>
    </>
  )
}
