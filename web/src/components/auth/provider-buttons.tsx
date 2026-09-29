import { resolveAuthProviders, type AuthProviderId } from '@/lib/auth/providers'
import { getT } from '@/lib/i18n/server'
import styles from '@/app/(auth)/auth.module.css'

/**
 * Google / Spotify / Apple ile giriş düğmeleri — FAZ KİMLİK-V2.1 (2026-08-14).
 *
 * ─── Neden server component ─────────────────────────────────────────────
 * Hiç istemci durumu yok: her düğme bir `<a>`, tıklayınca
 * `/api/auth/oauth/<provider>` ucuna gidiyor. Tarayıcı yönlendirmesi
 * JavaScript gerektirmez — JS yüklenmeden önce bile çalışır ve
 * bundle'a hiçbir şey eklemez.
 *
 * ─── Üç düğme neden BİREBİR aynı geometride ─────────────────────────────
 * Sahibin talimatı (2026-08-14): *"google, spotify ve apple butonları
 * birebir aynı boyutlarda olacak … her butonun hover efekti boyutu stili
 * aynı olacak, logo boyutları da öyle."*
 *
 * Bu yalnız estetik değil, `apple-design` §16.4 (Familiarity: *"aynı görünen
 * şeyler aynı davranmalı"*) ve §16.7 (Craft: *"hiçbir şey rastgele değil"*).
 * Ölçüler tek yerden gelir: yükseklik/yarıçap/logo boyutu `.providerButton`
 * ve `.providerIcon`'da; markaya özel olan YALNIZ renktir. Böylece bir
 * sağlayıcı eklendiğinde geometri kendiliğinden tutar.
 *
 * ─── Pasif düğme neden gizlenmiyor ──────────────────────────────────────
 * Apple Developer üyeliği yok (Sahip, 2026-08-14) ama Apple düğmesi
 * tasarımda isteniyor. Gizlemek düzeni kaydırırdı ve "bu yol yok" derdi;
 * pasif göstermek "bu yol var, henüz açılmadı" der — §16.2 (Agency:
 * kullanıcı neyin mümkün olduğunu görür) ve §16.1 (Purpose).
 */
export async function ProviderButtons({ next }: { next?: string }) {
  const [{ t }, providers] = await Promise.all([
    getT(),
    resolveAuthProviders({
      master: process.env.NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED,
      google: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED,
      spotify: process.env.NEXT_PUBLIC_AUTH_SPOTIFY_ENABLED,
      apple: process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED,
    }),
  ])

  // Hiçbiri açık değilse ayraç + boş öbek göstermenin anlamı yok.
  if (providers.length === 0) return null

  const query = next ? `?next=${encodeURIComponent(next)}` : ''

  return (
    <>
      {/*
        ⚠ `aria-hidden` YOK (2026-08-14 düzeltmesi): "Veya" bu öbeğin ne
        olduğunu söyleyen tek etiket. Gizlenirse ekran okuyucu kullanıcısı
        üç düğmeyi bağlamsız duyar. Ayracın çizgileri dekoratif, metni
        değil — bu yüzden liste `aria-label` ile de adlandırılıyor.
      */}
      <div className={styles.providerDivider}>
        <span>{t('auth.providers.dividerOr')}</span>
      </div>

      <div className={styles.providerList} role="group" aria-label={t('auth.providers.otherMethodsAria')}>
        {providers.map((p) =>
          p.ready ? (
            <a
              key={p.id}
              className={`${styles.providerButton} ${PROVIDER_CLASS[p.id]}`}
              href={`/api/auth/oauth/${p.id}${query}`}
              /*
               * ⚠ `rel="nofollow"`: bu bağlantı bir EYLEM başlatıyor
               * (OAuth akışı), bir belgeye gitmiyor. Arama motoru
               * botlarının tıklaması anlamsız istek üretir.
               */
              rel="nofollow"
            >
              <ProviderIcon id={p.id} />
              <span>{t('auth.providers.continueWith', { provider: p.label })}</span>
            </a>
          ) : (
            /*
             * Pasif hâl `<button disabled>` — `<a>` değil. Devre dışı bir
             * bağlantı HTML'de yok: `<a>`'dan href'i almak onu ekran
             * okuyucu için tıklanabilir bir öğe olmaktan çıkarır ama
             * klavye sırasında tuhaf bir kalıntı bırakır. `disabled`
             * düğme hem odaktan çıkar hem durumu doğru duyurur.
             */
            <button
              key={p.id}
              type="button"
              className={`${styles.providerButton} ${PROVIDER_CLASS[p.id]}`}
              disabled
              title={t('auth.providers.comingSoonTitle', { provider: p.label })}
            >
              <ProviderIcon id={p.id} />
              <span>{t('auth.providers.continueWith', { provider: p.label })}</span>
              <span className={styles.providerSoon}>{t('auth.providers.soonBadge')}</span>
            </button>
          )
        )}
      </div>
    </>
  )
}

