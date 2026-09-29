import { Disc3 } from 'lucide-react'
import { CoverArt } from '@/components/media/cover-art'

interface TrackThumbProps {
  /** Rosso track id — görsel runtime proxy'den lazy çekilir (ToS-uyumlu). */
  trackId: string
  /** Kapak yoksa deterministik gradyan üretilir (dashboard-design.md §3.7). */
  title?: string
  artist?: string
}

export function TrackThumb({ trackId, title, artist }: TrackThumbProps) {
  return (
    <CoverArt
      kind="track"
      id={trackId}
      // 96 = 48px kapağın 2x'i (retina). Tam boyut istemek bulanıklığı önler.
      size={96}
      alt=""
      fallbackTitle={title}
      fallbackSubtitle={artist}
      fallback={<Disc3 size={20} strokeWidth={1.5} />}
    />
  )
}
