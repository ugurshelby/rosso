import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

/**
 * Spotify GİRİŞ sağlayıcısı ile Spotify VERİ bağlantısı arasındaki köprü.
 *
 * ─── Neden bu dosya var ─────────────────────────────────────────────────
 * FAZ KİMLİK-V2'de Spotify bir giriş sağlayıcısı oldu (Sahip, 2026-08-13).
 * Bu, Rosso'da daha önce olmayan bir DURUM üretti:
 *
 *   Kullanıcı Spotify ile giriş yapar → `auth.identities`'te bir Spotify
 *   kaydı oluşur → ama `platform_connections`'ta HİÇBİR ŞEY oluşmaz →
 *   dashboard'a düşer ve **hiç müziği yoktur.**
 *
 * Kullanıcı açısından bu bir çelişkidir: *"Spotify ile girdim, neden
 * verilerim yok?"* Genel "Spotify'ı bağla" kartı bu soruyu cevaplamaz —
 * kullanıcı zaten Spotify'la girdiğini biliyor.
 *
 * ─── Karar: iki token, iki ayrı iş ──────────────────────────────────────
 * `platform_connections` TEK GERÇEK; `auth.identities` token'ı ASLA
 * okunmaz. Bu keyfi bir tercih değil — ikisi aynı işi yapmıyor:
 *
 *   • `auth.identities` token'ı  → KİMLİK KANITI. Yalnız `user-read-email`
 *     kapsamı var; onunla `/v1/me/player/recently-played` çağrılamaz.
 *     Görevi giriş anında biter.
 *   • `platform_connections`     → VERİ ANAHTARI. 9 scope, AES-256-GCM
 *     şifreleme, yenileme eşiği, cooldown durumu, allowlist alanları.
 *
 * "Hangisi taze?" sorusu bu yüzden yanlış sorudur: paylaşılan bir durum
 * yok, senkronlanacak bir şey de yok.
 *
 * Tam gerekçe: `docs/decisions/spotify-giris-saglayicisi-3-soru.md`
 */

/** Bir kullanıcının Spotify ile ilişkisinin tam hâli. */
export interface SpotifyKimlikDurumu {
  /** Spotify ile GİRİŞ yapmış mı? (`auth.identities`'te spotify kaydı) */
  girisVar: boolean
  /** Spotify VERİ bağlantısı aktif mi? (`platform_connections`) */
  veriBaglantisiVar: boolean
  /**
   * Spotify ile girdi ama verisini bağlamadı — özel çağrı gerektiren durum.
   *
   * ⚠ Bu iki bayrağın türevi ama ayrı alan olarak veriliyor: çağıran taraf
   * mantığı yeniden kurarsa zamanla iki yerde iki farklı kural oluşur.
   */
  veriBaglantisiEksik: boolean
}

/**
 * Kullanıcının Spotify ile giriş yapıp yapmadığını `auth.identities`'ten okur.
 *
 * ⚠ `service_role` şart: `auth` şeması istemciye kapalıdır ve `authenticated`
 * rolü `auth.identities`'i okuyamaz. Bu bir sistem sorgusu — kullanıcı
 * adına yapılan bir okuma değil, çağıran taraf `userId`yi zaten doğrulamış
 * durumda.
 *
 * ⚠ **Yalnız sağlayıcının VARLIĞINA bakar, token'ına DEĞİL.** Bu bilinçli:
 * `identity_data` içindeki sağlayıcı token'ını okumak bu dosyanın varlık
 * sebebine aykırıdır (yukarıdaki karar). Nöbetçi test bunu koruyor.
 */
async function spotifyGirisiVarMi(userId: string): Promise<boolean> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user) return false

    return (data.user.identities ?? []).some((i) => i.provider === 'spotify')
  } catch (err) {
    /*
     * Sessiz kalmıyoruz ama akışı da kırmıyoruz: bu bilgi bir UYARI
     * göstermek için kullanılıyor. Okunamazsa en kötü ihtimalle kullanıcı
     * genel bağlantı kartını görür — kırık bir dashboard'dan iyidir.
     */
    void systemLog({
      operation: 'spotify_kimlik',
      platform: 'spotify',
      severity: 'warn',
      errorCode: 'identities_okunamadi',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

/** Aktif Spotify veri bağlantısı var mı? */
async function veriBaglantisiVarMi(userId: string): Promise<boolean> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('user_id', userId)
    .eq('platform', 'spotify')
    .eq('is_active', true)
    .maybeSingle()

  return Boolean(data)
}

/**
 * Kullanıcının Spotify durumunu tek seferde çözer.
 *
 * İki sorgu paralel koşar — biri diğerini beklemez, ikisi de dashboard
 * yolunda ve sıralı koşmaları sayfayı boşuna geciktirirdi.
 */
export async function spotifyKimlikDurumu(userId: string): Promise<SpotifyKimlikDurumu> {
  const [girisVar, veriBaglantisiVar] = await Promise.all([
    spotifyGirisiVarMi(userId),
    veriBaglantisiVarMi(userId),
  ])

  return {
    girisVar,
    veriBaglantisiVar,
    veriBaglantisiEksik: girisVar && !veriBaglantisiVar,
  }
}

/**
 * Aynı Spotify hesabı birden çok Rosso kullanıcısına bağlı mı?
 *
 * ─── Neden otomatik BİRLEŞTİRMİYORUZ ────────────────────────────────────
 * Hesap birleştirme geri alınamaz; yanlış birleştirme iki kullanıcının
 * dinleme geçmişini kalıcı olarak karıştırır. Rosso'nun tüm anlatısı
 * *"senin hikâyen"* üstüne kurulu — karışmış bir geçmiş, ürünü anlamsız
 * kılar. Bu yüzden çakışma **ölçülür ve raporlanır**, sessizce uygulanmaz.
 *
 * ─── Neden `spotify_user_id`, e-posta değil ─────────────────────────────
 * Üç ölçülmüş sebep:
 *   1. Spotify `/v1/me` yanıtında `email` **null** gelebilir.
 *   2. Verse bile FARKLI olabilir — canlı örnek: bir kullanıcının Rosso
 *      e-postası ile Spotify hesabının e-postası tutmuyor (Facebook/Apple
 *      girişiyle açılmış hesap).
 *   3. E-posta değişir; `spotify_user_id` değişmez.
 *
 * @returns Çakışan `user_id` listesi (tek kullanıcı = çakışma yok = boş dizi).
 */
export async function spotifyKimlikCakismasi(spotifyUserId: string): Promise<string[]> {
  if (!spotifyUserId) return []

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'spotify')
    .eq('spotify_user_id', spotifyUserId)

  if (error || !data || data.length <= 1) return []

  const kullanicilar = [...new Set(data.map((r) => r.user_id))]
  if (kullanicilar.length <= 1) return []

  void systemLog({
    operation: 'spotify_kimlik',
    platform: 'spotify',
    severity: 'warn',
    errorCode: 'spotify_hesabi_coklu_kullanici',
    errorMessage:
      `Aynı Spotify hesabı (${spotifyUserId}) ${kullanicilar.length} Rosso ` +
      `kullanıcısına bağlı: ${kullanicilar.join(', ')}. Birleştirme ELLE ` +
      `yapılır — otomatik birleştirme veri karıştırma riski taşır.`,
  })

  return kullanicilar
}
