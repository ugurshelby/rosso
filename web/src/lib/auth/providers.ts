/**
 * Çok kanallı giriş — sağlayıcı envanteri (FAZ KİMLİK-V2, 2026-08-13).
 *
 * Tek kaynak: web login/register ekranları, mobil giriş ekranı ve
 * doğrulama testleri hep buradan okur. Sağlayıcı eklemek/çıkarmak tek
 * dosyada yapılır.
 *
 * ─── Spotify NEDEN listede — ve iki akış nasıl ayrılıyor ───────────────
 * Spotify 2026-08-13'te giriş sağlayıcısı OLDU (Sahip kararı). Bu dosya
 * bir süre eski gerekçeyi (*"Spotify bilinçli olarak dışarıda"*) anlatmayı
 * sürdürdü; liste ile yorum çelişiyordu. 2026-08-25 BACKEND TURU'nda karar
 * gerekçesiyle birlikte netleşti:
 *
 * Rosso'da Spotify **iki ayrı kapıdan** girer ve ikisi karıştırılmaz:
 *
 *   ① GİRİŞ    → `/api/auth/oauth/spotify` → yalnız `user-read-email`
 *   ② VERİ     → `/api/spotify/connect`    → 9 scope (playlist, kütüphane…)
 *
 * Giriş ekranında 9 scope istemek, kullanıcıdan daha hesap açmadan
 * *"playlist'lerini değiştirebilirim"* onayı almak olurdu — huninin en dar
 * yerine en ağır sürtünme. Bedeli kabul edildi: Spotify ile giren kullanıcı
 * onay ekranını İKİ KEZ görür; ikincisi değeri gördükten sonra verilen
 * bilinçli bir onaydır.
 *
 * Token'lar da ayrı: `auth.identities` KİMLİK KANITI (görevi giriş anında
 * biter), `platform_connections` VERİ ANAHTARI (AES şifreleme, yenileme
 * eşiği, cooldown, allowlist). "Hangisi taze?" yanlış sorudur — ikisi aynı
 * işi yapmıyor, senkronlanacak ortak durum yok. Nöbetçi:
 * `src/lib/auth/spotify-kimlik.test.ts`.
 *
 * ⚠ Giriş akışı `platform_connections` kaydı AÇMAZ. Spotify'la girip
 * verisini bağlamayan kullanıcı boş dashboard görür; bu durum ayrıca
 * karşılanıyor (`spotify_veri_izni_gerekli` uyarısı).
 *
 * Tam gerekçe: `docs/decisions/spotify-giris-saglayicisi-3-soru.md`
 */

export type AuthProviderId = 'google' | 'apple' | 'spotify'

export interface AuthProviderMeta {
  id: AuthProviderId
  /** Düğmede görünen ad. */
  label: string
  /**
   * Supabase panelinde bu sağlayıcı açık mı?
   * ⚠ Kod tarafı hazır olsa da sağlayıcı panelde etkinleştirilmeden
   * çalışmaz (Sahibin manuel işi — `docs/reference/kimlik-v2-kurulum.md`).
   */
  requiresDashboardSetup: true
}

/**
 * Sıra ekranda göründüğü sıradır ve **rastgele değil**: Google en yaygın
 * hesap, Spotify Rosso'nun kendi alanı, Apple en dar kitle. Sık kullanılan
 * üstte (Hick yasası — ilk seçenek en olası seçenek olmalı).
 */
export const AUTH_PROVIDERS: readonly AuthProviderMeta[] = [
  { id: 'google', label: 'Google', requiresDashboardSetup: true },
  { id: 'spotify', label: 'Spotify', requiresDashboardSetup: true },
  { id: 'apple', label: 'Apple', requiresDashboardSetup: true },
] as const

/** Geçerli bir sağlayıcı kimliği mi? (URL parametresi doğrulaması) */
export function isAuthProvider(value: unknown): value is AuthProviderId {
  return (
    typeof value === 'string' &&
    AUTH_PROVIDERS.some((p) => p.id === value)
  )
}

