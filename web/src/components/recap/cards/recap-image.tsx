'use client'

import { useState } from 'react'
import { sizedUrl } from '@/lib/images/sized-url'

/**
 * KATMAN 6 (2026-07-25): recap kartlarında ham `<img src={image_url}>` kullanılıyordu
 * — `image_url` null'a düşünce veya URL kırıkken tarayıcının "kırık görsel" ikonu
 * çıkıyordu (bug raporu: placeholder/asset mismatch). Bu sarmalayıcı:
 *   - src yoksa → sessiz fallback (kırık ikon yok)
 *   - yükleme hatasında (onError) → fallback'e düşer
 * ID-tabanlı kesin eşleme zaten payload'da (spotify_id ile donmuş image_url);
 * bu bileşen o eşleşme boş/kırık olduğunda kullanıcıya bozuk kare göstermez.
 */
interface RecapImageProps {
  src: string | null | undefined
  alt?: string
  className?: string
  /** Görsel yoksa/kırıksa gösterilecek (varsayılan: nötr placeholder kutusu). */
  fallback?: React.ReactNode
  /**
   * En geniş gösterim boyutu (CSS px). 2026-09-24 performans denetimi:
   * donmuş `image_url`'ler 640 px orijinal olarak iniyordu (HAR: recap
   * destesi 12 Storage görseli = 1,3 MB). `sizedUrl` ile boyutlanır.
   */
  size?: number
}

export function RecapImage({ src, alt = '', className, fallback, size = 200 }: RecapImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <>{fallback ?? <span className={className} aria-hidden data-recap-img-fallback />}</>
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sizedUrl(src, size)}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
