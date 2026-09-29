import { IntentLink } from '@/components/ui/intent-link'
import { Disc3, Heart } from 'lucide-react'
import { CoverArt } from '@/components/media/cover-art'
import { LikeButton } from '@/components/library/like-button'
import { RefreshLikedButton } from './refresh-liked-button'
import { getT } from '@/lib/i18n/server'
import { formatNumber } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import type { Translator } from '@/lib/i18n/translate'
import type { DiscoveryTrack, LikedSong } from '@/lib/library/liked-songs'
import styles from '@/components/library/library-tabs.module.css'
import heroStyles from './liked-songs-hero.module.css'

/**
 * "Beğenilen Şarkılar" — playlist listesindeki diğer listeler gibi görünen,
 * ama gerçek bir playlist olmayan sanal liste (2026-08-04, Sahip kararı:
 * `/kitapligim` kaldırıldı, içeriği buraya taşındı).
 *
 * Üç görünüm, tek sayfa — üçü de aynı soruyu farklı açıdan sorar:
 * "neyi sevdim, neyi sevmeyi unuttum, neyi sevdiğimi unuttum".
 *
 *   · Beğenilenler  — Spotify'da kalp attıkların
 *   · Gözden Kaçanlar — çok dinledin ama beğenmedin → beğeni butonu VAR
 *   · Tozlu Raflar  — beğendin ama ≥1 yıldır çalmadın → beğeni butonu YOK
 *
 * ⚠ Beğeni butonu neden yalnız ilk ikisinde: Tozlu Raflar zaten beğenilmiş
 * şarkılardır; oradaki kalp yalnızca "beğeniden çıkar" işe yarardı. Amaç
 * hatırlatmak, beğeniyi geri almaya davet etmek değil (Sahip: "sadece
 * gösterilir kullanıcı hatırlar diye").
 *
 * Görünüm geçişi LINK ile (client state değil): sekme ve sayfa numarası URL'de
 * yaşar → geri tuşu çalışır, bir görünüm paylaşılabilir. Sayfalama zaten
 * sunucuda olduğu için her geçiş bir istek; client state ikinci bir kaynak
 * yaratırdı.
 */

/**
 * ⚠ "Tozlu Raflar" DB'de `nostalgia` kovasıdır, `dusty` DEĞİL.
 * Sahibin tarifi: "beğenmesine rağmen bir yıl veya daha uzun süredir hiç
 * dinlemediği şarkılar" → bu `nostalgia` (son çalma > 365 gün).
 * `dusty` ise "≤2 kez çalınmış" demek — farklı soru, burada kullanılmıyor.
 */
export type LikedView = 'liked' | 'overlooked' | 'nostalgia'

interface Props {
  activeView: LikedView
  page: number
  pageSize: number
  items: Array<LikedSong | DiscoveryTrack>
  total: number
  counts: Record<'overlooked' | 'nostalgia', number>
  likedTotal: number
}

function viewMeta(
  view: LikedView,
  t: Translator['t'],
): { label: string; empty: string; hint: string } {
  switch (view) {
    case 'liked':
      return {
        label: t('playlists.likedView.tabs.liked'),
        empty: t('playlists.likedView.empty.liked'),
        hint: t('playlists.likedView.hint.liked'),
      }
    case 'overlooked':
      return {
        label: t('playlists.likedView.tabs.overlooked'),
        empty: t('playlists.likedView.empty.overlooked'),
        hint: t('playlists.likedView.hint.overlooked'),
      }
    case 'nostalgia':
      return {
        label: t('playlists.likedView.tabs.nostalgia'),
        empty: t('playlists.likedView.empty.nostalgia'),
        hint: t('playlists.likedView.hint.nostalgia'),
      }
  }
}

const VIEW_ORDER: LikedView[] = ['liked', 'overlooked', 'nostalgia']

function viewHref(view: LikedView): string {
  return view === 'liked' ? '/playlists/liked' : `/playlists/liked?liste=${view}`
}

function pageHref(view: LikedView, page: number): string {
  const base = view === 'liked' ? '/playlists/liked?' : `/playlists/liked?liste=${view}&`
  return `${base}sayfa=${page}`
}

/** "3 plays" / "never played" — sayı yalnız anlamlıysa gösterilir. */
function playLabel(item: LikedSong | DiscoveryTrack, t: Translator['t'], locale: Locale): string {
  if (item.playCount > 0) return t('playlists.likedView.plays', { count: formatNumber(item.playCount, locale) })
  return t('playlists.likedView.neverPlayed')
}

