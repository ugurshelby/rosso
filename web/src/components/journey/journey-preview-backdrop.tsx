import React from 'react'
import { Sparkles, Disc, Compass, Play } from 'lucide-react'
import styles from './journey-preview-backdrop.module.css'

const MOCK_COVERS = [
  { title: 'After Hours', artist: 'The Weeknd', year: '2020', gradient: 'linear-gradient(135deg, #e11d48, #4c0519)' },
  { title: 'Midnight City', artist: 'M83', year: '2019', gradient: 'linear-gradient(135deg, #3b82f6, #1e1b4b)' },
  { title: 'Resonance', artist: 'HOME', year: '2021', gradient: 'linear-gradient(135deg, #8b5cf6, #2e1065)' },
  { title: 'Random Access Memories', artist: 'Daft Punk', year: '2018', gradient: 'linear-gradient(135deg, #eab308, #451a03)' },
  { title: 'In Rainbows', artist: 'Radiohead', year: '2022', gradient: 'linear-gradient(135deg, #f97316, #7c2d12)' },
  { title: 'Currents', artist: 'Tame Impala', year: '2023', gradient: 'linear-gradient(135deg, #ec4899, #831843)' },
  { title: 'Melodrama', artist: 'Lorde', year: '2024', gradient: 'linear-gradient(135deg, #06b6d4, #083344)' },
  { title: 'Blonde', artist: 'Frank Ocean', year: '2025', gradient: 'linear-gradient(135deg, #10b981, #064e3b)' },
]

export function JourneyPreviewBackdrop() {
  return (
    <div className={styles.stage}>
      {/* ── Üst Başlık & Dönem Şeridi ── */}
      <header className={styles.header}>
        <div className={styles.topMeta}>
          <span className={styles.eyebrow}>
            <Compass size={13} aria-hidden="true" />
            <span>Musical Journey · A living archive</span>
          </span>
          <span className={styles.yearRange}>2018 — 2026</span>
        </div>
        <h1 className={styles.headline}>Your timeline and the moments it turned</h1>
        <p className={styles.subtext}>
          Eight years of listening, mapped — your rituals and the obsessions each season brought.
        </p>
      </header>

      {/* ── Bölüm Rayı (Chapter Rail) ── */}
      <nav className={styles.chapterRail} aria-hidden="true">
        <span className={`${styles.chapterPill} ${styles.chapterActive}`}>Chapter I: Awakening</span>
        <span className={styles.chapterPill}>Chapter II: Night frequencies</span>
        <span className={styles.chapterPill}>Chapter III: Electronic turn</span>
        <span className={styles.chapterPill}>Chapter IV: Today</span>
      </nav>

      {/* ── Yıllık Sahne & Bento Kapak Grid ── */}
      <section className={styles.yearSection}>
        <div className={styles.yearHeader}>
          <div className={styles.yearBadge}>
            <span className={styles.yearNumber}>2024</span>
            <span className={styles.yearEra}>Turning point</span>
          </div>
          <div className={styles.yearStats}>
            <span>18,420 minutes</span>
            <span>·</span>
            <span>342 artists</span>
          </div>
        </div>

        <div className={styles.coverBento}>
          {MOCK_COVERS.map((item, i) => (
            <div
              key={i}
              className={styles.coverCard}
              style={{ background: item.gradient }}
            >
              <div className={styles.coverOverlay} />
              <Disc size={20} className={styles.discIcon} />
              <div className={styles.coverInfo}>
                <span className={styles.trackTitle}>{item.title}</span>
                <span className={styles.trackArtist}>{item.artist}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Alt Topoloji Şeridi ── */}
      <footer className={styles.topologyBar}>
        <div className={styles.topoItem}>
          <Sparkles size={14} className={styles.topoIcon} />
          <span>Night owl listening ritual</span>
        </div>
        <div className={styles.topoItem}>
          <Play size={14} className={styles.topoIcon} />
          <span>1,240 replay loops</span>
        </div>
      </footer>
    </div>
  )
}
