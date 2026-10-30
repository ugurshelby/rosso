import Link from 'next/link'
import {
  UserCheck,
  Calendar,
  FolderArchive,
  ListMusic,
  ChevronRight,
} from 'lucide-react'
import { yerelYol } from '@/lib/marketing/dil'
import { modulYolu } from '@/lib/marketing/moduller'
import { ornekYillar } from '@/lib/marketing/ornek-yillar'
import styles from './depth-ecosystem.module.css'

export type DepthLang = 'tr' | 'en'

/*
 * Metin notları (2026-10-12):
 *  - Örnek tarih YOK ("25/11/2023", "Mart–Ekim 2023", "2018-2023" bayatlamıştı).
 *    Yıl hapları `ornekYillar()` ile her zaman bugünde biter.
 *  - Ton: "analiz / DNA" yerine hikâye, dönem, ayna, kimlik, frekans.
 *  - Madde listeleri `lib/marketing/moduller.ts`teki GERÇEK özelliklerle
 *    hizalı; üründe karşılığı olmayan vaatler ("Zaman Tüneli", "Mevsimlik
 *    Favoriler", vokal/enstrümantal haritası) kaldırıldı.
 */
export const DEPTH_ECOSYSTEM_COPY = {
  tr: {
    sectionTag: 'DERİNLİK',
    title: 'İstatistikten öteye.',
    subhead:
      'Dinleme alışkanlıkların yalnızca sayılardan ibaret değil; bir hikâye anlatır. Rosso bu geçmişi okur, müzik kimliğini ortaya çıkarır ve sana bir ayna tutar.',
    detailsText: 'Detaylar',
    featuresSuffix: 'özellikleri',
    yearsLabel: 'Arşiv yılları',
    modules: {
      taste: {
        step: '01 / IDENTITY',
        badge: 'Taste',
        title: 'Müzikal Kimliğin',
        desc: 'Ne dinlediğini değil, nasıl bir dinleyici olduğunu gör.',
        items: [
          'Tür Frekansın (Rock/Pop/Elektronik)',
          'Gün İçi Ritmin: saat saat dinleme yoğunluğu',
          'Şu An ve Değişmeyenler',
        ],
        meta: 'Yeni dinlemelerle güncel kalır',
      },
      recap: {
        step: '02 / SNAPSHOTS',
        badge: 'Recap',
        title: 'Dönemsel Aynalar',
        desc: 'Her ayın ve dönemin müzikal ruhunu zaman çizgisine dök.',
        items: [
          'Aylık ve yıllık özetler',
          'Dönemin zirve günü ve dinleme serisi',
          'Paylaşılabilir görsel kartlar',
        ],
        meta: 'Kapsam: aylık ve yıllık dönemler',
      },
      journey: {
        step: '03 / TIME',
        badge: 'Journey',
        title: 'Ömür Boyu Arşiv',
        desc: 'Yıllara yayılan dinleme serüvenini kalıcı bir hafızaya dönüştür.',
        items: [
          'Tüm Dinleme Geçmişi (ilk dinlemeden bugüne)',
          'Zamana Direnen Parçalar',
          'Keşif Patlamaları ve Kırılma Anları',
        ],
      },
      playlists: {
        step: '04 / CREATION',
        badge: 'Playlists',
        title: 'Yaşayan Listeler',
        desc: 'Statik listelerin ötesinde: ruh haline ve kurallarına göre şekillenen listeler.',
        items: [
          'Ruh haline göre çalma listeleri',
          'Kendi kurallarınla otomatik oluşan listeler',
          'Tek dokunuşla Spotify hesabına ekleme',
        ],
        tag: 'Yaşayan Liste',
        liveMeta: 'Ruh haline ve kurallara göre şekillenir',
      },
    },
  },
  en: {
    sectionTag: 'DEPTH',
    title: 'Beyond the numbers.',
    subhead:
      'Your listening habits are more than numbers; they tell a story. Rosso reads that history, brings out your musical identity and holds up a mirror for you.',
    detailsText: 'Details',
    featuresSuffix: 'features',
    yearsLabel: 'Archive years',
    modules: {
      taste: {
        step: '01 / IDENTITY',
        badge: 'Taste',
        title: 'Musical Identity',
        desc: 'See not just what you listen to, but who you are as a listener.',
        items: [
          'Genre Frequency (Rock/Pop/Electronic)',
          'Your Daily Rhythm: hour-by-hour listening intensity',
          'Right Now and Constants',
        ],
        meta: 'Stays current with new listens',
      },
      recap: {
        step: '02 / SNAPSHOTS',
        badge: 'Recap',
        title: 'Periodic Mirrors',
        desc: 'Map the musical essence of every month and season onto your timeline.',
        items: [
          'Monthly and yearly summaries',
          'Peak day and listening streak of the period',
          'Shareable image cards',
        ],
        meta: 'Scope: monthly and yearly periods',
      },
      journey: {
        step: '03 / TIME',
        badge: 'Journey',
        title: 'Lifelong Archive',
        desc: 'Turn years of music listening into an enduring personal heritage.',
        items: [
          'Full Listening History (from your first play to today)',
          'Timeless Tracks',
          'Discovery Waves and Turning Points',
        ],
      },
      playlists: {
        step: '04 / CREATION',
        badge: 'Playlists',
        title: 'Living Playlists',
        desc: 'Beyond static playlists: lists shaped by your mood and your own rules.',
        items: [
          'Mood-based playlists',
          'Automatic playlists built from your own rules',
          'Add a playlist to Spotify in one tap',
        ],
        tag: 'Living List',
        liveMeta: 'Shaped by your mood and rules',
      },
    },
  },
} as const

