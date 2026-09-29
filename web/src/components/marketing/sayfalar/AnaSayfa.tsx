import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { platformConfig } from '@/lib/platforms'
import type { Platform } from '@rosso/shared-types'
import type { Dil } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'
import { HeroReveal } from '@/components/marketing/HeroReveal'
import { HeroAmbientImage } from '@/components/marketing/hero-ambient-image'
import { IdentityMarquee } from '@/components/marketing/IdentityMarquee'
import { RecapJourneyScroll } from '@/components/marketing/RecapJourneyScroll'
import { DepthEcosystemSection } from '@/components/marketing/DepthEcosystemSection'
import { ProcessStreamSection } from '@/components/marketing/ProcessStreamSection'
import { AnaSayfaYapisalVeri } from '@/components/seo/structured-data'
import styles from '@/app/(marketing)/marketing.module.css'

const PLATFORMS: Platform[] = ['spotify']

/**
 * Landing gövdesi — `/` (Türkçe) ve `/en` (İngilizce) aynı bileşeni kullanır.
 * Metin `SOZLUK`, bölüm kopyaları kendi bileşenlerinde (`lang` prop'u).
 */
export function AnaSayfa({ dil }: { dil: Dil }) {
  const t = SOZLUK[dil].anaSayfa

  return (
    <main className={styles.main}>
      <AnaSayfaYapisalVeri dil={dil} />
      {/* ── Hero viewport ── Tam viewport sinematik Apple-design sahnesi */}
      <div className={styles.heroViewport}>
        {/* 4:3 crop-free sinematik görsel katmanı */}
        <HeroAmbientImage />

        {/* Ön plan metin & CTA katmanı */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <HeroReveal delay={0}>
              <div className={styles.heroBrandBadge}>
                <span className={styles.heroBrandMarkWrap}>
                  <Image
                    src="/brand/rosso-mark.png"
                    alt=""
                    width={18}
                    height={18}
                    className={styles.heroBrandMark}
                    priority
                  />
                </span>
                <span className={styles.heroBrandLabel}>{t.rozet}</span>
              </div>
              <h1 className={styles.heroTitle}>
                <span className={styles.heroAccent}>ROSSO</span>
              </h1>
            </HeroReveal>

            <HeroReveal delay={0.08}>
              <p className={styles.heroLead}>
                <span className={styles.heroLeadMuted}>{t.girisSoluk}</span>
                <span className={styles.heroLeadStatement}>
                  {t.girisOnce}
                  <em className={styles.leadEmphasis}>{t.girisVurgu}</em>
                  {t.girisSonra}
                </span>
              </p>
            </HeroReveal>

            <HeroReveal delay={0.14}>
              <div className={styles.heroFoot}>
                <Link href="/register" prefetch={false} className={styles.ctaPrimary}>
                  {t.cta}
                  <span className={styles.ctaIconWell}>
                    <ArrowRight size={15} aria-hidden />
                  </span>
                </Link>
                <div className={styles.heroTrust} aria-label={t.platformEtiketi}>
                  {PLATFORMS.map((p) => (
                    <span
                      key={p}
                      className={styles.heroTrustDot}
                      style={{ background: platformConfig[p].color }}
                      aria-hidden
                    />
                  ))}
                  <span className={styles.heroTrustCopy}>
                    <span className={styles.heroTrustPlatform}>Spotify</span>
                  </span>
                  <span className="sr-only">
                    {PLATFORMS.map((p) => platformConfig[p].label).join(', ')}{' '}
                    {t.platformDestekleniyor}
                  </span>
                </div>
              </div>
            </HeroReveal>
          </div>
        </section>

        {/* ── Identity marquee ── Persona motorunun örnek çıktıları */}
        <IdentityMarquee dil={dil} />
      </div>

      {/* ── Vitrin — önce kanıt: uygulama içi yüz (landing-page-rehberi §2) ── */}
      <RecapJourneyScroll dil={dil} />

      {/* ── Derinlik / İstatistikten Öteye — Müzik Ekosistemi (DATA → IDENTITY → TIME → CREATION) ── */}
      <DepthEcosystemSection lang={dil} />

      {/* ── Süreç — Kesintisiz Zaman Çizgisi Akışı (Connected Timeline Stream) ── */}
      <ProcessStreamSection lang={dil} />

      {/* ── CTA band ── */}
      <section className={styles.ctaBand}>
        <div className={styles.ctaBandGlow} aria-hidden />
        <div className={styles.ctaBandVignette} aria-hidden />
        <div className={styles.ctaBandInner}>
          <p className={styles.ctaBandEpilogue} aria-hidden>
            {t.kapanisUstYazi}
          </p>
          <h2 className={styles.ctaBandTitle}>{t.kapanisBaslik}</h2>
          <p className={styles.ctaBandSub}>{t.kapanisAlt}</p>
          <div className={styles.ctaButtonWrap}>
            <div className={styles.ctaButtonBacklight} aria-hidden />
            <Link
              href="/register"
              prefetch={false}
              className={styles.ctaPrimaryFinale}
            >
              <span>{t.cta}</span>
              <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
