'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Mic2,
  Disc3,
  Disc,
  ExternalLink,
  Star,
  Play,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react'
import styles from '@/components/catalog/catalog-detail.module.css'
import {
  ListeningStats,
  ListeningTimeline,
  RelationshipBanner,
  AlbumTracklistTable,
  DiscoveredAlbumsGrid,
} from '@/components/catalog/listening-stats'

const NF = new Intl.NumberFormat('en-US')

const mockArtist = {
  name: 'M83',
  genres: ['synthpop', 'shoegaze', 'indie electronic', 'dream pop', 'ambient'],
  imageUrl: null,
  playCount: 1420,
  totalMinutes: 6380,
  trackCount: 38,
  firstPlayed: '15 Şubat 2021',
  lastPlayed: '28 Ağustos 2026',
  activeMonths: 42,
  archetype: 'core_pillar' as const,
  archetypeLabel: 'Kök Sütun',
  topTracks: [
    { trackId: 't1', title: 'Midnight City', playCount: 412, minutes: 1650 },
    { trackId: 't2', title: 'Wait', playCount: 280, minutes: 1540 },
    { trackId: 't3', title: 'Outro', playCount: 215, minutes: 860 },
    { trackId: 't4', title: 'Reunion', playCount: 168, minutes: 640 },
    { trackId: 't5', title: 'My Tears Are Becoming a Sea', playCount: 124, minutes: 370 },
    { trackId: 't6', title: 'Kim & Jessie', playCount: 96, minutes: 410 },
    { trackId: 't7', title: 'Intro', playCount: 82, minutes: 420 },
    { trackId: 't8', title: 'We Own the Sky', playCount: 74, minutes: 370 },
    { trackId: 't9', title: 'Steve McQueen', playCount: 65, minutes: 260 },
    { trackId: 't10', title: 'Lower Your Eyelids to Die with the Sun', playCount: 48, minutes: 480 },
  ],
  albums: [
    {
      name: "Hurry Up, We're Dreaming",
      artist: 'M83',
      imageUrl: null,
      trackCount: 22,
      userPlayCount: 1140,
      userTotalMinutes: 4820,
      completionRate: 86,
    },
    {
      name: 'Saturdays = Youth',
      artist: 'M83',
      imageUrl: null,
      trackCount: 11,
      userPlayCount: 210,
      userTotalMinutes: 980,
      completionRate: 64,
    },
    {
      name: 'Before the Dawn Heals Us',
      artist: 'M83',
      imageUrl: null,
      trackCount: 15,
      userPlayCount: 70,
      userTotalMinutes: 340,
      completionRate: 40,
    },
  ],
}

const mockTrack = {
  id: 't1',
  title: 'Midnight City',
  artists: ['M83'],
  genres: ['synthpop', 'indie electronic'],
  album: "Hurry Up, We're Dreaming",
  imageUrl: null,
  spotifyId: '6GyFP1nfCDB8Jyik2z8Fu8',
  playCount: 412,
  totalMinutes: 1650,
  firstPlayed: '15 Şubat 2021',
  lastPlayed: '28 Ağustos 2026',
  activeMonths: 42,
  playlistCount: 5,
  isTalisman: true,
  skipRate: 0,
  circadianCentroid: '23:24',
  circadianTag: 'Nocturnal Pulse',
  timeline: [
    { month: '2023-01-01', plays: 18, bucket_type: 'month' as const },
    { month: '2023-04-01', plays: 32, bucket_type: 'month' as const },
    { month: '2023-08-01', plays: 54, bucket_type: 'month' as const },
    { month: '2023-12-01', plays: 28, bucket_type: 'month' as const },
    { month: '2024-03-01', plays: 64, bucket_type: 'month' as const },
    { month: '2024-07-01', plays: 45, bucket_type: 'month' as const },
    { month: '2024-11-01', plays: 38, bucket_type: 'month' as const },
    { month: '2025-02-01', plays: 72, bucket_type: 'month' as const },
    { month: '2025-06-01', plays: 35, bucket_type: 'month' as const },
    { month: '2025-10-01', plays: 26, bucket_type: 'month' as const },
  ],
}