interface DepthEcosystemSectionProps {
  lang?: DepthLang
}

export function DepthEcosystemSection({ lang = 'tr' }: DepthEcosystemSectionProps) {
  const c = DEPTH_ECOSYSTEM_COPY[lang]
  // Örnek arşiv yılları: bugünden geriye 5 yıl (elle yazılı yıl bayatlıyordu).
  const arsivYillari = ornekYillar(5).map(String)

  return (
    <section id="derinlik" className={styles.section} aria-label={c.title}>
      <div className={styles.atmosphere} aria-hidden>
        <div className={styles.ambientGlowPrimary} />
        <div className={styles.ambientGlowSecondary} />
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.tag}>{c.sectionTag}</span>
          <h2 className={styles.title}>{c.title}</h2>
          <p className={styles.lead}>{c.subhead}</p>
        </header>

        <div className={styles.grid}>
          {/* ── Üst Sıra: 3 Eşit & Simetrik Kart (Taste, Recap, Journey) ── */}
          <div className={styles.rowTop}>
            {/* 1. TASTE (Müzikal Kimliğin) */}
            <article className={`${styles.card} ${styles.tasteCard}`}>
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  <span className={styles.moduleBadge}>
                    <span className={styles.moduleBadgeDot} />
                    {c.modules.taste.badge}
                  </span>
                  <span className={styles.moduleStep}>{c.modules.taste.step}</span>
                </div>

                <div className={styles.titleRow}>
                  <div className={styles.cardIconWrap} aria-hidden>
                    <UserCheck className={styles.cardIcon} size={18} />
                  </div>
                  <h3 className={styles.cardTitle}>{c.modules.taste.title}</h3>
                </div>

                <p className={styles.cardDesc}>{c.modules.taste.desc}</p>
              </div>

              {/* Feature Highlight Listesi */}
              <ul className={styles.featureList} aria-label={`${c.modules.taste.title} ${c.featuresSuffix}`}>
                {c.modules.taste.items.map((item) => (
                  <li key={item} className={styles.featureItem}>
                    <span className={styles.featureBullet} aria-hidden />
                    <span className={styles.featureText}>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Alt Bilgi & Detaylar */}
              <div className={styles.cardBottom}>
                <div className={styles.metaRow}>
                  <span className={styles.metaBadge}>{c.modules.taste.meta}</span>
                </div>
                <Link
                  href={yerelYol(lang, modulYolu('taste'))}
                  className={styles.detailsRow}
                  aria-label={`${c.modules.taste.title} - ${c.detailsText}`}
                >
                  <span className={styles.detailsText}>{c.detailsText}</span>
                  <ChevronRight size={14} className={styles.detailsIcon} aria-hidden />
                </Link>
              </div>
            </article>

            {/* 2. RECAP (Dönemsel Aynalar) */}
            <article className={`${styles.card} ${styles.recapCard}`}>
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  <span className={styles.moduleBadge}>
                    <span className={styles.moduleBadgeDot} />
                    {c.modules.recap.badge}
                  </span>
                  <span className={styles.moduleStep}>{c.modules.recap.step}</span>
                </div>

                <div className={styles.titleRow}>
                  <div className={styles.cardIconWrap} aria-hidden>
                    <Calendar className={styles.cardIcon} size={18} />
                  </div>
                  <h3 className={styles.cardTitle}>{c.modules.recap.title}</h3>
                </div>

                <p className={styles.cardDesc}>{c.modules.recap.desc}</p>
              </div>

              {/* Feature Highlight Listesi */}
              <ul className={styles.featureList} aria-label={`${c.modules.recap.title} ${c.featuresSuffix}`}>
                {c.modules.recap.items.map((item) => (
                  <li key={item} className={styles.featureItem}>
                    <span className={styles.featureBullet} aria-hidden />
                    <span className={styles.featureText}>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Alt Bilgi & Detaylar */}
              <div className={styles.cardBottom}>
                <div className={styles.metaRow}>
                  <span className={styles.metaBadge}>{c.modules.recap.meta}</span>
                </div>
                <Link
                  href={yerelYol(lang, modulYolu('recap'))}
                  className={styles.detailsRow}
                  aria-label={`${c.modules.recap.title} - ${c.detailsText}`}
                >
                  <span className={styles.detailsText}>{c.detailsText}</span>
                  <ChevronRight size={14} className={styles.detailsIcon} aria-hidden />
                </Link>
              </div>
            </article>

            {/* 3. JOURNEY (Ömür Boyu Arşiv) */}
            <article className={`${styles.card} ${styles.journeyCard}`}>
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  <span className={styles.moduleBadge}>
                    <span className={styles.moduleBadgeDot} />
                    {c.modules.journey.badge}
                  </span>
                  <span className={styles.moduleStep}>{c.modules.journey.step}</span>
                </div>

                <div className={styles.titleRow}>
                  <div className={styles.cardIconWrap} aria-hidden>
                    <FolderArchive className={styles.cardIcon} size={18} />
                  </div>
                  <h3 className={styles.cardTitle}>{c.modules.journey.title}</h3>
                </div>

                <p className={styles.cardDesc}>{c.modules.journey.desc}</p>
              </div>

              {/* Feature Highlight Listesi */}
              <ul className={styles.featureList} aria-label={`${c.modules.journey.title} ${c.featuresSuffix}`}>
                {c.modules.journey.items.map((item) => (
                  <li key={item} className={styles.featureItem}>
                    <span className={styles.featureBullet} aria-hidden />
                    <span className={styles.featureText}>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Yıllar Listesi & Detaylar */}
              <div className={styles.cardBottom}>
                <div className={styles.yearsList} aria-label={c.yearsLabel}>
                  {arsivYillari.map((year, idx) => (
                    <span
                      key={year}
                      className={`${styles.yearPill} ${idx === arsivYillari.length - 1 ? styles.yearPillActive : ''}`}
                    >
                      {year}
                    </span>
                  ))}
                </div>
                <Link
                  href={yerelYol(lang, modulYolu('journey'))}
                  className={styles.detailsRow}
                  aria-label={`${c.modules.journey.title} - ${c.detailsText}`}
                >
                  <span className={styles.detailsText}>{c.detailsText}</span>
                  <ChevronRight size={14} className={styles.detailsIcon} aria-hidden />
                </Link>
              </div>
            </article>
          </div>

          {/* ── Alt Sıra: tam genişlik tek kart (Playlists) ── */}
          <div className={styles.rowBottom}>
            {/* 4. PLAYLISTS (Yaşayan Listeler) */}
            <article className={`${styles.card} ${styles.playlistCard}`}>
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  <span className={styles.moduleBadge}>
                    <span className={styles.moduleBadgeDot} />
                    {c.modules.playlists.badge}
                  </span>
                  <span className={styles.moduleStep}>{c.modules.playlists.step}</span>
                </div>

                <div className={styles.titleRow}>
                  <div className={styles.cardIconWrap} aria-hidden>
                    <ListMusic className={styles.cardIcon} size={18} />
                  </div>
                  <h3 className={styles.cardTitle}>{c.modules.playlists.title}</h3>
                </div>

                <p className={styles.cardDesc}>{c.modules.playlists.desc}</p>
              </div>

              {/* Feature Highlight Listesi */}
              <ul className={styles.featureList} aria-label={`${c.modules.playlists.title} ${c.featuresSuffix}`}>
                {c.modules.playlists.items.map((item) => (
                  <li key={item} className={styles.featureItem}>
                    <span className={styles.featureBullet} aria-hidden />
                    <span className={styles.featureText}>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Canlı Akış Göstergesi & Detaylar */}
              <div className={styles.cardBottom}>
                <div className={styles.liveIndicatorRow}>
                  <span className={styles.playlistBadge}>{c.modules.playlists.tag}</span>
                  <span className={styles.liveMetaText}>{c.modules.playlists.liveMeta}</span>
                  <div className={styles.waveform} aria-hidden>
                    <span className={styles.waveBar} style={{ height: '40%' }} />
                    <span className={styles.waveBar} style={{ height: '90%' }} />
                    <span className={styles.waveBar} style={{ height: '65%' }} />
                    <span className={styles.waveBar} style={{ height: '100%' }} />
                  </div>
                </div>
                <Link
                  href={yerelYol(lang, modulYolu('playlists'))}
                  className={styles.detailsRow}
                  aria-label={`${c.modules.playlists.title} - ${c.detailsText}`}
                >
                  <span className={styles.detailsText}>{c.detailsText}</span>
                  <ChevronRight size={14} className={styles.detailsIcon} aria-hidden />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
