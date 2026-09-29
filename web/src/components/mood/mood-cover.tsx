import Image from 'next/image'
import type { MoodKey } from '@/lib/analytics/mood'
import { moodCoverSrc } from '@/lib/analytics/mood-cover-art'

/**
 * Mood kapakları — GERÇEK sanat eseri (2026-08-11, Sahip: "svg görselleri
 * yerine vibe görselleri kullanılsın"). Önceki hâl `dangerouslySetInnerHTML`
 * ile üretilmiş SVG basıyordu (`mood-cover-svg.ts`, artık kullanılmıyor).
 *
 * `sizes` iki çağrı yeri için: kart ızgarası (~300px kap) ve hero (~240px).
 * `priority` yalnız hero'ya verilir — kart ızgarasında 7 kapak birden LCP
 * yarışına girmez (Rosso'nun LCP dersi: her yere priority = hiçbir yerde
 * öncelik, bkz. vibe-card-art.tsx).
 */

interface MoodCoverProps {
  moodKey: MoodKey
  /** kare kenar (px). Kart ~300, hero ~224. */
  size?: number
  className?: string
  priority?: boolean
}

export function MoodCover({ moodKey, size = 300, className, priority = false }: MoodCoverProps) {
  return (
    <Image
      src={moodCoverSrc(moodKey)}
      alt=""
      aria-hidden
      fill
      className={className}
      style={{ objectFit: 'cover' }}
      priority={priority}
      sizes={`${size}px`}
    />
  )
}