const mockAlbum = {
  name: "Hurry Up, We're Dreaming",
  artist: 'M83',
  genres: ['synthpop', 'dream pop', 'shoegaze'],
  imageUrl: null,
  releaseYear: 2011,
  playCount: 1140,
  totalMinutes: 4820,
  trackCount: 22,
  firstPlayed: '15 Şubat 2021',
  lastPlayed: '28 Ağustos 2026',
  completionRate: 86,
  dominantTrack: { id: 't1', title: 'Midnight City', playCount: 412 },
  deepCut: { id: 't5', title: 'Wait', playCount: 280 },
  tracks: [
    { id: 'ab1', number: 1, title: 'Intro', playCount: 82, minutes: 5, durationMs: 322000, durationFormatted: '5:22', isTalisman: false },
    { id: 'ab2', number: 2, title: 'Midnight City', playCount: 412, minutes: 4, durationMs: 243000, durationFormatted: '4:03', isTalisman: true },
    { id: 'ab3', number: 3, title: 'Reunion', playCount: 168, minutes: 4, durationMs: 235000, durationFormatted: '3:55', isTalisman: false },
    { id: 'ab4', number: 4, title: 'Where the Boats Go', playCount: 42, minutes: 2, durationMs: 106000, durationFormatted: '1:46', isTalisman: false },
    { id: 'ab5', number: 5, title: 'Wait', playCount: 280, minutes: 6, durationMs: 343000, durationFormatted: '5:43', isTalisman: true },
    { id: 'ab6', number: 6, title: 'Raconte-moi une histoire', playCount: 38, minutes: 4, durationMs: 244000, durationFormatted: '4:04', isTalisman: false },
    { id: 'ab7', number: 7, title: 'Train to Sichuan', playCount: 22, minutes: 2, durationMs: 105000, durationFormatted: '1:45', isTalisman: false },
    { id: 'ab8', number: 8, title: 'Claudia Lewis', playCount: 64, minutes: 5, durationMs: 271000, durationFormatted: '4:31', isTalisman: false },
    { id: 'ab9', number: 9, title: 'This Bright Flash', playCount: 31, minutes: 2, durationMs: 143000, durationFormatted: '2:23', isTalisman: false },
    { id: 'ab10', number: 10, title: 'Massive M83', playCount: 24, minutes: 4, durationMs: 248000, durationFormatted: '4:08', isTalisman: false },
    { id: 'ab11', number: 11, title: 'New Map', playCount: 58, minutes: 4, durationMs: 262000, durationFormatted: '4:22', isTalisman: false },
    { id: 'ab12', number: 12, title: 'OK Pal', playCount: 44, minutes: 4, durationMs: 238000, durationFormatted: '3:58', isTalisman: false },
    { id: 'ab13', number: 13, title: 'Soon, My Friend', playCount: 29, minutes: 3, durationMs: 189000, durationFormatted: '3:09', isTalisman: false },
    { id: 'ab14', number: 14, title: 'My Tears Are Becoming a Sea', playCount: 124, minutes: 3, durationMs: 151000, durationFormatted: '2:31', isTalisman: false },
    { id: 'ab15', number: 15, title: 'Outro', playCount: 215, minutes: 4, durationMs: 247000, durationFormatted: '4:07', isTalisman: true },
  ],
}

