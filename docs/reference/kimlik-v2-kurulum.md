# KİMLİK-V2 kurulumu — Sahibin manuel işleri

> **Kod tarafı tamamen bitti** (2026-08-13). Google + Apple ile giriş
> web ve mobilde hazır, test edilmiş, canlıya çıkmış durumda —
> ama **kapalı**. Aşağıdaki adımlar tamamlanınca açılır.
>
> Bu adımlar yalnızca panelden yapılabilir (Supabase/Google/Apple
> hesap sahibi yetkisi gerekir), bu yüzden Sahibe bırakıldı.

---

## Sıra önemli

Bayrağı **en son** açın. Sağlayıcı Supabase'de tanımlı değilken düğme
görünürse kullanıcı "Unsupported provider" hata sayfasına düşer.

---

## 1) Google — Google Cloud Console

1. https://console.cloud.google.com → proje seç (veya yeni oluştur)
2. **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - App name: `Rosso`
   - Support email + Developer contact: kendi e-postanız
   - Scopes: varsayılan (`email`, `profile`, `openid`) — ek scope YOK
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs — **tam olarak** şunu ekleyin:
     ```
     https://<SUPABASE-PROJE-REF>.supabase.co/auth/v1/callback
     ```
     > ⚠ Bu adres **Supabase'in** adresidir, Rosso'nun değil. Proje
     > ref'ini Supabase panelinde Settings → API'de görürsünüz.
4. Çıkan **Client ID** ve **Client Secret**'ı not alın

## 2) Apple — Apple Developer

> Apple Developer Program üyeliği gerekiyor (yıllık ücretli).
> **App Store kuralı:** iOS uygulamasında Google girişi sunuluyorsa
> Sign in with Apple da sunulmak ZORUNDA. Mobil yayına çıkacaksa bu
> adım atlanamaz.

1. https://developer.apple.com/account → **Certificates, IDs & Profiles**
2. **Identifiers → App ID** (`com.rosso.mobile`) → Sign in with Apple: ✔
3. **Identifiers → Services ID** oluştur (ör. `com.rosso.web`)
   - Sign in with Apple → Configure
   - Return URLs:
     ```
     https://<SUPABASE-PROJE-REF>.supabase.co/auth/v1/callback
     ```
4. **Keys → yeni key** → Sign in with Apple ✔ → `.p8` dosyasını indir
   (⚠ bir kez indirilir, kaybolursa yenisi üretilir)
5. Not alın: **Team ID** · **Key ID** · **Services ID** · `.p8` içeriği

## 3) Supabase — sağlayıcıları aç

Supabase panel → **Authentication → Providers**

- **Google**: enable → Client ID + Client Secret (adım 1)
- **Apple**: enable → Services ID + Team ID + Key ID + `.p8` içeriği (adım 2)

Ardından **Authentication → URL Configuration**:

- **Site URL**: `https://<rosso-canlı-adresi>`
- **Redirect URLs** listesine ekleyin:
  ```
  https://<rosso-canlı-adresi>/api/auth/callback
  rosso://auth-callback
  ```
  > ⚠ `rosso://auth-callback` **mobil için şart**. Eksikse telefonda
  > giriş tarayıcıda takılır, uygulamaya geri dönmez.

## 4) Bayrakları aç (en son)

> **🔴 2026-08-14 değişikliği:** Artık **iki kademeli** bayrak var.
> Ana şalter öbeği görünür yapar; sağlayıcı başına şalter o düğmenin
> *çalışır* olduğunu söyler. Sebep: Sahibin Apple Developer üyeliği
> yok, ama Apple düğmesi tasarımda duruyor. Tek bayrak olsaydı Google'ı
> açmak Apple'ı da açar ve kullanıcıyı hata sayfasına düşürürdü.
>
> Kapalı sağlayıcı **gizlenmez** — pasif "yakında" rozetiyle görünür.

**Vercel** → Project Settings → Environment Variables:

```
NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED = true    # ana şalter
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED    = true
NEXT_PUBLIC_AUTH_SPOTIFY_ENABLED   = true
NEXT_PUBLIC_AUTH_APPLE_ENABLED     = false   # hesap yok → pasif kalır
```

**Mobil** (`apps/mobile/.env` veya EAS secret):

```
EXPO_PUBLIC_AUTH_PROVIDERS_ENABLED = true
EXPO_PUBLIC_AUTH_GOOGLE_ENABLED    = true
EXPO_PUBLIC_AUTH_SPOTIFY_ENABLED   = true
EXPO_PUBLIC_AUTH_APPLE_ENABLED     = false
```

> Ana bayrak `true` olmadan öbek **hiç render edilmez**. Sağlayıcı
> bayrağı `false` iken düğme görünür ama tıklanamaz — ve sunucu ucu da
> onu reddeder (arayüzdeki kilit tek başına yeterli değil, test edildi).

### ⚠ Bayrak kapalıyken düzen SINANAMAZ (2026-08-18 dersi)

