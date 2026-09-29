import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import {
  JourneyMockup,
  PlaylistsMockup,
  RecapMockup,
  TasteMockup,
} from '@/components/marketing/living-mockups'
import { KirintiYolu, ModulYapisalVeri, SssYapisalVeri } from '@/components/seo/structured-data'
import { yerelYol, type Dil } from '@/lib/marketing/dil'
import { marketingMetadata } from '@/lib/marketing/metadata'
import {
  MODUL_ANAHTARLARI,
  MODUL_ICERIGI,
  MODUL_MERKEZI,
  modulAnahtariBul,
  modulYolu,
  type ModulAnahtari,
} from '@/lib/marketing/moduller'
import styles from './modul-sayfasi.module.css'

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * MODÜL TANITIM SAYFALARI (ModulSayfasi & ModulMerkezi)
 * 
 * Çift Otoriteli Hibrit Tasarım Dili (Apple + Spotify Füzyonu):
 * - Apple restraint, malzeme derinliği, specular rim-light, optical sizing.
 * - Spotify müzikal ergonomisi, conversational metadata rhythm, cerrahi yeşil aksan.
 * - Box-in-box yığınından arındırılmış saf canvas mimarisi.
 * - Vitrin & reklam kalitesinde Living Mockup bileşenleri.
 * - Z-index & floating nav çakışmasız tam responsive izolasyon.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const MODUL_ACCENTS: Record<ModulAnahtari, string> = {
  taste: '#9333ea',
  recap: '#c084fc',
  journey: '#a855f7',
  playlists: '#7c3aed',
}

const MODUL_METAS: Record<ModulAnahtari, { step: string; badge: string }> = {
  taste: { step: '01 / IDENTITY', badge: 'Taste' },
  recap: { step: '02 / SNAPSHOTS', badge: 'Recap' },
  journey: { step: '03 / TIME', badge: 'Journey' },
  playlists: { step: '04 / CREATION', badge: 'Playlists' },
}

function ModulMockupGorunumu({
  anahtar,
  accent,
  dil,
}: {
  anahtar: ModulAnahtari
  accent: string
  dil: Dil
}) {
  switch (anahtar) {
    case 'taste':
      return <TasteMockup accent={accent} dil={dil} />
    case 'recap':
      return <RecapMockup accent={accent} dil={dil} />
    case 'journey':
      return <JourneyMockup accent={accent} dil={dil} />
    case 'playlists':
      return <PlaylistsMockup accent={accent} dil={dil} />
    default:
      return null
  }
}

/** `/modules/<slug>` metadata'sı — iki dilin rota dosyası da bunu çağırır. */
export function modulSayfasiMetadata(dil: Dil, slug: string): Metadata {
  const anahtar = modulAnahtariBul(slug)
  if (!anahtar) return { title: dil === 'tr' ? 'Sayfa bulunamadı' : 'Page not found' }
  const c = MODUL_ICERIGI[dil][anahtar]
  return {
    ...marketingMetadata({
      dil,
      yol: modulYolu(anahtar),
      baslik: c.metaBaslik,
      aciklama: c.metaAciklama,
    }),
    keywords: c.anahtarKelimeler,
  }
}

