import Link from 'next/link'
import { Heart } from 'lucide-react'
import { getT } from '@/lib/i18n/server'
import { formatNumber } from '@/lib/i18n'
import styles from './liked-songs-entry.module.css'

/**
 * Playlist kütüphanesinin başındaki "Beğenilen Şarkılar" girişi (2026-08-04).
 *
 * ⚠ Kütüphane ızgarasının İÇİNE değil ÜSTÜNE konur. Sebep: kütüphane arama,
 * sıralama ve yıl klasörlemesi yapıyor — sanal kart o akışa girseydi "ada
 * göre sırala"da araya karışır, aramada kaybolur, klasör mantığında yersiz
 * kalırdı. Sabit giriş olarak her zaman aynı yerde durur.
 *
 * Sayı yoksa (Faz 4 kilitli / hiç beğeni yok) satır yine gösterilir: liste
 * kullanıcının kilidi açtığında dolacak — girişi gizlemek özelliği görünmez
 * kılardı.
 */

interface Props {
  /** Beğenilen şarkı sayısı; bilinmiyorsa null (satır yine çıkar). */
  trackCount: number | null
}

export async function LikedSongsEntry({ trackCount }: Props) {
  const { t, locale } = await getT()
  return (
    <Link href="/playlists/liked" className={styles.entry}>
      <span className={styles.cover} aria-hidden>
        <Heart size={22} strokeWidth={1.75} fill="currentColor" />
      </span>
      <span className={styles.body}>
        <span className={styles.name}>{t('playlists.entry.title')}</span>
        <span className={styles.meta}>
          {trackCount != null
            ? t('playlists.entry.metaWithCount', { count: formatNumber(trackCount, locale) })
            : t('playlists.entry.metaNoCount')}
        </span>
      </span>
    </Link>
  )
}
