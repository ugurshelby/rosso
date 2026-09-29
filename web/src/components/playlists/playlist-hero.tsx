import Link from 'next/link'
import { Plus, Sparkle, Heart } from 'lucide-react'
import { getT } from '@/lib/i18n/server'
import { formatNumber } from '@/lib/i18n'
import styles from './playlist-hero.module.css'

interface PlaylistHeroProps {
  playlistCount: number
  /**
   * ⚠ Artık GÖSTERİLMİYOR (2026-08-13). Rosso saf Spotify olduğu için
   * "1 Platform" rozeti hiçbir bilgi taşımıyordu; hero özeti "N liste ·
   * N şarkı"ya indi. Prop imzada kalıyor — çağıran sayfayı bozmamak ve
   * çok platform geri gelirse yeniden bağlayabilmek için.
   */
  platformCount?: number
  trackCount: number
  /** Aksiyon şeridi — yalnız bağlı platform varsa anlamlı. */
  showActions?: boolean
  /** Aylık otomatik playlist kuralı açık mı? (butonda nokta göstergesi) */
  autoPlaylistEnabled?: boolean
  /**
   * Kütüphaneden seçilmiş kapak URL'leri — hero'nun arka plan dokusu.
   * 2026-08-13: hero artık kütüphanenin KENDİSİNDEN doğuyor (aşağıdaki
   * açıklama). Boş dizi güvenli: doku hiç render edilmez.
   */
  coverUrls?: string[]
  /**
   * Vibe-card yolu (`/vibe-cards/{id}.webp`) — 2026-09-17 (Apple Design +
   * Glassmorphism turu). Kütüphane kolajının YANINDA, her zaman dolu bir
   * ikinci katman: `matchVibeCard` sanatçı/tür verisi yoksa bile deterministik
   * bir kart döndürür (bkz. `lib/vibe-cards/match.ts` `pickVibeCardId`
   * fallback'i) — tek playlist'i (hatta hiç playlist'i) olsa da banner asla
   * boş kalmaz. 1:1 oranlı — `object-fit: contain` ile KIRPILMADAN gösterilir.
   */
  vibeCardSrc?: string | null
}

/**
 * Playlist sayfası hero'su — "Sakin Dev" (FAZ UI-4, 2026-07-12).
 *
 * Ortak `PageHeader`'ı DEĞİŞTİRMİYORUZ: o bileşen tüm sayfalarda kullanılıyor,
 * büyütmek hepsini bozardı. Bu hero yalnızca playlist sayfasına ait.
 *
 * Yerleşim (Sahibin kararı):
 *   masaüstü → sayılar başlığın SAĞINDA, taban çizgileri hizalı
 *   mobil    → sayılar başlığın ALTINDA
 *
 * Araç çubuğu ve ızgara bu bileşenin DIŞINDA kalır — konumları ve boyutları
 * değişmez (Sahibin net şartı: sayfa açılışında ilk playlist'ler görünmeli).
 */