export default function PreviewCatalogPage() {
  const [activeTab, setActiveTab] = useState<'artist' | 'track' | 'album'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab === 'artist' || tab === 'track' || tab === 'album') {
        return tab
      }
    }
    return 'artist'
  })

  return (
    <div style={{ minHeight: '100vh', background: '#090812', color: '#f3f4f6', padding: '16px' }}>
      {/* Top Switcher */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: '999px',
          maxWidth: '440px',
          margin: '0 auto 24px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        <button
          onClick={() => setActiveTab('artist')}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'artist' ? '#785af0' : 'transparent',
            color: activeTab === 'artist' ? '#fff' : 'rgba(255,255,255,0.6)',
            transition: 'all 0.2s ease',
          }}
        >
          🎤 Sanatçı
        </button>
        <button
          onClick={() => setActiveTab('track')}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'track' ? '#785af0' : 'transparent',
            color: activeTab === 'track' ? '#fff' : 'rgba(255,255,255,0.6)',
            transition: 'all 0.2s ease',
          }}
        >
          🎵 Şarkı
        </button>
        <button
          onClick={() => setActiveTab('album')}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            background: activeTab === 'album' ? '#785af0' : 'transparent',
            color: activeTab === 'album' ? '#fff' : 'rgba(255,255,255,0.6)',
            transition: 'all 0.2s ease',
          }}
        >
          💿 Albüm
        </button>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* ── ARTIST VIEW ── */}
        {activeTab === 'artist' && (
          <div className={styles.page}>
            <div className={styles.ambientBloom} aria-hidden />

            <header className={styles.hero}>
              <div className={styles.artContainer}>
                <div
                  className={`${styles.heroArt} ${styles.heroArtRound}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #3d2b69 0%, #171128 100%)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <Mic2 size={56} strokeWidth={1.5} />
                </div>
              </div>
              <div className={styles.heroText}>
                <span className={styles.heroKindBadge}>Sanatçı</span>
                <h1 className={styles.heroTitle}>{mockArtist.name}</h1>
                <p className={styles.heroSub}>
                  <span>{NF.format(mockArtist.playCount)} dinleme</span>
                  <span>·</span>
                  <span>{NF.format(mockArtist.trackCount)} şarkı</span>
                  <span>·</span>
                  <span>{mockArtist.activeMonths} aktif ay</span>
                </p>
              </div>
            </header>

            <div className={styles.actions}>
              <a href="#" className={styles.actionPrimary}>
                <ExternalLink size={16} strokeWidth={2} aria-hidden />
                Spotify&apos;da Dinle
              </a>
              <div className={styles.genreRow}>
                {mockArtist.genres.map((g) => (
                  <span className={styles.genreChip} key={g}>
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <RelationshipBanner
              kind="artist"
              title="Sanatçıyla Bağlantın"
              description={`${mockArtist.activeMonths} aydır müzik evreninin vazgeçilmez bir parçası · Toplam 106s 20dk dinleme.`}
              badgeLabel={mockArtist.archetypeLabel}
              badgeTone="gold"
            />

            <ListeningStats
              stats={[
                { label: 'Kez Dinledin', value: NF.format(mockArtist.playCount), icon: 'play' },
                { label: 'Toplam Süre', value: '106s 20dk', icon: 'clock' },
                { label: 'Farklı Şarkı', value: NF.format(mockArtist.trackCount), icon: 'disc' },
                { label: 'İlk Keşif', value: mockArtist.firstPlayed, icon: 'calendar' },
              ]}
            />

            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionEyebrow}>Kişisel Zirve</span>
              En Çok Dinlenen Şarkılar
            </h2>
            <div className={styles.insetGroupContainer}>
              <div className={styles.trackList}>
                {mockArtist.topTracks.map((t, i) => (
                  <div className={styles.trackRow} key={t.trackId}>
                    <span className={styles.trackRank}>{String(i + 1).padStart(2, '0')}</span>
                    <div
                      className={styles.trackThumb}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <Disc3 size={18} strokeWidth={1.5} />
                    </div>
                    <div className={styles.trackMetaCol}>
                      <span className={styles.trackName}>{t.title}</span>
                      <span className={styles.trackSubDetails}>
                        {Math.floor(t.minutes / 60)}s {t.minutes % 60}dk
                      </span>
                    </div>
                    <div className={styles.trackPlaysCol}>
                      <span className={styles.trackPlays}>{NF.format(t.playCount)} kez</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionEyebrow}>Diskografi</span>
              Keşfettiğin Albümler
            </h2>
            <DiscoveredAlbumsGrid albums={mockArtist.albums} />
          </div>
        )}

        {/* ── TRACK VIEW ── */}
        {activeTab === 'track' && (
          <div className={styles.page}>
            <div className={styles.ambientBloom} aria-hidden />

            <header className={styles.hero}>
              <div className={styles.artContainer}>
                <div
                  className={styles.heroArt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1c2b5e 0%, #0d152e 100%)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <Disc3 size={56} strokeWidth={1.5} />
                </div>
              </div>
              <div className={styles.heroText}>
                <span className={styles.heroKindBadge}>Şarkı</span>
                <h1 className={styles.heroTitle}>{mockTrack.title}</h1>
                <p className={styles.heroSub}>
                  <a href="#" className={styles.heroSubLink}>
                    {mockTrack.artists.join(', ')}
                  </a>
                  <span>·</span>
                  <a href="#" className={styles.heroSubLink}>
                    {mockTrack.album}
                  </a>
                </p>
              </div>
            </header>

            <div className={styles.actions}>
              <a href="#" className={styles.actionPrimary}>
                <ExternalLink size={16} strokeWidth={2} aria-hidden />
                Spotify&apos;da Dinle
              </a>
              <div className={styles.genreRow}>
                {mockTrack.genres.map((g) => (
                  <span className={styles.genreChip} key={g}>
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <RelationshipBanner
              kind="track"
              title="Kişisel Tılsımın"
              description="Bu şarkıyı neredeyse hiç atlamıyorsun (%0 skip) · Kusursuz odaklanma ve aidiyet."
              badgeLabel="★ Tılsım Şarkı"
              badgeTone="gold"
            />

            <ListeningStats
              stats={[
                { label: 'Kez Dinledin', value: NF.format(mockTrack.playCount), icon: 'play' },
                { label: 'Toplam Süre', value: '27s 30dk', icon: 'clock' },
                { label: 'İlk Keşif', value: mockTrack.firstPlayed, icon: 'calendar' },
                { label: 'Playlist’inde', value: `${mockTrack.playlistCount} liste`, icon: 'disc' },
              ]}
            />

            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionEyebrow}>Zaman İçindeki Akış</span>
              Dinleme Ritmin
            </h2>
            <ListeningTimeline points={mockTrack.timeline} />
          </div>
        )}

        {/* ── ALBUM VIEW ── */}
        {activeTab === 'album' && (
          <div className={styles.page}>
            <div className={styles.ambientBloom} aria-hidden />

            <header className={styles.hero}>
              <div className={styles.artContainer}>
                <div
                  className={styles.heroArt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #572b38 0%, #201018 100%)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <Disc size={64} strokeWidth={1.2} />
                </div>
              </div>
              <div className={styles.heroText}>
                <span className={styles.heroKindBadge}>Albüm</span>
                <h1 className={styles.heroTitle}>{mockAlbum.name}</h1>
                <p className={styles.heroSub}>
                  <a href="#" className={styles.heroSubLink}>
                    {mockAlbum.artist}
                  </a>
                  <span>·</span>
                  <span>{mockAlbum.releaseYear}</span>
                  <span>·</span>
                  <span>{mockAlbum.trackCount} şarkı</span>
                  <span>·</span>
                  <span>80s 20dk</span>
                </p>
              </div>
            </header>

            <div className={styles.actions}>
              <a href="#" className={styles.actionPrimary}>
                <ExternalLink size={16} strokeWidth={2} aria-hidden />
                Spotify&apos;da Dinle
              </a>
              <div className={styles.genreRow}>
                {mockAlbum.genres.map((g) => (
                  <span className={styles.genreChip} key={g}>
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <RelationshipBanner
              kind="album"
              title="Eksiksiz Bir Anlatı"
              description="Albümün parçalarını tek tek ayırmadan bütünsel bir yapıt olarak deneyimledin · %86 dinleme oranı."
              badgeLabel="★ Tam Albüm Deneyimi"
              badgeTone="gold"
            />

            <ListeningStats
              stats={[
                { label: 'Kez Dinledin', value: NF.format(mockAlbum.playCount), icon: 'play' },
                { label: 'Toplam Süre', value: '80s 20dk', icon: 'clock' },
                { label: 'Tamamlama Oranı', value: `%${mockAlbum.completionRate}`, icon: 'award' },
                { label: 'İlk Keşif', value: mockAlbum.firstPlayed, icon: 'calendar' },
              ]}
            />

            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionEyebrow}>Parça Listesi</span>
              Kişisel Dinleme Geçmişi
            </h2>
            <AlbumTracklistTable tracks={mockAlbum.tracks} albumImageUrl={mockAlbum.imageUrl} />
          </div>
        )}
      </main>
    </div>
  )
}
