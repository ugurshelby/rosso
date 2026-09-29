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
import styles from './depth-ecosystem.module.css'

export type DepthLang = 'tr' | 'en'

export const DEPTH_ECOSYSTEM_COPY = {
  tr: {
    sectionTag: 'DERİNLİK',
    title: 'İstatistikten öteye.',
    subhead:
      "Müzik dinleme alışkanlıkların sadece sayılar değil, hikayeler anlatır. Rosso, bu verileri derinlemesine analiz ederek senin müzikal DNA'nı keşfeder ve sana özel bir deneyim sunar.",
    detailsText: 'Detaylar',
    modules: {
      taste: {
        step: '01 / IDENTITY',
        badge: 'Taste',
        title: 'Müzikal Kimliğin',
        desc: 'Ne dinlediğini değil, nasıl bir dinleyici olduğunu analiz et.',
        items: [
          'Tür Analizi (Rock/Pop/Elektronik)',
          'Duygu Durum Haritası (Mutlu/Hüzünlü)',
          'Kritik Dinleme Analizi (Vokal/Enstrümantal)',
        ],
        meta: 'Kimlik Güncellemesi: 25/11/2023',
      },
      recap: {
        step: '02 / SNAPSHOTS',
        badge: 'Recap',
        title: 'Dönemsel Aynalar',
        desc: 'Her ayın ve dönemin müzikal ruhunu zaman çizgisine dök.',
        items: [
          'Zaman Tüneli: Yılın Enleri',
          'Mevsimlik Favoriler',
          'Yıllık Özet: 2023 Özeti',
        ],
        meta: 'Kapsam: Mart 2023 - Ekim 2023',
      },
      journey: {
        step: '03 / TIME',
        badge: 'Journey',
        title: 'Ömür Boyu Arşiv',
        desc: 'Yıllara yayılan dinleme serüvenini kalıcı bir hafızaya dönüştür.',
        items: [
          'Tüm Dinleme Geçmişi (2018-2023)',
          'Zamana Direnen Parçalar',
          'Keşfedilen Sanatçılar Arşivi',
        ],
        years: ['2019', '2020', '2021', '2022', '2023'],
      },
      playlists: {
        step: '04 / CREATION',
        badge: 'Playlists',
        title: 'Yaşayan Listeler',
        desc: 'Statik listeleri unut; dinleme ritmine göre canlı güncellenen mixler.',
        items: [
          'Haftalık Modunuza Göre Oluşturulan Listeler',
          'Duygu Durum Odaklı Çalma Listeleri',
          'Dinleme Alışkanlıklarınıza Göre Canlı Güncellenen Mix\'ler',
        ],
        tag: 'Canlı Liste',
        liveMeta: 'Alışkanlıklara göre anlık mix',
      },
    },
  },
  en: {
    sectionTag: 'DEPTH',
    title: 'Beyond the numbers.',
    subhead:
      "Your listening habits don't just tell numbers—they tell stories. Rosso deeply analyzes this data to discover your musical DNA and craft a tailored experience.",
    detailsText: 'Details',
    modules: {
      taste: {
        step: '01 / IDENTITY',
        badge: 'Taste',
        title: 'Musical Identity',
        desc: 'Analyze not just what you listen to, but who you are as a listener.',
        items: [
          'Genre Analysis (Rock/Pop/Electronic)',
          'Mood State Mapping (Upbeat/Melancholic)',
          'Critical Listening Analysis (Vocal/Instrumental)',
        ],
        meta: 'Identity Update: 25/11/2023',
      },
      recap: {
        step: '02 / SNAPSHOTS',
        badge: 'Recap',
        title: 'Periodic Mirrors',
        desc: 'Map the musical essence of every month and season onto your timeline.',
        items: [
          'Time Capsule: Best of the Year',
          'Seasonal Favorites',
          'Annual Wrap: 2023 Summary',
        ],
        meta: 'Scope: March 2023 - October 2023',
      },
      journey: {
        step: '03 / TIME',
        badge: 'Journey',
        title: 'Lifelong Archive',
        desc: 'Turn years of music listening into an enduring personal heritage.',
        items: [
          'Full Listening History (2018-2023)',
          'Timeless Tracks',
          'Discovered Artists Archive',
        ],
        years: ['2019', '2020', '2021', '2022', '2023'],
      },
      playlists: {
        step: '04 / CREATION',
        badge: 'Playlists',
        title: 'Living Playlists',
        desc: 'Forget static playlists; enjoy live mixes adapting dynamically to your routine.',
        items: [
          'Playlists Generated from Weekly Vibes',
          'Mood-Driven Smart Playlists',
          'Live Mixes Auto-Updated from Listening Habits',
        ],
        tag: 'Live Flow',
        liveMeta: 'Adaptive real-time mix',
      },
    },
  },
} as const

interface DepthEcosystemSectionProps {
  lang?: DepthLang
}

export function DepthEcosystemSection({ lang = 'tr' }: DepthEcosystemSectionProps) {
  const c = DEPTH_ECOSYSTEM_COPY[lang]

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
              <ul className={styles.featureList} aria-label={`${c.modules.taste.title} özellikleri`}>
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
              <ul className={styles.featureList} aria-label={`${c.modules.recap.title} özellikleri`}>
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
              <ul className={styles.featureList} aria-label={`${c.modules.journey.title} özellikleri`}>
                {c.modules.journey.items.map((item) => (
                  <li key={item} className={styles.featureItem}>
                    <span className={styles.featureBullet} aria-hidden />
                    <span className={styles.featureText}>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Yıllar Listesi & Detaylar */}
              <div className={styles.cardBottom}>
                <div className={styles.yearsList} aria-label="Arşiv Yılları">
                  {c.modules.journey.years.map((year, idx) => (
                    <span
                      key={year}
                      className={`${styles.yearPill} ${idx === c.modules.journey.years.length - 1 ? styles.yearPillActive : ''}`}
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
              <ul className={styles.featureList} aria-label={`${c.modules.playlists.title} özellikleri`}>
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