export async function PlaylistHero({
  playlistCount,
  trackCount,
  showActions = false,
  autoPlaylistEnabled = false,
  coverUrls = [],
  vibeCardSrc = null,
}: PlaylistHeroProps) {
  const { t, locale } = await getT()
  /*
   * ── Sayılar tek cümleye indi (2026-08-13) ──────────────────────────────
   *
   * Önceki hâlde sağda üç ayrı istatistik bloğu vardı: `114 Playlist ·
   * 1 Platform · 5.731 Şarkı`. Canlı karede görüldü: başlıktan kopuk,
   * dashboard'dan alınmış bir widget gibi duruyor ve "1 Platform"
   * hiçbir şey söylemiyor (tek platform zaten Spotify).
   *
   * Apple/Spotify kütüphane başlıklarında sayı bir ROZET değil, başlığın
   * altındaki sakin bir alt satırdır. Bilgi aynı, gürültü yok.
   */
  const ozet = playlistCount > 0
    ? t('playlists.hero.summaryWithCounts', {
        count: formatNumber(playlistCount, locale),
        tracks: formatNumber(trackCount, locale),
      })
    : t('playlists.hero.summaryEmpty')

  /*
   * Hero dokusu: kütüphanenin kendi kapakları.
   *
   * Sahip: *"hero section ve liste formatı bana spotify gibi
   * gelmeli... daha sinematik ve estetik."*
   *
   * Spotify/Apple Music'te kütüphane başlığı boş bir zemin üstünde
   * durmaz — içeriğin kendisi arka planı boyar. Burada ilk 5 kapak
   * bulanık bir doku olarak hero'nun arkasına yerleşiyor: sayfa her
   * kullanıcıda FARKLI görünüyor, çünkü kütüphane farklı.
   *
   * 5 seçildi: daha azı desen oluşturmuyor, daha fazlası lapa oluyor.
   */
  const doku = coverUrls.filter(Boolean).slice(0, 5)

  return (
    <header className={styles.hero}>
      {doku.length > 0 && (
        <div className={styles.heroDoku} aria-hidden>
          {doku.map((url, i) => (
            <span
              key={`${url}-${i}`}
              className={styles.heroDokuTile}
              style={{ backgroundImage: `url(${url})` }}
            />
          ))}
        </div>
      )}

      {/* Vibe-card sanat eseri — kolajın YANINDA her zaman dolu ikinci
          katman, bkz. yukarıdaki prop notu. `object-fit: contain` +
          `aspect-ratio: 1` ile 1:1 oran KIRPILMADAN korunuyor. */}
      {vibeCardSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vibeCardSrc} alt="" className={styles.heroVibeArt} aria-hidden />
      )}

      <div className={styles.headRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{t('playlists.hero.title')}</h1>
          <p className={styles.subtitle}>{ozet}</p>
        </div>
      </div>

      {/* ── ÜÇ KART: Create · Mood · Liked ──
          2026-09-17 (Apple Design + Glassmorphism turu, Sahip kararı):
          "Liked" kartı 2026-08-13'te tam-genişlik `LikedSongsEntry` satırıyla
          ikileştiği için kaldırılmıştı. Sahip üçünün YİNE yan yana, eşit
          boyutlu üç kart olmasını istedi — o yüzden tekrar eklendi, ama
          ikileşme geri gelmesin diye `page.tsx` artık `LikedSongsEntry`'yi
          bu kartlar gösterildiğinde AYRICA render ETMİYOR (yalnız hero
          kartları görünmediği — bağlantısız/boş kütüphane — durumda geri
          düşüyor).

          Üçünün YAPISI birebir aynı, `Mood` ORTADA ve yalnız RENK/efektte
          ayrışır (§4.1 Von Restorff: aynı yapı, farklı renk → göz oraya
          gider — DOM sırası da CSS'teki `order` ile eşleşiyor, bkz. .css). */}
      {showActions && (
        <div className={styles.heroCards}>
          <Link href="/playlists/create" className={styles.heroCard}>
            <span className={styles.heroCardIcon}>
              <Plus size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <span className={styles.heroCardTitle}>{t('playlists.hero.cards.create.title')}</span>
            <span className={styles.heroCardDesc}>{t('playlists.hero.cards.create.desc')}</span>
            {autoPlaylistEnabled && (
              <span
                className={styles.actionDot}
                role="img"
                aria-label="on"
                title={t('playlists.hero.autoPlaylistOn')}
              />
            )}
          </Link>

          {/* "Mood" marka terimi — çevrilmez, dilden bağımsız aynı yazılır. */}
          <Link href="/playlists/mood" className={`${styles.heroCard} ${styles.heroCardMood}`}>
            <span className={styles.heroCardIcon}>
              <Sparkle size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <span className={styles.heroCardTitle}>Mood</span>
            <span className={styles.heroCardDesc}>{t('playlists.hero.cards.mood.desc')}</span>
          </Link>

          <Link href="/playlists/liked" className={styles.heroCard}>
            <span className={styles.heroCardIcon}>
              <Heart size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <span className={styles.heroCardTitle}>{t('playlists.hero.cards.liked.title')}</span>
            <span className={styles.heroCardDesc}>{t('playlists.hero.cards.liked.desc')}</span>
          </Link>
        </div>
      )}
    </header>
  )
}