/**
 * Sağlayıcı düğmeleri gösterilsin mi? (ana şalter)
 *
 * `NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED` env'i ile kontrol edilir.
 *
 * ⚠ Neden bir bayrak: Supabase panelinde sağlayıcı açılmadan düğmeyi
 * göstermek, kullanıcıyı **hata sayfasına** götürür ("Unsupported provider").
 * Kod önce çıkar, sağlayıcı sonra açılır — bu bayrak o aralıkta kullanıcıyı
 * kırık bir akıştan korur.
 *
 * Sahip panelde Google'ı açtıktan sonra bu değeri `true` yapar;
 * kod değişikliği veya yeniden deploy gerekmez.
 */
export function authProvidersEnabled(rawEnv: string | undefined): boolean {
  return rawEnv?.trim().toLowerCase() === 'true'
}

/**
 * Bir sağlayıcı ÇALIŞIR durumda mı? (sağlayıcı başına BAĞIMSIZ şalter)
 *
 * ─── Neden sağlayıcı başına ayrı bayrak ─────────────────────────────────
 * 2026-08-14: Sahibin **Apple Developer üyeliği yok** (yıllık ücretli) ve
 * almayacak; Google + Spotify çalışacak. Tek bayrak olsaydı Google'ı açmak
 * Apple'ı da açardı — Supabase'de tanımlı olmayan bir sağlayıcı, yani
 * kullanıcı için doğrudan "Unsupported provider" hatası. Bayrağın varlık
 * sebebi tam olarak bu senaryoyu önlemekti; üç sağlayıcıyı aynı şaltere
 * bağlamak o korumayı deliyordu.
 *
 * Env adları: `NEXT_PUBLIC_AUTH_<SAĞLAYICI>_ENABLED` (web),
 * `EXPO_PUBLIC_AUTH_<SAĞLAYICI>_ENABLED` (mobil).
 */
export function providerEnabled(rawEnv: string | undefined): boolean {
  return rawEnv?.trim().toLowerCase() === 'true'
}

/** Bir sağlayıcının ekrandaki hâli — görünür ama tıklanamaz olabilir. */
export interface ResolvedAuthProvider extends AuthProviderMeta {
  /**
   * Arkasında çalışan bir Supabase sağlayıcısı var mı?
   *
   * ⚠ `false` iken düğme **görünür ama pasif** olur. Bu bilinçli bir
   * seçim: Sahip Apple'ı tasarımda istiyor (2026-08-14) ama hesabı yok.
   * Gizlemek yerine pasif göstermek, kullanıcıya "bu yol var, henüz
   * açılmadı" der — tıklayıp hata sayfasına düşmesindense dürüst.
   */
  ready: boolean
}

/**
 * Bu ortamda gösterilecek sağlayıcılar — **tek karar noktası**.
 *
 * Web `ProviderButtons`, mobil giriş/kayıt ekranı ve OAuth ucu hep buradan
 * okur. Bayrakları üç ayrı yerde tekrar yorumlamak, zamanla birbirinden
 * kopan üç kural üretirdi.
 *
 * `visible` bayrağı ana şalterdir: hiçbiri hazır değilken "Veya" ayracını
 * ve boş bir düğme öbeğini göstermenin anlamı yok.
 */
export function resolveAuthProviders(env: {
  master: string | undefined
  google: string | undefined
  spotify: string | undefined
  apple: string | undefined
}): readonly ResolvedAuthProvider[] {
  if (!authProvidersEnabled(env.master)) return []

  const ready: Record<AuthProviderId, boolean> = {
    google: providerEnabled(env.google),
    spotify: providerEnabled(env.spotify),
    apple: providerEnabled(env.apple),
  }

  return AUTH_PROVIDERS.map((p) => ({ ...p, ready: ready[p.id] }))
}
