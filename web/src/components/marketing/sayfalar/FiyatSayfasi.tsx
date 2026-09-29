import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import { yerelYol, type Dil } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import styles from '@/app/(marketing)/pricing/pricing.module.css'

/**
 * Planlar sayfası — `/pricing` ve `/en/pricing`.
 *
 * ⚠ 2026-09-22: Tek plan. Eski sayfada "Pro" katmanı üç platform bağlama,
 * sınırsız playlist taşıma ve bir karşılaştırma tablosu (1 platform / 3
 * platform) vaat ediyordu; Rosso saf Spotify platformu (CLAUDE.md §4) ve
 * taşıma özelliği yok. "Aylık otomatik Top 50 listesi" de kodda yoktu.
 * Listede yalnız GERÇEKTEN çalışan özellikler durur (Sahip onayı).
 */
export function FiyatSayfasi({ dil }: { dil: Dil }) {
  const t = SOZLUK[dil].fiyat
  // Gizlilik metni 2026-09-22'den beri iki dilli — bağlantı da dile uymalı.
  const gizlilik = yerelYol(dil, '/privacy')

  return (
    <main className={`mkt-page ${styles.wrapper}`}>
      <MarketingAtmosphere />

      <header className={styles.hero}>
        <div className="mkt-eyebrow">{t.ustYazi}</div>
        <h1 className={styles.title}>{t.baslik}</h1>
        <p className={styles.lead}>{t.giris}</p>
      </header>

      <div className={`${styles.planGrid} ${styles.planGridSingle}`}>
        <div className={`${styles.planCard} ${styles.planCardFeatured}`}>
          <div className={styles.planHead}>
            <h2 className={styles.planName}>{t.plan.ad}</h2>
            <span className={styles.planState}>{t.plan.durum}</span>
          </div>
          <p className={styles.planDesc}>{t.plan.aciklama}</p>

          <div className={styles.planPrice}>
            <span className={styles.planPriceAmount}>{t.plan.fiyat}</span>
            <span className={styles.planPriceUnit}>{t.plan.birim}</span>
          </div>

          <ul className={styles.planFeatures}>
            {t.plan.ozellikler.map((ozellik) => (
              <li key={ozellik} className={styles.planFeature}>
                <Check size={14} className={styles.planFeatureIcon} aria-hidden />
                <span>{ozellik}</span>
              </li>
            ))}
          </ul>

          <Link href="/register" className={`mkt-btn-primary ${styles.planCta}`}>
            {t.plan.cta}
          </Link>
        </div>
      </div>

      <section className={`mkt-cta-band ${styles.ctaBand}`} aria-label={t.kapanisEtiketi}>
        <div className="mkt-cta-band__glow" aria-hidden />
        <div className="mkt-cta-band__vignette" aria-hidden />
        <div className="mkt-cta-band__inner">
          <p className="mkt-cta-band__epilogue" aria-hidden>
            {t.kapanisUstYazi}
          </p>
          <h2 className="mkt-cta-band__title">{t.kapanisBaslik}</h2>
          <p className="mkt-cta-band__sub">{t.kapanisAlt}</p>
          <Link href="/register" className="mkt-btn-primary">
            {t.kapanisCta}
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>

      <p className={styles.note}>
        {t.notOnce}
        <Link href={gizlilik} className={styles.noteLink}>
          {t.notLink}
        </Link>
        {t.notSonra}
      </p>
    </main>
  )
}
