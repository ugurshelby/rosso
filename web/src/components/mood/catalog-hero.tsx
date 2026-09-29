import { getT } from '@/lib/i18n/server'
import styles from './mood.module.css'

/**
 * Katalog sayfası hero'su — 2026-09-18 yeniden kurgu. `MoodHero`'dan farklı:
 * bu bir LİSTE sayfası hero'su (tekil playlist hero'su değil), sayfanın
 * anlamını net veriyor: "Rosso'nun kişiye özel müzik küratörlüğü".
 *
 * Arka plan kolajı statik `.webp`'lerin CSS `background-image` katmanlaması
 * — runtime sunucu işi gerektirmez (mevcut vibe-card görsel dilinden 3 tanesi).
 */
export async function CatalogHero() {
  const { t } = await getT()
  return (
    <header className={styles.catalogHero}>
      <div className={styles.catalogHeroBackdrop} aria-hidden />
      <div className={styles.catalogHeroContent}>
        <p className={styles.eyebrow}>{t('mood.catalogHero.eyebrow').toUpperCase()}</p>
        <h1 className={styles.catalogTitle}>{t('mood.catalogHero.title')}</h1>
        <p className={styles.catalogSubtitle}>
          {t('mood.catalogHero.subtitle')}
        </p>
      </div>
    </header>
  )
}
