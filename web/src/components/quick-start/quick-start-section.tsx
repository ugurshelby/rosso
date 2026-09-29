'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Link2, Upload, ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { animasyonGorulduIsaretle } from '@/lib/quick-start/actions'
import type { QuickStartDurumu } from '@/lib/quick-start/durum'
import type { QuickStartAdimAdi } from '@/lib/quick-start/anahtarlar'
import styles from './quick-start.module.css'

interface QuickStartSectionProps {
  durum: QuickStartDurumu
}

export function QuickStartSection({ durum }: QuickStartSectionProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [dissolvingCards, setDissolvingCards] = useState<Record<string, boolean>>({})
  const [sectionDissolved, setSectionDissolved] = useState(false)

  // Zamanlayıcılar ve "zaten planlandı" kaydı ref'te tutulur: `router.refresh()`
  // ile `durum` yenilense de bekleyen zamanlayıcı iptal olmaz, aynı adım iki kez
  // planlanmaz. Yalnız bileşen kalkarken temizlenir.
  const planlanan = useRef<Set<string>>(new Set())
  const zamanlayicilar = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const timers = zamanlayicilar.current
    return () => timers.forEach(clearTimeout)
  }, [])

  // Animasyon bekleyen kartları çöz
  useEffect(() => {
    const yeni = durum.adimlar.filter(
      (adim) => adim.animasyonBekliyor && !planlanan.current.has(adim.adim),
    )
    if (yeni.length === 0) return

    for (const adim of yeni) {
      planlanan.current.add(adim.adim)
      // Kartı çözülmeye başlat
      setDissolvingCards((prev) => ({ ...prev, [adim.adim]: true }))

      // Animasyon bitince sunucuya kaydet
      zamanlayicilar.current.push(
        setTimeout(() => {
          startTransition(async () => {
            try {
              await animasyonGorulduIsaretle([`qs:${adim.adim}` as const])
              if (durum.bolumCozulsun) {
                setSectionDissolved(true)
              }
              router.refresh()
            } catch (err) {
              console.error('[QuickStart] Animasyon kaydedilemedi:', err)
            }
          })
        }, 600),
      )
    }
  }, [durum, router])

  // Bölüm görünür değilse veya çözülüp gizlendiyse render etme
  // (⚠ hook'lardan SONRA: erken dönüş hook sırasını bozmasın)
  if (!durum.bolumGorunur || sectionDissolved) {
    return null
  }

  const renderCard = (adimAdi: QuickStartAdimAdi) => {
    const adimState = durum.adimlar.find((a) => a.adim === adimAdi)
    const isDissolving = dissolvingCards[adimAdi]

    if (adimAdi === 'spotify') {
      return (
        <Link
          key="spotify"
          href="/data"
          prefetch={false}
          className={cn(styles.card, isDissolving && styles.cardDissolving)}
          aria-label="Connect Spotify"
        >
          <div className={styles.cardTop}>
            <div className={styles.iconWrap}>
              <Link2 size={20} strokeWidth={1.8} aria-hidden />
            </div>
            {adimState?.tamam ? (
              <span className={styles.statusBadge}>
                <CheckCircle2 size={12} aria-hidden /> Connected
              </span>
            ) : (
              <ArrowRight size={16} className={styles.cardArrow} aria-hidden />
            )}
          </div>
          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>Connect Spotify</h3>
            <p className={styles.cardDesc}>
              Link your Spotify account to sync your playlists and real-time listening stream.
            </p>
          </div>
        </Link>
      )
    }

    if (adimAdi === 'zip') {
      const { tamamlanan, toplam, yukleniyor } = durum.zip
      let zipText = 'Upload your Spotify Streaming History file to uncover your listening journey and habits.'
      if (yukleniyor) {
        zipText = 'Your Spotify files are currently being analyzed by the processing pipeline.'
      } else if (tamamlanan === 1) {
        zipText = 'Streaming History active! Upload Account Data & Technical Log for full lifetime history.'
      } else if (tamamlanan === 2) {
        zipText = 'Almost there! Upload the remaining file to complete your lifetime statistics.'
      } else if (tamamlanan === 3) {
        zipText = 'All Spotify archives processed! Your full music history is unlocked.'
      }

      const progressPercent = Math.round((tamamlanan / toplam) * 100)

      return (
        <Link
          key="zip"
          href="/data"
          prefetch={false}
          className={cn(styles.card, isDissolving && styles.cardDissolving)}
          aria-label="Upload music history"
        >
          <div className={styles.cardTop}>
            <div className={styles.iconWrap}>
              <Upload size={20} strokeWidth={1.8} aria-hidden />
            </div>
            {tamamlanan === 3 ? (
              <span className={styles.statusBadge}>
                <CheckCircle2 size={12} aria-hidden /> 3/3 Unlocked
              </span>
            ) : (
              <ArrowRight size={16} className={styles.cardArrow} aria-hidden />
            )}
          </div>
          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>Upload music history</h3>
            <p className={styles.cardDesc}>{zipText}</p>
            <div className={styles.progressWrap}>
              <div className={styles.progressHeader}>
                <span>Lifetime archive</span>
                <span>{tamamlanan}/{toplam} files</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </Link>
      )
    }

    return null
  }

  const remainingCount = durum.gorunurKartlar.length

  return (
    <section
      className={cn(
        styles.section,
        durum.bolumCozulsun && styles.sectionDissolving,
      )}
      aria-labelledby="quick-start-title"
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.eyebrow}>Getting Started</span>
          <h2 id="quick-start-title" className={styles.title}>
            Quick Start
          </h2>
        </div>
        <div className={styles.counterBadge}>
          <span>{remainingCount} steps remaining</span>
        </div>
      </header>

      <div className={styles.grid}>
        {durum.gorunurKartlar.map((kartAdi) => renderCard(kartAdi))}
      </div>
    </section>
  )
}
