import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import { yerelYol, type Dil } from '@/lib/marketing/dil'
import { MODUL_ICERIGI, modulYolu } from '@/lib/marketing/moduller'
import { marketingMetadata } from '@/lib/marketing/metadata'
import { SOZLUK } from '@/lib/marketing/sozluk'
import { yazilar, getPost, readingMinutes, formatPostDate } from '@/app/(marketing)/blog/posts'
import { YaziYapisalVeri, KirintiYolu } from '@/components/seo/structured-data'
import styles from '@/app/(marketing)/blog/blog.module.css'

/** Yazı sayfası metadata'sı — iki dilin rota dosyası da bunu çağırır. */
export function blogYazisiMetadata(dil: Dil, slug: string): Metadata {
  const post = getPost(slug, dil)
  if (!post) return { title: SOZLUK[dil].blog.bulunamadi }
  return marketingMetadata({
    dil,
    yol: `/blog/${slug}`,
    baslik: post.title,
    aciklama: post.excerpt,
  })
}

/** Yazı sayfası — `/blog/[slug]` ve `/en/blog/[slug]`. */
export function BlogYazisi({ dil, slug }: { dil: Dil; slug: string }) {
  const t = SOZLUK[dil].blog
  const post = getPost(slug, dil)
  if (!post) notFound()

  const sirali = yazilar(dil)
  const yaziYolu = (s: string) => yerelYol(dil, `/blog/${s}`)
  const readTime = readingMinutes(post)
  const index = sirali.findIndex((p) => p.slug === slug)
  const newer = index > 0 ? sirali[index - 1] : null
  const older = index < sirali.length - 1 ? sirali[index + 1] : null

  const [lede, ...paragraphs] = post.body

  return (
    <main className={`mkt-page ${styles.wrapper}`}>
      <MarketingAtmosphere />
      <KirintiYolu
        parcalar={[
          { ad: t.anaSayfa, yol: yerelYol(dil, '/') },
          { ad: t.ustYazi, yol: yerelYol(dil, '/blog') },
          { ad: post.title, yol: yaziYolu(post.slug) },
        ]}
      />
      <YaziYapisalVeri
        baslik={post.title}
        ozet={post.excerpt}
        tarih={post.date}
        slug={post.slug}
        dil={dil}
      />
      <article className={styles.postWrapper}>
        <Link href={yerelYol(dil, '/blog')} className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden />
          {t.tumYazilar}
        </Link>

        <header className={styles.postHeader}>
          <div className={styles.postMeta}>
            <span className={styles.topicTag}>{post.topic}</span>
            <span className={styles.metaDot} aria-hidden="true" />
            <span className={styles.metaText}>{formatPostDate(post.date, 'long', dil)}</span>
            <span className={styles.metaDot} aria-hidden="true" />
            <span className={styles.metaText}>
              {readTime} {t.dkOkuma}
            </span>
          </div>
          <h1 className={styles.postTitle}>{post.title}</h1>
          {lede && <p className={styles.postLede}>{lede}</p>}
        </header>

        <div className={styles.postBody}>
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {post.moduller && post.moduller.length > 0 && (
          // İç bağlantı (SEO): yazıdan ilgili modül tanıtım sayfalarına. Görsel stil sonradan verilir.
          <nav aria-label={dil === 'tr' ? 'İlgili modüller' : 'Related modules'} data-bolum="ilgili-moduller">
            {post.moduller.map((k) => (
              <Link key={k} href={yerelYol(dil, modulYolu(k))}>
                {MODUL_ICERIGI[dil][k].baslik}
              </Link>
            ))}
          </nav>
        )}

        <div className={styles.postFootRule} aria-hidden="true" />

        {(newer || older) && (
          <nav className={styles.postNav} aria-label={t.yazilarArasi}>
            {older ? (
              <Link href={yaziYolu(older.slug)} className={styles.postNavLink}>
                <span className={styles.postNavDir}>
                  <ArrowLeft size={13} aria-hidden />
                  {t.oncekiYazi}
                </span>
                <span className={styles.postNavTitle}>{older.title}</span>
              </Link>
            ) : (
              <span className={styles.postNavEmpty} aria-hidden="true" />
            )}
            {newer ? (
              <Link
                href={yaziYolu(newer.slug)}
                className={`${styles.postNavLink} ${styles.postNavLinkNext}`}
              >
                <span className={styles.postNavDir}>
                  {t.sonrakiYazi}
                  <ArrowRight size={13} aria-hidden />
                </span>
                <span className={styles.postNavTitle}>{newer.title}</span>
              </Link>
            ) : (
              <span className={styles.postNavEmpty} aria-hidden="true" />
            )}
          </nav>
        )}

        <section className={styles.postCta} aria-label={t.kapanisEtiketi}>
          <h2 className={styles.postCtaTitle}>{t.kapanisBaslik}</h2>
          <p className={styles.postCtaSub}>{t.kapanisAlt}</p>
          <Link href="/register" className="mkt-btn-primary">
            {t.kapanisCta}
            <ArrowUpRight size={16} aria-hidden />
          </Link>
        </section>
      </article>
    </main>
  )
}