export async function LikedSongsView({
  activeView,
  page,
  pageSize,
  items,
  total,
  counts,
  likedTotal,
}: Props) {
  const { t, locale } = await getT()
  const meta = viewMeta(activeView, t)
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1)

  return (
    <>
      {/* Sade hero — gerçek playlist hero'sunun senkron/dış-bağlantı aksiyonları
          burada anlamsız (bu liste Spotify'da tek bir playlist değil). */}
      <header className={heroStyles.hero}>
        <div className={heroStyles.cover} aria-hidden>
          <Heart size={40} strokeWidth={1.5} fill="currentColor" />
        </div>
        <div className={heroStyles.info}>
          <span className={heroStyles.eyebrow}>{t('playlists.likedView.eyebrow')}</span>
          <h1 className={heroStyles.title}>{t('playlists.likedView.title')}</h1>
          <p className={heroStyles.meta}>
            {t('playlists.likedView.metaTracks', { count: formatNumber(likedTotal, locale) })}
          </p>
          {/* Beğeniler ZIP'ten geldi (fotoğraf, canlı akış değil). Bu düğme
              Spotify'daki gerçekle farkı kapatır — sayının neden tutmadığını
              kullanıcı sormadan çözebilsin. */}
          <RefreshLikedButton />
        </div>
      </header>

      <div className={styles.wrap}>
        <nav className={styles.tabs} aria-label={t('playlists.likedView.tabsAriaLabel')}>
          {VIEW_ORDER.map((key) => {
            const isActive = key === activeView
            const count = key === 'liked' ? null : counts[key]
            return (
              <IntentLink
                key={key}
                href={viewHref(key)}
                className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {viewMeta(key, t).label}
                {count != null && count > 0 && (
                  <span className={styles.tabCount}>{formatNumber(count, locale)}</span>
                )}
              </IntentLink>
            )
          })}
        </nav>

        <p className={styles.hint}>{meta.hint}</p>

        {items.length === 0 ? (
          <p className={styles.empty} role="status">
            {meta.empty}
          </p>
        ) : (
          <>
            <p className={styles.total}>
              <span className={styles.totalNum}>{formatNumber(total, locale)}</span>{' '}
              {t('playlists.likedView.totalTracksSuffix')}
            </p>

            <ol className={styles.list} start={page * pageSize + 1}>
              {items.map((item, idx) => {
                const itemIndex = page * pageSize + idx + 1
                return (
                  <li key={item.trackId} className={styles.row}>
                    <div className={styles.rowLead}>
                      <span className={styles.trackIndex}>{itemIndex}</span>
                      <span className={styles.cover}>
                        <CoverArt
                          kind="track"
                          id={item.trackId}
                          size={40}
                          alt=""
                          fallbackTitle={item.title}
                          fallbackSubtitle={item.artistName}
                          fallback={<Disc3 size={16} strokeWidth={1.5} />}
                        />
                      </span>
                    </div>
                    <div className={styles.info}>
                      <IntentLink href={`/track/${item.trackId}`} className={`${styles.title} entity-link`}>
                        {item.title}
                      </IntentLink>
                      <span className={styles.artist}>{item.artistName}</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span className={styles.plays}>{playLabel(item, t, locale)}</span>
                      <div className={styles.actions}>
                        {activeView === 'nostalgia' ? (
                          <span aria-hidden className={styles.actionPlaceholder} />
                        ) : (
                          <LikeButton
                            spotifyTrackId={item.spotifyId}
                            initialLiked={activeView === 'liked'}
                            title={item.title}
                          />
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>

            {lastPage > 0 && (
              <nav className={styles.pager} aria-label={t('playlists.likedView.pagerAriaLabel')}>
                {page > 0 ? (
                  <IntentLink href={pageHref(activeView, page - 1)} className={styles.pagerBtn}>
                    {t('playlists.likedView.previous')}
                  </IntentLink>
                ) : (
                  <span className={`${styles.pagerBtn} ${styles.pagerDisabled}`}>
                    {t('playlists.likedView.previous')}
                  </span>
                )}
                <span className={styles.pagerInfo}>
                  {t('playlists.likedView.pageInfo', { page: page + 1, total: lastPage + 1 })}
                </span>
                {page < lastPage ? (
                  <IntentLink href={pageHref(activeView, page + 1)} className={styles.pagerBtn}>
                    {t('playlists.likedView.next')}
                  </IntentLink>
                ) : (
                  <span className={`${styles.pagerBtn} ${styles.pagerDisabled}`}>
                    {t('playlists.likedView.next')}
                  </span>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </>
  )
}
