'use client'

import Image from 'next/image'
import { memo } from 'react'
import {
  Play,
  Heart,
  Moon,
  Sparkles,
  TrendingUp,
  Clock,
  Radio,
  CheckCircle2,
} from 'lucide-react'
import type { Dil } from '@/lib/marketing/dil'
import styles from './living-mockups.module.css'

/* ═══════════════════════════════════════════════════════════════════════════
   LIVING MOCKUPS — Rosso Çift Otoriteli Hibrit Tasarım (Apple + Spotify)
   Vitrin & Reklam Kalitesinde Canlı Ürün Modelleri
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * 1. RECAP LIVING MOCKUP
 * Wrapped benzeri dikey story formatı, çok katmanlı kart destesi (layered stack),
 * story progress segmentleri (- - - -), uykusuz indie ayı vibe başlığı,
 * dinamik blur gradyanı ve köşe istatistik metrikleri.
 */
export const RecapMockup = memo(function RecapMockup({
  accent,
  dil = 'tr',
}: {
  accent: string
  dil?: Dil
}) {
  const metin =
    dil === 'tr'
      ? {
          badge: 'ROSSO RECAP',
          period: 'MAYIS 2026',
          vibeTag: 'VIBE #04 · GECE İNDİE',
          title: 'Uykusuz Indie Ayı',
          subtitle: 'Gece 01:00 – 04:00 arası dinleme zirvesi',
          mins: '4.820 dk',
          genre: '%87 Indie Rock',
          topArtist: '#1 The Strokes',
          repeats: '41× tekrar',
          shareStory: 'Hikayede Paylaşılabilir Kart',
        }
      : {
          badge: 'ROSSO RECAP',
          period: 'MAY 2026',
          vibeTag: 'VIBE #04 · MIDNIGHT INDIE',
          title: 'Sleepless Indie Month',
          subtitle: 'Listening peak between 01:00 – 04:00 AM',
          mins: '4,820 min',
          genre: '87% Indie Rock',
          topArtist: '#1 The Strokes',
          repeats: '41× on repeat',
          shareStory: 'Shareable Story Card',
        }

  return (
    <div
      className={styles.livingShell}
      style={{ ['--mock-accent' as string]: accent }}
      role="region"
      aria-label="Recap Living Mockup"
    >
      <div className={styles.recapContainer}>
        {/* Çok katmanlı arka kartlar (Layered Stack) */}
        <div className={styles.recapStackLayer2} aria-hidden />
        <div className={styles.recapStackLayer1} aria-hidden />

        {/* Ana Dikey Story Kartı */}
        <article className={styles.recapStoryCard}>
          {/* Story Progress Segmentleri (- - - -) */}
          <div className={styles.recapProgressRow} aria-hidden>
            <div className={`${styles.recapProgressBar} ${styles.recapProgressBarActive}`} />
            <div className={`${styles.recapProgressBar} ${styles.recapProgressBarActive}`} />
            <div className={`${styles.recapProgressBar} ${styles.recapProgressBarCurrent}`} />
            <div className={styles.recapProgressBar} />
          </div>

          {/* Story Üst Barı */}
          <header className={styles.recapStoryHeader}>
            <div className={styles.recapBrandBadge}>
              <span className={styles.recapDotPulse} aria-hidden />
              <span>{metin.badge}</span>
            </div>
            <div className={styles.recapPeriodTag}>{metin.period}</div>
          </header>

          {/* Story Vibe Merkezi */}
          <div className={styles.recapVibeCenter}>
            <div className={styles.recapCoverWrap}>
              <Image
                src="/vibe-cards/night-melancholist.webp"
                alt="Night Melancholist Vibe Cover"
                fill
                sizes="(max-width: 768px) 180px, 220px"
                className={styles.recapCoverImage}
                priority
              />
            </div>
            <span className={styles.recapVibeBadge}>{metin.vibeTag}</span>
            <h3 className={styles.recapVibeTitle}>{metin.title}</h3>
            <p className={styles.recapVibeSubtitle}>{metin.subtitle}</p>
          </div>

          {/* Belirgin Dinleme İstatistiği Metrikleri (Köşe & Izgara) */}
          <div className={styles.recapMetricsGrid}>
            <div className={styles.recapMetricPill}>
              <Clock size={13} className={styles.recapMetricIcon} color="#c084fc" />
              <span className={styles.recapMetricText}>{metin.mins}</span>
            </div>
            <div className={styles.recapMetricPill}>
              <TrendingUp size={13} className={styles.recapMetricIcon} color="#a855f7" />
              <span className={styles.recapMetricText}>{metin.genre}</span>
            </div>
            <div className={styles.recapMetricPill}>
              <Sparkles size={13} className={styles.recapMetricIcon} color="#c084fc" />
              <span className={styles.recapMetricText}>{metin.topArtist}</span>
            </div>
            <div className={styles.recapMetricPill}>
              <Radio size={13} className={styles.recapMetricIcon} color="#a855f7" />
              <span className={styles.recapMetricText}>{metin.repeats}</span>
            </div>
          </div>

          {/* Story Alt Çerçevesi */}
          <footer className={styles.recapStoryFooter}>
            <span className={styles.recapStorySticker}>{metin.shareStory}</span>
            <div className={styles.recapEqBars} aria-hidden>
              <span className={styles.recapEqBar} />
              <span className={styles.recapEqBar} />
              <span className={styles.recapEqBar} />
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
})

/**
 * 2. TASTE LIVING MOCKUP
 * Mobilde bile net okunan "Müzik Kişilik Kartı" (Gece Kurdu),
 * Spotify tarzı 24 saatlik dinleme zamanı grafiği (02:00 zirvesi),
 * 3 adet karakteristik tür hapı (#1f1f1f pill) ve sadık sanatçılar.
 */
export const TasteMockup = memo(function TasteMockup({
  accent,
  dil = 'tr',
}: {
  accent: string
  dil?: Dil
}) {
  const metin =
    dil === 'tr'
      ? {
          archetype: 'MÜZİKAL KİMLİK ARKETİPİ',
          score: '%94 Özgünlük',
          title: 'Gece Kurdu',
          moon: '02:00 Zirvesi',
          blurb: 'Günün gürültüsü çekildiğinde uyanan, gece yarısı indie ve lo-fi atmosferinde derinleşen ritüelist dinleyici.',
          traits: ['Gece Odaklanması', 'Melankolik Tınılar', 'Sadık Keşifçi'],
          graphTitle: 'GÜN İÇİ DİNLEME RİTMİ (24 SAAT)',
          peakCallout: '02:00 Zirvesi · 3.4× Yoğunluk',
          genres: [
            { name: 'Post-Punk', pct: '%42', color: '#a855f7' },
            { name: 'Midnight Lo-Fi', pct: '%34', color: '#c084fc' },
            { name: 'Indie Rock', pct: '%24', color: '#7c3aed' },
          ],
        }
      : {
          archetype: 'MUSICAL IDENTITY ARCHETYPE',
          score: '94% Affinity',
          title: 'The Night Owl',
          moon: '02:00 Peak',
          blurb: 'Awakens when the world quietens down; deeply immersed in midnight indie and lo-fi textures.',
          traits: ['Night Focus', 'Melancholic Tones', 'Loyal Explorer'],
          graphTitle: 'DAILY LISTENING RHYTHM (24 HOURS)',
          peakCallout: '02:00 Peak · 3.4× Intensity',
          genres: [
            { name: 'Post-Punk', pct: '42%', color: '#a855f7' },
            { name: 'Midnight Lo-Fi', pct: '34%', color: '#c084fc' },
            { name: 'Indie Rock', pct: '24%', color: '#7c3aed' },
          ],
        }

  // 24 saatlik dinleme dağılımı (00:00 - 23:00, 01:00 - 03:00 belirgin zirve)
  const hourHeights = [
    65, 88, 100, 78, 42, 18, 12, 14, 20, 28, 35, 40,
    42, 38, 35, 38, 45, 52, 58, 62, 70, 75, 80, 72,
  ]

  return (
    <div
      className={styles.livingShell}
      style={{ ['--mock-accent' as string]: accent }}
      role="region"
      aria-label="Taste Living Mockup"
    >
      <div className={styles.tasteContainer}>
        {/* Üst Kimlik Başlığı */}
        <div className={styles.tastePersonalityHeader}>
          <div className={styles.tasteArchetypeEyebrow}>
            <Moon size={12} color="#c084fc" />
            <span>{metin.archetype}</span>
          </div>
          <span className={styles.tasteScoreBadge}>{metin.score}</span>
        </div>

        {/* Merkez: Müzik Kişilik Kartı ("Gece Kurdu") */}
        <section className={styles.tasteHeroBox}>
          <div className={styles.tasteHeroTitleRow}>
            <h3 className={styles.tasteHeroTitle}>{metin.title}</h3>
            <span className={styles.tasteHeroMoonTag}>🌙 {metin.moon}</span>
          </div>
          <p className={styles.tasteHeroBlurb}>{metin.blurb}</p>
          <div className={styles.tasteTraitPills}>
            {metin.traits.map((trait) => (
              <span key={trait} className={styles.tasteTraitPill}>
                {trait}
              </span>
            ))}
          </div>
        </section>

        {/* Alt: Dinleme Zamanı Grafiği (02:00 Zirvesi) */}
        <div className={styles.tasteTimelineBox}>
          <div className={styles.tasteTimelineHead}>
            <span className={styles.tasteTimelineLabel}>{metin.graphTitle}</span>
            <span className={styles.tastePeakCallout}>
              <Sparkles size={11} />
              {metin.peakCallout}
            </span>
          </div>
          <div className={styles.tasteHistoBars} aria-hidden>
            {hourHeights.map((h, i) => {
              const isPeak = i === 2 // 02:00
              const isNight = i === 1 || i === 3
              return (
                <div
                  key={i}
                  className={`${styles.tasteHistoBar} ${isPeak ? styles.tasteHistoBarPeak : ''} ${isNight ? styles.tasteHistoBarNight : ''}`}
                  style={{ height: `${h}%` }}
                  title={`${String(i).padStart(2, '0')}:00`}
                />
              )
            })}
          </div>
          <div className={styles.tasteHistoTimes} aria-hidden>
            <span>00:00</span>
            <span style={{ color: '#c084fc', fontWeight: 700 }}>02:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* 3 Adet Karakteristik Tür Hapı (#1f1f1f pill) */}
        <div className={styles.tasteGenrePillsRow}>
          {metin.genres.map((g) => (
            <div key={g.name} className={styles.tasteGenrePill}>
              <div className={styles.tasteGenrePillLeft}>
                <span
                  className={styles.tasteGenreDot}
                  style={{ backgroundColor: g.color }}
                  aria-hidden
                />
                <span className={styles.tasteGenreName}>{g.name}</span>
              </div>
              <span className={styles.tasteGenrePct}>{g.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

/**
 * 3. JOURNEY LIVING MOCKUP
 * Yıllar arası müzikal değişimi sergileyen yatay bir timeline / film şeridi parçası.
 * 2020 ile 2024 arasındaki tür evrimini gösteren parlayan yüksek kontrastlı hat
 * ve iki büyük albüm kapağının karşılaştırması.
 */
export const JourneyMockup = memo(function JourneyMockup({
  accent,
  dil = 'tr',
}: {
  accent: string
  dil?: Dil
}) {
  const metin =
    dil === 'tr'
      ? {
          year2020: '2020 · İLK KEŞİF',
          era2020: 'Dream Pop & Indie',
          track2020: 'Tame Impala — Currents',
          year2024: '2024 · GÜNCEL DNA',
          era2024: 'Post-Punk & Dark Wave',
          track2024: 'Fontaines D.C. — Romance',
          metrics: '+847 Yeni Sanatçı',
          turningPoints: '142 Kırılma Noktası',
          resistant: 'Zamana Direnen: 18 Şarkı',
          filmStrip: 'ROSSO ÖMÜR BOYU ARŞİV',
        }
      : {
          year2020: '2020 · FIRST DISCOVERY',
          era2020: 'Dream Pop & Indie',
          track2020: 'Tame Impala — Currents',
          year2024: '2024 · CURRENT DNA',
          era2024: 'Post-Punk & Dark Wave',
          track2024: 'Fontaines D.C. — Romance',
          metrics: '+847 New Artists',
          turningPoints: '142 Turning Points',
          resistant: 'Time-Resistant: 18 Tracks',
          filmStrip: 'ROSSO LIFELONG ARCHIVE',
        }

  return (
    <div
      className={styles.livingShell}
      style={{ ['--mock-accent' as string]: accent }}
      role="region"
      aria-label="Journey Living Mockup"
    >
      <div className={styles.journeyContainer}>
        {/* Yıllar Yatay Rayı (Timeline Rail) */}
        <nav className={styles.journeyRailHead} aria-label="Timeline Years">
          <span className={`${styles.journeyRailPill} ${styles.journeyRailPillOrigin}`}>
            2020
          </span>
          <span className={styles.journeyRailPill}>2021</span>
          <span className={styles.journeyRailPill}>2022</span>
          <span className={styles.journeyRailPill}>2023</span>
          <span className={`${styles.journeyRailPill} ${styles.journeyRailPillActive}`}>
            2024
          </span>
        </nav>

        {/* İki Büyük Albüm Kapağının Karşılaştırması ve Parlayan Evrim Çizgisi */}
        <div className={styles.journeyStageRow}>
          {/* 2020 Çağı */}
          <div className={styles.journeyCardCol}>
            <div className={styles.journeyCardCover}>
              <Image
                src="/vibe-cards/twilight-terraced-hills-monolith.webp"
                alt="2020 Origin Era Cover"
                fill
                sizes="(max-width: 768px) 90px, 120px"
                className={styles.recapCoverImage}
              />
            </div>
            <span className={styles.journeyCardYearTag}>{metin.year2020}</span>
            <p className={styles.journeyCardEra}>{metin.era2020}</p>
            <span className={styles.journeyCardTrack}>{metin.track2020}</span>
          </div>

          {/* Parlayan Evrim Hattı (Center Glowing Conduit) */}
          <div className={styles.journeyCenterConduit}>
            <div className={styles.journeyGlowSparkline} aria-hidden>
              <span className={styles.journeySparklineDot} />
            </div>
            <div className={styles.journeyMetricsBadge}>
              <span className={styles.journeyMetricText}>{metin.metrics}</span>
              <span className={styles.journeyMetricSub}>{metin.turningPoints}</span>
            </div>
          </div>

          {/* 2024 Çağı */}
          <div className={styles.journeyCardCol}>
            <div className={styles.journeyCardCover}>
              <Image
                src="/vibe-cards/stormbearer.webp"
                alt="2024 Current Era Cover"
                fill
                sizes="(max-width: 768px) 90px, 120px"
                className={styles.recapCoverImage}
              />
            </div>
            <span className={styles.journeyCardYearTag}>{metin.year2024}</span>
            <p className={styles.journeyCardEra}>{metin.era2024}</p>
            <span className={styles.journeyCardTrack}>{metin.track2024}</span>
          </div>
        </div>

        {/* Film Şeridi Perforasyonu & Zamana Direnenler */}
        <footer className={styles.journeyFilmStripFooter}>
          <div className={styles.journeyStripHoles} aria-hidden>
            <span className={styles.journeyStripHole} />
            <span className={styles.journeyStripHole} />
            <span className={styles.journeyStripHole} />
            <span className={styles.journeyStripHole} />
          </div>
          <span className={styles.journeyFooterTag}>{metin.resistant}</span>
          <div className={styles.journeyStripHoles} aria-hidden>
            <span className={styles.journeyStripHole} />
            <span className={styles.journeyStripHole} />
            <span className={styles.journeyStripHole} />
            <span className={styles.journeyStripHole} />
          </div>
        </footer>
      </div>
    </div>
  )
})

/**
 * 4. PLAYLISTS LIVING MOCKUP
 * Tam bir Spotify tracklist ergonomisi: 1:1 kare canlı kapak (radius: 6px, box-shadow: 0 8px 24px rgba(0,0,0,0.5)),
 * hover anında play ikonuna dönüşen indeks numarası, 40px cover kareleri,
 * net şarkı/sanatçı hiyerarşisi ve sağ altta hafif mor ışıltılı specular cam katmanı (backdrop-filter: blur(20px)).
 */
export const PlaylistsMockup = memo(function PlaylistsMockup({
  accent,
  dil = 'tr',
}: {
  accent: string
  dil?: Dil
}) {
  const metin =
    dil === 'tr'
      ? {
          type: 'ÇALMA LİSTESİ',
          title: 'Gece Sürüşü & Melankoli',
          desc: 'Rosso dinamik kürasyon · Geçmişinden 34 parça',
          synced: 'Spotify ile Eşitlendi',
          headerTitle: 'BAŞLIK',
          headerAlbum: 'ALBÜM',
          headerDuration: 'SÜRE',
        }
      : {
          type: 'PLAYLIST',
          title: 'Midnight Drive & Melancholy',
          desc: 'Rosso dynamic curation · 34 tracks from your history',
          synced: 'Synced to Spotify',
          headerTitle: 'TITLE',
          headerAlbum: 'ALBUM',
          headerDuration: 'TIME',
        }

  const tracks = [
    {
      rank: 1,
      isPlaying: true,
      title: 'Starburster',
      artist: 'Fontaines D.C.',
      album: 'Romance',
      duration: '3:41',
      cover: '/vibe-cards/stormbearer.webp',
    },
    {
      rank: 2,
      isPlaying: false,
      title: 'Reptilia',
      artist: 'The Strokes',
      album: 'Room on Fire',
      duration: '3:39',
      cover: '/vibe-cards/cloud-spiral-staircase.webp',
    },
    {
      rank: 3,
      isPlaying: false,
      title: 'Komet',
      artist: 'Mor Ve Ötesi',
      album: 'Dünya Yalan Söylüyor',
      duration: '4:12',
      cover: '/vibe-cards/purple-flower-red-background.webp',
    },
  ]

  return (
    <div
      className={styles.livingShell}
      style={{ ['--mock-accent' as string]: accent }}
      role="region"
      aria-label="Playlists Living Mockup"
    >
      <div className={styles.playlistsContainer}>
        {/* Çalma Listesi Başlık Alanı */}
        <header className={styles.playlistHeroHeader}>
          {/* 1:1 Kare Kapak (6px radius) */}
          <div className={styles.playlistSquareCover}>
            <Image
              src="/vibe-cards/pastel-valley-river-blossoms.webp"
              alt="Playlist Cover"
              fill
              sizes="(max-width: 768px) 80px, 100px"
              className={styles.recapCoverImage}
              priority
            />
          </div>

          <div className={styles.playlistHeroMeta}>
            <span className={styles.playlistTypePill}>{metin.type}</span>
            <h3 className={styles.playlistHeroTitle}>{metin.title}</h3>
            <p className={styles.playlistHeroSub}>{metin.desc}</p>
            <div className={styles.playlistActionRow}>
              {/* Spotify Cerrahi Yeşil Play Dairesi */}
              <div className={styles.spotifyPlayCircle} aria-label="Play" role="button">
                <Play size={15} fill="#000000" stroke="#000000" />
              </div>
              <Heart size={18} className={styles.spotifyHeartBtn} fill="#1ed760" />
            </div>
          </div>
        </header>

        {/* Spotify Şarkı Tablosu Ergonomisi */}
        <div className={styles.trackTable} role="table" aria-label="Playlist Tracks">
          <div className={styles.trackTableHeader} role="row" aria-hidden>
            <span>#</span>
            <span />
            <span>{metin.headerTitle}</span>
            <span style={{ textAlign: 'right' }}>{metin.headerDuration}</span>
          </div>

          {tracks.map((track) => (
            <div
              key={track.rank}
              className={`${styles.trackRow} ${track.isPlaying ? styles.trackRowActive : ''}`}
              role="row"
            >
              {/* İndeks / Hover Play Swap */}
              <div className={styles.trackIndexSwap}>
                {track.isPlaying ? (
                  <div className={styles.recapEqBars} aria-hidden>
                    <span className={styles.recapEqBar} style={{ background: '#1ed760' }} />
                    <span className={styles.recapEqBar} style={{ background: '#1ed760' }} />
                    <span className={styles.recapEqBar} style={{ background: '#1ed760' }} />
                  </div>
                ) : (
                  <>
                    <span className={styles.trackNumberDefault}>
                      {String(track.rank).padStart(2, '0')}
                    </span>
                    <Play size={13} fill="#ffffff" className={styles.trackPlayIconHover} />
                  </>
                )}
              </div>

              {/* 40px Cover */}
              <div className={styles.trackThumb40}>
                <Image
                  src={track.cover}
                  alt={track.title}
                  fill
                  sizes="40px"
                  className={styles.recapCoverImage}
                />
              </div>

              {/* Başlık & Sanatçı */}
              <div className={styles.trackDetails}>
                <span
                  className={`${styles.trackTitle} ${track.isPlaying ? styles.trackTitlePlaying : ''}`}
                >
                  {track.title}
                </span>
                <span className={styles.trackArtist}>{track.artist}</span>
              </div>

              {/* Süre */}
              <span className={styles.trackDuration}>{track.duration}</span>
            </div>
          ))}
        </div>

        {/* Sağ Altta Mor Işıltılı Specular Cam Katmanı (Frosted Panel) */}
        <div className={styles.playlistSpecularGlass}>
          <span className={styles.playlistGlassDot} aria-hidden />
          <span className={styles.playlistGlassText}>
            <CheckCircle2 size={13} color="#c084fc" style={{ display: 'inline', marginRight: 4 }} />
            {metin.synced}
          </span>
        </div>
      </div>
    </div>
  )
})
