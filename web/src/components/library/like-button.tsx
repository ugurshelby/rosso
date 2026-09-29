'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { toggleTrackLike } from '@/lib/library/like-action'
import { useToast } from '@/components/ui/toast'
import { formatWaitLabel } from '@/lib/platform/format-wait-label'
import { useT } from '@/lib/i18n/provider'
import styles from './like-button.module.css'

/**
 * A5 — Beğen / beğeniden kaldır butonu.
 *
 * İyimser güncelleme (optimistic): kalp anında dolar, Spotify çağrısı arkada
 * gider. Başarısız olursa **geri alınır** ve sebep söylenir — sessizce eski
 * hâle dönmek kullanıcıya "tıklamadım mı?" dedirtir.
 *
 * ⚠ Rate-limit hâlinde özel mesaj: "sonra dene" değil, NE KADAR sonra.
 * Belirsiz bekleme, kullanıcıyı butona tekrar tekrar bastırır — cezayı besler.
 */

interface Props {
  spotifyTrackId: string | null
  initialLiked: boolean
  title: string
}

export function LikeButton({ spotifyTrackId, initialLiked, title }: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [error, setError] = useState<string | null>(null)
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const { t } = useT()

  // Spotify id yoksa beğeni yazılamaz (ZIP'ten gelmiş ama katalogda eşleşmemiş).
  // Buton hiç gösterilmez — tıklanınca hata veren bir buton, olmayan butondan kötü.
  if (!spotifyTrackId) return null

  function onClick(opts?: { sessiz?: boolean }) {
    const next = !liked
    setLiked(next) // iyimser
    setError(null)

    startTransition(async () => {
      const res = await toggleTrackLike(spotifyTrackId!, next)
      if (res.ok) {
        /**
         * 🔴 KALDIRMA GERİ ALINABİLİR OLMALI (2026-08-14 kullanıcı testi, Ş-29).
         * 2.686 şarkılık listede her satırda bir kaldır butonu var; yanlış tıklama
         * şarkıyı Spotify beğenilerinden çıkarıyor ve arayüzde geri dönüş yolu yoktu.
         * Sahibin kararı: onay diyaloğu DEĞİL (her tıklamada sormak sürtünme
         * yaratır) → 5 saniyelik "Geri al" toast'ı.
         * Yalnız KALDIRMADA gösterilir; beğenmek zaten yıkıcı değil.
         * `sessiz`: geri alma çağrısının kendisi yeni toast doğurmasın (döngü).
         */
        if (!next && !opts?.sessiz) {
          toast('info', t('catalog.likeButton.removedToast', { title }), {
            durationMs: 5000,
            action: { label: t('catalog.likeButton.undo'), onAction: () => onClick({ sessiz: true }) },
          })
        }
        return
      }

      setLiked(!next) // geri al
      if (res.reason === 'blocked') {
        setError(t('catalog.likeButton.busyError', { wait: formatWaitLabel(res.retryAfterSeconds) }))
      } else if (res.reason === 'no_token') {
        setError(t('catalog.likeButton.needsConnection'))
      } else if (res.reason === 'scope_missing') {
        // Beklemek çözmez — izin eksik. Kullanıcıyı doğrudan çözüme gönder.
        setNeedsReconnect(true)
      } else {
        setError(t('catalog.likeButton.saveFailed'))
      }
    })
  }

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        onClick={() => onClick()}
        disabled={pending}
        className={`${styles.btn} ${liked ? styles.btnOn : ''}`}
        aria-pressed={liked}
        aria-label={liked ? t('catalog.likeButton.unlikeAria', { title }) : t('catalog.likeButton.likeAria', { title })}
        title={liked ? t('catalog.likeButton.unlikeTitle') : t('catalog.likeButton.likeTitle')}
      >
        <Heart size={16} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} />
      </button>
      {/* İzin eksikse hata metni değil ÇÖZÜM gösterilir — "Kaydedilemedi"
          kullanıcıyı butona tekrar bastırırdı, oysa tekrar denemek hiç
          çalışmaz. Bağlantı ayarlar sayfasına götürür. */}
      {needsReconnect ? (
        <a href="/settings/platforms" className={styles.error} role="alert">
          {t('catalog.likeButton.refreshAccess')}
        </a>
      ) : (
        error && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )
      )}
    </span>
  )
}
