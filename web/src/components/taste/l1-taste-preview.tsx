import Link from 'next/link'
import Image from 'next/image'
import { Music2 } from 'lucide-react'
import type { LongTermTopTrack } from '@/lib/spotify/long-term-top'
import type { Translator } from '@/lib/i18n/translate'
import styles from './l1-taste-preview.module.css'

interface L1TastePreviewProps {
  tracks: LongTermTopTrack[]
  t: Translator['t']
}

/**
 * §1.14-B: L1 (yalnız Spotify OAuth, hiç ZIP yüklenmemiş) kullanıcısı için
 * gerçek Spotify uzun-vade top-track listesi + "geçmişini yükle" daveti.
 *
 * ⚠ Bu bir TASTE İDDİASI DEĞİL — "elde ne varsa o". Spotify'ın kendi kısa
 * pencereli (~1 yıl) hesabı, Rosso'nun decay/evergreen tür motoruyla ilgisi
 * yok. Bilinçli olarak `IdentityHero`/`GenreDNA` gibi diğer taste
 * bileşenleriyle AYNI görsel dilde değil — net biçimde "bu farklı bir şey"
 * hissettirmesi gerekiyor (spec: "bu kimlik değil, geçmişini yükle").
 */
export function L1TastePreview({ tracks, t }: L1TastePreviewProps) {
  if (tracks.length === 0) return null

  return (
    <section className={styles.section} aria-label={t('taste.l1Preview.ariaLabel')}>
      {/* "Spotify" özel isim + `text-transform: uppercase` + `lang="tr"`
          → `i` yerine `İ` basılıyordu ("SPOTİFY"). Bkz. Ş-30. */}
      <span className={styles.eyebrow}>
        <span lang="en">SPOTIFY</span> · {t('taste.l1Preview.eyebrowSuffix')}
      </span>
      <p className={styles.subtitle}>
        {t('taste.l1Preview.subtitle')}
      </p>
      <ol className={styles.list}>
        {tracks.map((track, index) => (
          <li key={track.id} className={styles.row}>
            <span className={styles.rank} role="img" aria-label={t('taste.l1Preview.rank', { rank: index + 1 })}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {track.imageUrl ? (
              <Image
                src={track.imageUrl}
                alt=""
                width={40}
                height={40}
                className={styles.cover}
              />
            ) : (
              <span className={styles.coverFallback}>
                <Music2 size={16} strokeWidth={1.5} />
              </span>
            )}
            <div className={styles.info}>
              <span className={styles.name}>{track.title}</span>
              <span className={styles.artist}>{track.artist}</span>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/data" className={styles.cta}>
        {t('taste.l1Preview.cta')}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2.5 7h9M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </section>
  )
}
