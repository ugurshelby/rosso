import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import { yerelYol, type Dil } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import { yazilar, readingMinutes, formatPostDate } from '@/app/(marketing)/blog/posts'
import styles from '@/app/(marketing)/blog/blog.module.css'

/** Blog listesi — `/blog` ve `/en/blog`. */
export function BlogListesi({ dil }: { dil: Dil }) {
  const t = SOZLUK[dil].blog
  const sirali = yazilar(dil)
  const [featured, ...rest] = sirali
  const yaziYolu = (slug: string) => yerelYol(dil, `/blog/${slug}`)

  return (
    <main className={`mkt-page ${styles.wrapper}`}>
      <MarketingAtmosphere />
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className="mkt-eyebrow">{t.ustYazi}</span>
          <h1 className={styles.title}>{t.baslik}</h1>
          <p className={styles.lead}>{t.giris}</p>
        </div>
        <div className={styles.heroMeta} aria-hidden="true">
          <span className={styles.heroCount}>{String(sirali.length).padStart(2, '0')}</span>
          <span className={styles.heroCountLabel}>{t.yaziSayisiEtiketi}</span>
        </div>
      </header>

      {featured && (
        <section className={styles.featuredSection} aria-label={t.oneCikanEtiketi}>
          <Link href={yaziYolu(featured.slug)} className={styles.featured}>
            <div className={styles.featuredMeta}>
              <span className={styles.topicTag}>{featured.topic}</span>
              <span className={styles.metaDot} aria-hidden="true" />
              <span className={styles.metaText}>{formatPostDate(featured.date, 'short', dil)}</span>
              <span className={styles.metaDot} aria-hidden="true" />
              <span className={styles.metaText}>
                {readingMinutes(featured)} {t.dkOkuma}
              </span>
            </div>
            <h2 className={styles.featuredTitle}>{featured.title}</h2>
            <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
            <span className={styles.featuredCue}>
              {t.yaziyiOku}
              <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
        </section>
      )}

      {rest.length > 0 && (
        <section className={styles.list} aria-label={t.tumYazilarEtiketi}>
          <div className={styles.listHeader}>
            <span className={styles.listHeaderLabel}>{t.arsiv}</span>
            <span className={styles.listHeaderRule} aria-hidden="true" />
          </div>
          <ul className={styles.entries}>
            {rest.map((post, i) => (
              <li key={post.slug}>
                <Link href={yaziYolu(post.slug)} className={styles.entry}>
                  <span className={styles.entryIndex} aria-hidden="true">
                    {String(rest.length - i).padStart(2, '0')}
                  </span>
                  <div className={styles.entryBody}>
                    <div className={styles.entryMeta}>
                      <span className={styles.topicTag}>{post.topic}</span>
                      <span className={styles.metaDot} aria-hidden="true" />
                      <span className={styles.metaText}>{formatPostDate(post.date, 'short', dil)}</span>
                      <span className={styles.metaDot} aria-hidden="true" />
                      <span className={styles.metaText}>
                        {readingMinutes(post)} {t.dk}
                      </span>
                    </div>
                    <h3 className={styles.entryTitle}>{post.title}</h3>
                    <p className={styles.entryExcerpt}>{post.excerpt}</p>
                  </div>
                  <ArrowUpRight size={18} className={styles.entryArrow} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`mkt-cta-band ${styles.ctaBand}`} aria-label={t.kapanisEtiketi}>
        <div className="mkt-cta-band__glow" aria-hidden />
        <div className="mkt-cta-band__vignette" aria-hidden />
        <div className={`mkt-cta-band__inner ${styles.ctaBandInner}`}>
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
    </main>
  )
}
