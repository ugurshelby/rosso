import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import { destekEpostasi } from '@/lib/iletisim'
import { yerelYol, type Dil } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import { SssYapisalVeri } from '@/components/seo/structured-data'
import styles from '@/app/(marketing)/help/help.module.css'

/**
 * Yardım sayfası — `/help` ve `/en/help`.
 *
 * Arayüz adları (Settings, Danger zone, Download my data) Türkçe metinde de
 * İngilizce kalır: uygulama arayüzü İngilizce ve kullanıcı ekranda o
 * kelimeyi arayacak.
 */
export function YardimSayfasi({ dil }: { dil: Dil }) {
  const t = SOZLUK[dil].yardim
  /*
   * ⚠ Sabit adres YAZILMAZ. Burada `destek@rosso.app` duruyordu ve
   * `rosso.app` bize ait değil (bkz. `lib/iletisim.ts`) — kullanıcı
   * yabancı bir şirkete yazıyordu. Adres tanımsızsa e-posta bloğu hiç
   * gösterilmez; cevapsız kalacak bir adres, adres olmamasından kötüdür.
   */
  const supportEmail = destekEpostasi()

  return (
    <main className={`mkt-page ${styles.wrapper}`}>
      <MarketingAtmosphere />
      {/* Sorular aşağıdaki <dl> içinde GERÇEKTEN gösteriliyor — Google'ın
          kuralı bunu şart koşuyor, görünmeyeni işaretlemek ihlaldir. */}
      <SssYapisalVeri sorular={t.sss} />
      <Link href={yerelYol(dil, '/')} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        {t.geri}
      </Link>

      <h1 className={styles.title}>{t.baslik}</h1>
      <p className={styles.lead}>{t.giris}</p>

      <section className={styles.section} aria-labelledby="faq-heading">
        <h2 id="faq-heading" className={styles.heading}>
          {t.sssBaslik}
        </h2>
        <dl className={styles.faqList}>
          {t.sss.map((item) => (
            <div key={item.q} className={styles.faqItem}>
              <dt className={styles.faqQ}>{item.q}</dt>
              <dd className={styles.faqA}>{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="contact-heading">
        <h2 id="contact-heading" className={styles.heading}>
          {t.iletisimBaslik}
        </h2>
        {supportEmail ? (
          <p className={styles.body}>
            {t.iletisimEpostaOnce}
            <a href={`mailto:${supportEmail}`} className={styles.link}>
              {supportEmail}
            </a>
            .
          </p>
        ) : (
          <p className={styles.body}>
            {t.iletisimGirisOnce}
            <Link href="/settings" className={styles.link}>
              {t.iletisimAyarlar}
            </Link>
            {t.iletisimOrta}
            <Link href="/settings/export" className={styles.link}>
              {t.iletisimIndir}
            </Link>
            {t.iletisimSon}
          </p>
        )}
      </section>
    </main>
  )
}
