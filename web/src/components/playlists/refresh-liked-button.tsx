'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { refreshLikedSongs } from '@/lib/library/like-action'
import { formatWaitLabel } from '@/lib/platform/format-wait-label'
import { useT } from '@/lib/i18n/provider'
import styles from './refresh-liked-button.module.css'

/**
 * "Refresh" — pulls Spotify likes into Rosso.
 *
 * Neden var: beğeniler Account Data ZIP'inden geldi; ZIP bir fotoğraf.
 * ZIP tarihinden sonra Spotify'da beğenilen hiçbir şey Rosso'da yoktu
 * (ölçüldü: 41 eksik). Bu düğme farkı kapatır.
 *
 * ⚠ Sonuç MUTLAKA gösterilir — "0 yeni" bile. Sessizce biten bir tazeleme
 * kullanıcıya "çalıştı mı?" dedirtir ve düğmeye tekrar bastırır; her basış
 * 54 Spotify isteği demek (§4.2).
 */

export function RefreshLikedButton() {
  const { t } = useT()
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [pending, startTransition] = useTransition()

  function onClick() {
    setMessage(null)
    setIsError(false)

    startTransition(async () => {
      const res = await refreshLikedSongs()

      if (res.ok) {
        setIsError(false)
        const parcalar: string[] = []
        if (res.added > 0) parcalar.push(t('playlists.refresh.newLikes', { count: res.added }))
        if (res.removed > 0) parcalar.push(t('playlists.refresh.removed', { count: res.removed }))
        setMessage(
          parcalar.length > 0
            ? `${parcalar.join(' · ')}.`
            : t('playlists.refresh.upToDate'),
        )
        return
      }

      setIsError(true)
      if (res.reason === 'blocked') {
        setMessage(t('playlists.refresh.blocked', { wait: formatWaitLabel(res.retryAfterSeconds) }))
      } else if (res.reason === 'scope_missing') {
        setMessage(t('playlists.refresh.scopeMissing'))
      } else if (res.reason === 'no_token') {
        setMessage(t('playlists.refresh.noToken'))
      } else {
        setMessage(t('playlists.refresh.genericError'))
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={styles.btn}
        aria-label={t('playlists.refresh.ariaLabel')}
      >
        <RefreshCw
          size={15}
          strokeWidth={2}
          aria-hidden
          className={pending ? styles.spin : undefined}
        />
        {pending ? t('playlists.refresh.refreshing') : t('playlists.refresh.button')}
      </button>
      {message && (
        <span
          className={`${styles.msg} ${isError ? styles.msgError : ''}`}
          role={isError ? 'alert' : 'status'}
        >
          {message}
        </span>
      )}
    </div>
  )
}
