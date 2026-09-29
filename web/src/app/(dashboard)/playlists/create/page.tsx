import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getKullaniciTurleri, getKullaniciSanatcilari } from '@/lib/playlists/create-options'
import { PlaylistOlusturucu } from '@/components/playlists/playlist-olusturucu'
import { getT } from '@/lib/i18n/server'
import styles from './automations.module.css'

/**
 * `/playlists/create` — TEK SEFERLİK playlist üretimi (P4.2, 2026-08-15).
 *
 * 🔄 Bu sayfa baştan yazıldı. Eskiden hem manuel oluşturmayı hem otomasyon
 * kartlarını hem senkron kurallarını taşıyordu; `/settings/automations` de
 * buraya yönlendiriyordu — iki farklı iş tek sayfada karışıyordu
 * (2026-08-14 kullanıcı testi, Ş-33).
 *
 * Sahibin tarifi (= kabul kriteri): *"Kullanıcı bu sayfadaki arayüz
 * üzerinden playlist oluşturabilmeli: tür seçimi, zaman aralığı, sanatçı,
 * şarkı sayısı, çalma sayısı veya süresine göre seçim… Ek olarak olmazsa
 * olmaz: playlist adı, açıklaması ve kapak görseli."*
 *
 *   → BURASI: parametre ver, tek liste üret
 *   → `/settings/automations`: kendi kendine üreyen listeleri yönet
 */
export default async function CreatePlaylistPage() {
  const { t } = await getT()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform')
    .eq('user_id', user.id)
    .eq('is_active', true)
  const spotifyBagli = (connections ?? []).some((c) => c.platform === 'spotify')

  // Paneller kullanıcının KENDİ türlerini/sanatçılarını gösterir — dinlemediği
  // bir türü seçip boş liste üretmesin (migration 0279).
  const [turler, sanatcilar] = await Promise.all([
    getKullaniciTurleri(user.id),
    getKullaniciSanatcilari(user.id),
  ])

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <header className={styles.hero}>
        <Link href="/playlists" className={styles.heroBack}>
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
          {t('playlists.createPage.backToPlaylists')}
        </Link>
        <h1 className={styles.heroTitle}>{t('playlists.createPage.title')}</h1>
        <p className={styles.heroDesc}>{t('playlists.createPage.description')}</p>
      </header>

      <PlaylistOlusturucu
        turler={turler}
        sanatcilar={sanatcilar}
        spotifyBagli={spotifyBagli}
      />

      {/* Otomasyonlar AYRI sayfada — kullanıcı burada arayıp bulamasın. */}
      <section className={styles.section}>
        <Link href="/settings/automations" className={styles.crossLink}>
          <Settings2 size={15} strokeWidth={1.75} aria-hidden />
          <span>
            <strong>{t('playlists.createPage.automationsTitle')}</strong>
            <span className={styles.crossLinkHint}>
              {t('playlists.createPage.automationsHint')}
            </span>
          </span>
        </Link>
      </section>
    </div>
  )
}