/** Markaya özel olan tek şey renktir — geometri ortak (§16.7). */
const PROVIDER_CLASS: Record<AuthProviderId, string> = {
  google: styles.providerGoogle,
  spotify: styles.providerSpotify,
  apple: styles.providerApple,
}

/**
 * Marka logoları — inline SVG.
 *
 * ⚠ Emoji veya dış CDN kullanılmıyor: marka logosu için ağ isteği atmak
 * gereksiz gecikme; ayrıca proje kuralı ikonların SVG olmasını istiyor.
 *
 * ⚠ Hiçbiri `currentColor` ALMAZ. Üç markanın da kılavuzu logonun kendi
 * renginde kalmasını şart koşuyor; tema rengine boyamak marka ihlali
 * olurdu. Bu yüzden zemin renkleri (CSS'te) logonun okunacağı şekilde
 * seçildi: Google beyaz zeminde, Spotify yeşil zeminde beyaz nota,
 * Apple siyah zeminde beyaz elma.
 *
 * `viewBox` üçünde de farklı — logolar kendi ızgaralarında çizilmiş.
 * Görsel boyutu CSS'teki tek `.providerIcon` kuralı belirler, bu yüzden
 * `width`/`height` özniteliği bilinçli olarak YAZILMIYOR.
 */
function ProviderIcon({ id }: { id: AuthProviderId }) {
  if (id === 'google') {
    return (
      <svg className={styles.providerIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.57Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.55 14.67a6.9 6.9 0 0 1 0-4.41V7.28H1.7a11.5 11.5 0 0 0 0 10.37l3.85-2.98Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.72 1.24 15.1 0 12 0 7.44 0 3.5 2.62 1.7 6.44l3.85 2.98C6.46 6.78 9 4.75 12 4.75Z"
        />
      </svg>
    )
  }

  if (id === 'spotify') {
    return (
      // Logo da metinle aynı marka siyahı — yeşil zeminde beyaz okunmuyordu
      // (ölçüldü: 2,59:1). Spotify kılavuzu yeşil üstünde siyah logoyu kabul eder.
      <svg className={styles.providerIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#191414"
          d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0Zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02Zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.84.24 1.2Zm.12-3.36C15.24 8.46 8.82 8.22 5.16 9.36c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.24Z"
        />
      </svg>
    )
  }

  return (
    <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
      <path d="M17.05 12.7c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.82 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.46 7.82 1.3 10.38.86 1.25 1.88 2.66 3.22 2.61 1.3-.05 1.79-.84 3.36-.84 1.56 0 2.01.84 3.38.81 1.4-.02 2.28-1.27 3.13-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.15ZM14.5 4.6c.71-.87 1.19-2.07 1.06-3.27-1.02.04-2.26.68-3 1.54-.66.77-1.24 2-1.08 3.17 1.14.09 2.3-.58 3.02-1.44Z" />
    </svg>
  )
}