/** Modül tanıtım sayfası — `/modules/[slug]` ve `/en/modules/[slug]`. */
export function ModulSayfasi({ dil, slug }: { dil: Dil; slug: string }) {
  const anahtar = modulAnahtariBul(slug)
  if (!anahtar) notFound()

  const c = MODUL_ICERIGI[dil][anahtar]
  const merkez = MODUL_MERKEZI[dil]
  const yol = modulYolu(anahtar)
  const accent = MODUL_ACCENTS[anahtar]

  return (
    <main
      className={`mkt-page ${styles.pageWrapper}`}
      data-modul={anahtar}
      style={{ ['--modul-accent' as string]: accent }}
    >
      <MarketingAtmosphere />
      <div className={styles.breadcrumbWrap}>
        <KirintiYolu
          parcalar={[
            { ad: merkez.anaSayfa, yol: yerelYol(dil, '/') },
            { ad: merkez.ustYazi, yol: yerelYol(dil, '/modules') },
            { ad: c.ad, yol: yerelYol(dil, yol) },
          ]}
        />
      </div>
      <ModulYapisalVeri
        ad={c.ad}
        baslik={c.metaBaslik}
        aciklama={c.metaAciklama}
        yol={yol}
        ozellikler={c.ozellikler}
        anahtarKelimeler={c.anahtarKelimeler}
        dil={dil}
      />
      <SssYapisalVeri sorular={c.sss} />

      {/* ── 1. Hero Bölümü (Desktop 56px Display & Living Mockup Vitrini) ── */}
      <header data-bolum="hero" className={styles.hero}>
        <div className={styles.heroContent}>
          <div className="mkt-eyebrow">{c.ustYazi}</div>
          <h1 className={styles.heroTitle}>{c.baslik}</h1>
          <p className={styles.heroLead}>{c.giris}</p>
          <div className={styles.heroActionGroup}>
            <div className={styles.heroButtonLockup}>
              <Link href="/register" className={styles.heroCtaPrimary}>
                <span>{c.cta}</span>
                <ArrowRight size={16} aria-hidden />
              </Link>
              <a href="#ozellikler" className={styles.heroCtaSecondary}>
                <span>{dil === 'tr' ? 'Özellikleri İncele' : 'See Highlights'}</span>
                <ChevronRight size={15} aria-hidden />
              </a>
            </div>
            <span className={styles.heroTrustText}>
              {dil === 'tr'
                ? 'Kredi kartı gerekmez · Ücretsiz başla · Saf Spotify'
                : 'No credit card required · Free start · Pure Spotify'}
            </span>
          </div>
        </div>

        <div className={styles.heroMockupContainer} aria-label={`${c.ad} görsel vitrini`}>
          <div className={styles.heroMockupGlow} aria-hidden />
          <ModulMockupGorunumu anahtar={anahtar} accent={accent} dil={dil} />
        </div>
      </header>

      {/* ── 2. Özellikler Bölümü (Box-in-Box Temizliği: Saf Canvas & Tipografi) ── */}
      <section
        id="ozellikler"
        data-bolum="ozellikler"
        aria-label={c.ad}
        className={styles.featuresSection}
      >
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>
            {dil === 'tr' ? 'Yetenekler' : 'Capabilities'}
          </span>
          <h2 className={styles.sectionTitle}>
            {dil === 'tr' ? 'Öne Çıkan Özellikler' : 'Key Highlights'}
          </h2>
        </div>
        <ul className={styles.featuresGrid}>
          {c.ozellikler.map((o) => (
            <li key={o} className={styles.featureItem}>
              <div className={styles.featureBulletWrap} aria-hidden>
                <Check size={14} strokeWidth={2.5} />
              </div>
              <p className={styles.featureText}>{o}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 3. İçerik & Felsefe Bölümleri ── */}
      {c.bolumler.map((b) => (
        <section key={b.baslik} data-bolum="icerik" className={styles.narrativeSection}>
          <h2 className={styles.narrativeTitle}>{b.baslik}</h2>
          {b.govde.map((p, i) => (
            <p key={i} className={styles.narrativeParagraph}>
              {p}
            </p>
          ))}
        </section>
      ))}

      {/* ── 4. Nasıl Çalışır / Adımlar Bölümü (Grid Normalizasyonu: 3'lü vs 4'lü) ── */}
      <section data-bolum="adimlar" className={styles.stepsSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>{dil === 'tr' ? 'Akış' : 'Workflow'}</span>
          <h2 className={styles.sectionTitle}>
            {dil === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}
          </h2>
        </div>
        <ol className={styles.stepsList} data-step-count={c.adimlar.length}>
          {c.adimlar.map((a, idx) => (
            <li key={a} className={styles.stepCard}>
              <span className={styles.stepNumber}>
                {String(idx + 1).padStart(2, '0')} / {dil === 'tr' ? 'ADIM' : 'STEP'}
              </span>
              <p className={styles.stepText}>{a}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 5. Sık Sorulan Sorular (Görünür = FAQPage) ── */}
      <section data-bolum="sss" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>FAQ</span>
          <h2 className={styles.sectionTitle}>
            {dil === 'tr' ? 'Sık sorulan sorular' : 'Frequently asked questions'}
          </h2>
        </div>
        <div className={styles.faqList}>
          {c.sss.map((s) => (
            <details key={s.q} className={styles.faqItem}>
              <summary className={styles.faqSummary}>
                <span>{s.q}</span>
                <ChevronDown size={18} className={styles.faqChevron} aria-hidden />
              </summary>
              <p className={styles.faqAnswer}>{s.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── 6. İlgili Modüller & İç Bağlantılar ── */}
      <nav
        data-bolum="ilgili"
        aria-label={dil === 'tr' ? 'Diğer modüller' : 'Other modules'}
        className={styles.relatedSection}
      >
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>
            {dil === 'tr' ? 'Ekosistem' : 'Ecosystem'}
          </span>
          <h2 className={styles.sectionTitle}>
            {dil === 'tr' ? 'Diğer Modülleri Keşfet' : 'Explore Other Modules'}
          </h2>
        </div>
        <div className={styles.relatedGrid}>
          {c.ilgili.map((k) => (
            <Link
              key={k}
              href={yerelYol(dil, modulYolu(k))}
              className={styles.relatedCard}
              style={{ ['--modul-accent' as string]: MODUL_ACCENTS[k] }}
            >
              <div className={styles.relatedCardCopy}>
                <span className={styles.relatedCardBadge}>{MODUL_METAS[k].step}</span>
                <span className={styles.relatedCardName}>{MODUL_ICERIGI[dil][k].ad}</span>
              </div>
              <ChevronRight size={18} className={styles.relatedCardArrow} aria-hidden />
            </Link>
          ))}
          <Link href={yerelYol(dil, '/modules')} className={styles.relatedCard}>
            <div className={styles.relatedCardCopy}>
              <span className={styles.relatedCardBadge}>ROSSO / HUB</span>
              <span className={styles.relatedCardName}>{merkez.ustYazi}</span>
            </div>
            <ArrowRight size={18} className={styles.relatedCardArrow} aria-hidden />
          </Link>
        </div>
      </nav>

      {/* ── 7. Finale CTA Bandı ── */}
      <section
        data-bolum="cta"
        className={`mkt-cta-band ${styles.finaleCta}`}
        aria-label={c.cta}
      >
        <div className="mkt-cta-band__glow" aria-hidden />
        <div className="mkt-cta-band__vignette" aria-hidden />
        <div className="mkt-cta-band__inner">
          <p className="mkt-cta-band__epilogue" aria-hidden>
            ROSSO · SPOTIFY
          </p>
          <h2 className="mkt-cta-band__title">{c.ad}</h2>
          <p className="mkt-cta-band__sub">{c.giris}</p>
          <Link href="/register" className="mkt-btn-primary">
            <span>{c.cta}</span>
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  )
}

/** Modül merkezi metadata'sı — `/modules` ve `/en/modules`. */
export function modulMerkeziMetadata(dil: Dil): Metadata {
  const m = MODUL_MERKEZI[dil]
  return marketingMetadata({
    dil,
    yol: '/modules',
    baslik: m.metaBaslik,
    aciklama: m.metaAciklama,
  })
}

/** Modül merkezi — dört modülün listesi; iç bağlantı ve SEO merkezi. */
export function ModulMerkezi({ dil }: { dil: Dil }) {
  const m = MODUL_MERKEZI[dil]

  return (
    <main className={`mkt-page ${styles.pageWrapper}`} data-modul="merkez">
      <MarketingAtmosphere />
      <div className={styles.breadcrumbWrap}>
        <KirintiYolu
          parcalar={[
            { ad: m.anaSayfa, yol: yerelYol(dil, '/') },
            { ad: m.ustYazi, yol: yerelYol(dil, '/modules') },
          ]}
        />
      </div>

      <header data-bolum="hero" className={styles.hubHero}>
        <div className="mkt-eyebrow">{m.ustYazi}</div>
        <h1 className={styles.hubTitle}>{m.baslik}</h1>
        <p className={styles.hubLead}>{m.giris}</p>
      </header>

      <section data-bolum="moduller" className={styles.hubGrid}>
        {MODUL_ANAHTARLARI.map((k: ModulAnahtari) => {
          const c = MODUL_ICERIGI[dil][k]
          const accent = MODUL_ACCENTS[k]
          const meta = MODUL_METAS[k]

          return (
            <article
              key={k}
              className={styles.hubCard}
              style={{ ['--card-accent' as string]: accent }}
            >
              <div className={styles.hubCardTop}>
                <span className={styles.hubCardBadge}>{meta.step}</span>
                <span className={styles.hubCardBadge}>{c.ad}</span>
              </div>
              <h2 className={styles.hubCardTitle}>
                <Link href={yerelYol(dil, modulYolu(k))}>{c.baslik}</Link>
              </h2>
              <p className={styles.hubCardLead}>{c.giris}</p>
              <div className={styles.hubCardBottom}>
                <Link
                  href={yerelYol(dil, modulYolu(k))}
                  className={styles.hubCardLink}
                  aria-label={`${c.ad} - ${dil === 'tr' ? 'Detayları İncele' : 'Explore Details'}`}
                >
                  <span>{dil === 'tr' ? 'Detayları İncele' : 'Explore Details'}</span>
                  <ChevronRight size={16} aria-hidden />
                </Link>
              </div>
            </article>
          )
        })}
      </section>

      <section
        data-bolum="cta"
        className={`mkt-cta-band ${styles.finaleCta}`}
        aria-label={m.ustYazi}
      >
        <div className="mkt-cta-band__glow" aria-hidden />
        <div className="mkt-cta-band__vignette" aria-hidden />
        <div className="mkt-cta-band__inner">
          <p className="mkt-cta-band__epilogue" aria-hidden>
            ROSSO · SPOTIFY
          </p>
          <h2 className="mkt-cta-band__title">
            {dil === 'tr'
              ? 'Müzikal hafızanı keşfetmeye başla.'
              : 'Begin discovering your musical memory.'}
          </h2>
          <p className="mkt-cta-band__sub">{m.giris}</p>
          <Link href="/register" className="mkt-btn-primary">
            <span>{dil === 'tr' ? 'Ücretsiz Başla' : 'Start for Free'}</span>
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  )
}
