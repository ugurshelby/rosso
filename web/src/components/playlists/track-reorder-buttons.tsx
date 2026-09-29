'use client'

import { useState, useTransition } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/provider'
import styles from './playlist-detail.module.css'

interface TrackReorderButtonsProps {
  playlistId: string
  position: number
  trackTitle: string
  isFirst: boolean
  isLast: boolean
}

/**
 * Şarkı sıralaması — yukarı/aşağı ok (Sahip, 2026-08-11: sürükle-bırak
 * yerine — mobil dokunmatikte daha zor, ok erişilebilirlik açısından daha
 * basit). `/api/playlists/[id]/reorder`'a POST atar, o hem Spotify'a
 * (PUT reorder) hem `playlist_tracks.position`'a yazar.
 *
 * İyimser DEĞİL: Spotify çağrısı başarısız olursa gerçek sıra değişmemiş
 * olur, ama sayfa `router.refresh()`'ten önce yanlış sırayı gösterirdi —
 * mood-workspace.tsx'teki "çıkar" gibi geri alınabilir değil, tek yönlü bir
 * yazma. Bu yüzden yanıtı bekleyip SONRA yeniliyoruz.
 */
export function TrackReorderButtons({
  playlistId,
  position,
  trackTitle,
  isFirst,
  isLast,
}: TrackReorderButtonsProps) {
  const router = useRouter()
  const { t } = useT()
  const [hata, setHata] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function move(direction: 'up' | 'down') {
    setHata(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/playlists/${playlistId}/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position, direction }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setHata(data?.error ?? t('playlists.reorder.errorMove'))
          return
        }
        router.refresh()
      } catch {
        setHata(t('playlists.reorder.errorConnection'))
      }
    })
  }

  return (
    <div className={styles.reorderButtons}>
      <button
        type="button"
        className={styles.reorderButton}
        onClick={() => move('up')}
        disabled={isFirst || pending}
        aria-label={t('playlists.reorder.moveUp', { title: trackTitle })}
        title={hata ?? undefined}
      >
        <ChevronUp size={14} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.reorderButton}
        onClick={() => move('down')}
        disabled={isLast || pending}
        aria-label={t('playlists.reorder.moveDown', { title: trackTitle })}
        title={hata ?? undefined}
      >
        <ChevronDown size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
