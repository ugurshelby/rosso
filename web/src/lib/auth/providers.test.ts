import { describe, it, expect } from 'vitest'
import {
  AUTH_PROVIDERS,
  isAuthProvider,
  authProvidersEnabled,
  providerEnabled,
  resolveAuthProviders,
} from './providers'

/**
 * Sağlayıcı envanteri testleri — FAZ KİMLİK-V2 (2026-08-13),
 * KİMLİK-V2.1 ile güncellendi (2026-08-14).
 */

describe('AUTH_PROVIDERS', () => {
  it('Google, Spotify ve Apple içerir — bu SIRAYLA', () => {
    /*
     * ⚠ Sıra sözleşmenin parçası, rastgele değil: Google en yaygın hesap,
     * Spotify Rosso'nun kendi alanı, Apple en dar kitle. Mobil taraf
     * (`mobile/src/lib/auth-providers.ts`) aynı sırayı kopyalıyor —
     * biri değişip diğeri kalırsa aynı ürünün iki farklı hatırası olur.
     */
    expect(AUTH_PROVIDERS.map((p) => p.id)).toEqual(['google', 'spotify', 'apple'])
  })

  /*
   * ⚠ 2026-08-13'te burada "Spotify GİRİŞ sağlayıcısı DEĞİLDİR" diye bir
   * nöbetçi test vardı ve doğruydu — o günkü karar buydu. Sahip
   * 2026-08-14'te kararı değiştirdi: Spotify de giriş/kayıt seçeneği
   * olacak. Test silinmedi, KARARIN KENDİSİ değişti; eski gerekçe
   * (9 scope + çift token yönetimi) hâlâ geçerli bir RİSK, bu yüzden
   * backend turunda Spotify'ın hangi izinlerle bağlanacağı ayrıca
   * kararlaştırılacak. Bu test yalnız envanteri koruyor.
   */

  it('her sağlayıcı panel kurulumu gerektirdiğini belirtir', () => {
    // Kod hazır olsa da Supabase panelinde açılmadan çalışmaz —
    // Sahibin manuel iş listesinin kaynağı bu bayrak.
    for (const p of AUTH_PROVIDERS) {
      expect(p.requiresDashboardSetup).toBe(true)
      expect(p.label.length).toBeGreaterThan(0)
    }
  })

  it('kimlikler benzersiz', () => {
    const ids = AUTH_PROVIDERS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('isAuthProvider', () => {
  it('bilinen sağlayıcıları kabul eder', () => {
    expect(isAuthProvider('google')).toBe(true)
    expect(isAuthProvider('apple')).toBe(true)
    expect(isAuthProvider('spotify')).toBe(true)
  })

  it('bilinmeyen değerleri reddeder', () => {
    /*
     * Bu fonksiyon bir URL parçasını (`/api/auth/oauth/[provider]`)
     * doğruluyor. Süzgeçten geçmeyen bir değer doğrudan Supabase'e
     * iletilirse hata mesajı sızdırabilir.
     */
    for (const bad of [
      'facebook',
      '',
      'GOOGLE',
      'google ',
      '../admin',
      null,
      undefined,
      123,
      {},
    ]) {
      expect(isAuthProvider(bad)).toBe(false)
    }
  })
})

describe('resolveAuthProviders — sağlayıcı başına bayrak', () => {
  const HEPSI_ACIK = {
    master: 'true',
    google: 'true',
    spotify: 'true',
    apple: 'true',
  }

  it('ana şalter kapalıyken HİÇBİRİ dönmez', () => {
    /*
     * Ana şalter kapalıyken tek tek sağlayıcılar açık olsa bile liste
     * boş olmalı — aksi hâlde "Veya" ayracı ve düğme öbeği görünürdü.
     */
    expect(resolveAuthProviders({ ...HEPSI_ACIK, master: 'false' })).toEqual([])
    expect(resolveAuthProviders({ ...HEPSI_ACIK, master: undefined })).toEqual([])
  })

  it('kapalı sağlayıcıyı GİZLEMEZ, `ready: false` işaretler', () => {
    /*
     * 🔴 Sahibin kararı (2026-08-14): Apple Developer hesabı yok ama
     * düğme tasarımda DURACAK. Gizlemek düzeni kaydırırdı; pasif
     * göstermek "bu yol var, henüz açılmadı" der.
     *
     * Bu davranış kritik: `ready:false` olan düğme `<a href>` değil
     * `<button disabled>` render edilir — yani tıklanıp Supabase'e
     * gitmesi ve "Unsupported provider" hatası vermesi imkânsız.
     */
    const cozum = resolveAuthProviders({ ...HEPSI_ACIK, apple: 'false' })

    expect(cozum.map((p) => p.id)).toEqual(['google', 'spotify', 'apple'])
    expect(cozum.find((p) => p.id === 'apple')?.ready).toBe(false)
    expect(cozum.find((p) => p.id === 'google')?.ready).toBe(true)
    expect(cozum.find((p) => p.id === 'spotify')?.ready).toBe(true)
  })

  it('yalnız Google açıkken diğer ikisi pasif', () => {
    // Sahibin kurulum yapacağı ilk aşamanın birebir senaryosu.
    const cozum = resolveAuthProviders({
      master: 'true',
      google: 'true',
      spotify: undefined,
      apple: undefined,
    })

    expect(cozum.filter((p) => p.ready).map((p) => p.id)).toEqual(['google'])
    expect(cozum).toHaveLength(3)
  })
})

describe('providerEnabled', () => {
  it('varsayılan KAPALI, yalnız "true" açar', () => {
    expect(providerEnabled(undefined)).toBe(false)
    expect(providerEnabled('1')).toBe(false)
    expect(providerEnabled('yes')).toBe(false)
    expect(providerEnabled('true')).toBe(true)
    expect(providerEnabled('  TRUE ')).toBe(true)
  })
})

describe('authProvidersEnabled', () => {
  it('varsayılan KAPALI — panel kurulumu yapılmadan düğme çıkmaz', () => {
    /*
     * ⚠ Güvenli varsayılan burada "kapalı": sağlayıcı Supabase'de
     * açılmadan düğme gösterilirse kullanıcı "Unsupported provider"
     * hata sayfasına düşer. Kod önce çıkar, sağlayıcı sonra açılır.
     */
    expect(authProvidersEnabled(undefined)).toBe(false)
    expect(authProvidersEnabled('')).toBe(false)
    expect(authProvidersEnabled('false')).toBe(false)
    expect(authProvidersEnabled('1')).toBe(false)
    expect(authProvidersEnabled('yes')).toBe(false)
  })

  it('yalnız açık "true" açar (harf/boşluk toleranslı)', () => {
    expect(authProvidersEnabled('true')).toBe(true)
    expect(authProvidersEnabled('TRUE')).toBe(true)
    expect(authProvidersEnabled('  True  ')).toBe(true)
  })
})