Bu bayraklar hiçbir ortamda tanımlı değildi (`.env.example`'da bile yoktu),
bu yüzden sağlayıcı öbeği **hiç render edilmemişti** — ve içinde bir düzen
kırığı aylarca fark edilmeden durdu: `.rightPanel` yön belirtilmemiş bir
flex kabıydı (`row`), öbek eklendiği anda kartın **yanına** diziliyordu.
390px ekran 625px'e taşıyor, "ile devam / et" diye kırılıyor, etiketler
üst üste biniyordu.

Hiçbir otomatik kontrol yakalayamazdı: bayrak kapalıyken ikinci çocuk
hiç var olmuyor, `/login` düzen testleri sorunsuz geçiyordu.

**Bu yüzden:** bayrakları açtıktan sonra `/login` ve `/register`'a
masaüstü + tablet + mobilde **gözle bakın**. Nöbetçi test eklendi
(`e2e/layout-audit.spec.ts` → "sağlayıcı düğmeleri"), ama o da yalnız
`NEXT_PUBLIC_AUTH_PROVIDERS_ENABLED=true` iken koşar; kapalıyken
kendini `skip` eder — yani yeşil görmek "düzen sağlam" demek değildir.

Düzen düzeltildi ve dört kırılımda ölçüldü (1440 · 834 · 390 · 375):
taşma yok, üç düğme birebir eşit, 48px dokunma hedefi korunuyor.

### Spotify için ek adım (Google/Apple'dan farklı)

Spotify Developer Dashboard → uygulamanız → **Redirect URIs**:

```
https://<SUPABASE-PROJE-REF>.supabase.co/auth/v1/callback
```

> ⚠ Bu, Rosso'nun **veri bağlantısı** için kullandığı redirect'ten
> AYRIDIR — ikisi de listede durmalı, biri diğerinin yerine geçmez.
>
#### 🔴 SCOPE ALANINA NE YAZILACAK — en kritik adım

Supabase → Authentication → Providers → Spotify → **Scopes** alanına
**yalnız şunu** yazın:

```
user-read-email
```

⚠ **9 scope'u buraya YAZMAYIN.** Veri bağlantısının izinleri
(`playlist-modify-*`, `user-library-modify`, `ugc-image-upload` …) ayrı
bir akışta, kullanıcı "Spotify'ı bağla" dediğinde isteniyor. Giriş
ekranında istenirse kullanıcı daha hesap açmadan *"playlist'lerini
değiştirebilirim"* onayı görür — kayıt hunisindeki en ağır sürtünme.

Karar ve tam gerekçe:
`../decisions/spotify-giris-saglayicisi-3-soru.md`

---

## Doğrulama (bayrak açıldıktan sonra)

1. `/login` sayfasında "Google ile devam et" düğmesi görünüyor mu?
2. Tıklayınca Google hesap seçme ekranı geliyor mu?
3. Seçtikten sonra `/dashboard`'a düşüyor mu?
4. Supabase → Authentication → Users'ta yeni kayıt `provider: google`
   olarak görünüyor mu?
5. Mobilde: düğme → tarayıcı → hesap seç → **uygulamaya geri dönüş**

Herhangi biri olmuyorsa `/login?error=…` adresindeki koda bakın:

| Kod | Anlamı |
| --- | --- |
| `provider_disabled` | Ana bayrak veya o sağlayıcının bayrağı `true` değil (adım 4) |
| `oauth_start_failed` | Supabase'de sağlayıcı açık değil / anahtar yanlış (adım 3) |
| `auth_failed` | Redirect URL listesinde eksik (adım 3) |

---

## Spotify — karar 2026-08-14'te DEĞİŞTİ

> ⚠ Bu bölüm eskiden *"Spotify giriş sağlayıcısı DEĞİL"* diyordu.
> Sahip kararı değiştirdi: **Spotify de giriş/kayıt seçeneği olacak.**
> Eski gerekçeler silinmedi çünkü hâlâ **çözülmesi gereken riskler**:

> ✅ **2026-08-25 — BACKEND TURU bitti, üç soru da kapandı.**
> Tam gerekçe:
> `../decisions/spotify-giris-saglayicisi-3-soru.md`

**① Giriş hangi izinleri ister?** Yalnız `user-read-email`. Veri
bağlantısının 9 scope'u giriş akışına girmez; kullanıcı Spotify onay
ekranını iki kez görür ve bu bilinçlidir — ikinci onay, değeri gördükten
sonra verilir. **Panelde Scopes alanına yalnız `user-read-email` yazın.**

**② Hangi token taze?** `platform_connections` **tek gerçektir**;
`auth.identities` token'ı asla okunmaz. İkisi aynı işi yapmıyor:
giriş token'ı yalnız `user-read-email` kapsamına sahip — onunla dinleme
geçmişi zaten okunamaz. Görevi giriş anında biter. Senkron gerekmez
çünkü paylaşılan durum yok. Kararı nöbetçi test koruyor
(`src/lib/auth/spotify-kimlik.test.ts`).

**③ E-posta gelmezse?** `spotify_user_id` ana anahtar, e-posta yalnız
ikincil ipucu. ⚠ Rosso hesapları **kendiliğinden birleştirmez** —
birleştirme geri alınamaz ve yanlışı iki kullanıcının geçmişini kalıcı
karıştırır. Çakışma ölçülür ve `system_logs`'a uyarı düşer; kararı insan
verir.

**🔴 Yeni durum — giriş veri bağlantısı AÇMAZ.** Spotify ile giren
kullanıcının `platform_connections` kaydı yoktur, yani dashboard'ı
boştur. Bu karşılandı: o kullanıcıya genel "Spotify'ı bağla" kartı değil,
durumu bilen özel bir çağrı gösterilir
(`spotify_veri_izni_gerekli` uyarısı).

**Frontend tarafı bu üç sorudan bağımsız olarak tamamlandı:** üç düğme
eşit geometride, marka renklerinde, web ve mobilde aynı.

**Hesap birleştirme** Supabase'in kendi davranışına bırakıldı: aynı
e-posta ile gelen farklı sağlayıcılar tek `auth.users` kaydına bağlanır
(`auth.identities` çoklu satır). 2026-08-13 ölçümünde 34 kullanıcının
tamamı `provider=email` olduğu için **geriye dönük çakışma riski yok**.
