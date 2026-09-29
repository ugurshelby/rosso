# Kişisel Rosso (V2) — Sosyal Katmansız Ana Hat

> **Otorite:** Bu karar çelişkide kazanır. **Karar tarihi:** 2026-09-25 (Sahip).
> **Tarihçe:** 2026-08-31 tekil sahip dönemi → 2026-09-11 çok kullanıcılı sosyal mimari → 2026-09-15 dörtlü klasör izolasyonu → **2026-09-25 V2: kişisel, sosyal katmansız**.
> Felsefe: [`../vision/kuzey-yildizi.md`](../vision/kuzey-yildizi.md) §Kişisel Rosso.

---

## Karar

Rosso artık sosyal bir ürün değil. **Her kullanıcı yalnızca kendi verisini görür ve kullanır; kullanıcılar birbiriyle iletişime geçmez.**

| Alan | V2'deki hâl |
| :--- | :--- |
| Sayfalar | Social, Messages, Discover, `/u/[username]`, Profile, Onboarding **silindi**. Profil Ayarlar'a kaynaştı (hesap adı, e-posta, şifre) |
| Navigasyon | Home > Playlists / Taste > Recap / History (masaüstünde yukarıdan aşağı, mobilde ortadan kenara). Taste, Social'ın yerinde |
| Taste'e taşınanlar | Top 5 (kendi geçmişinden), dinleme serisi, keşif skoru |
| Spotify bağlantısı | BYOC: kullanıcı kendi dev app'ini kurar, Client ID/Secret'ı girer (`/data` sihirbazı); ZIP'ini kendisi yükler |
| Ortak havuz | Şarkı/sanatçı kataloğu, zenginleştirme (tür, kapak, ISRC) ve yapay zekâ — kimsenin verisini kimseye göstermez |
| Mobil | `mobile/` → `github.com/ugurshelby/rosso` (herkese açık; kullanıcı indirip kendi cihazında derler). 5 sekme: Recap · Playlists · Home · Taste · History |
| Admin | Bağımsız repo (`rosso-admin`); sosyal alanlar "aktif değil". Kullanıcı silme: işaretle (30 gün geri alınabilir) + e-posta onaylı kalıcı sil |
| Silme işareti | `account_deletions` tablosu (migration 0354) — sosyal profilden bağımsız |

## Korunanlar ve kurallar

- **Sosyal sürüm silinmedi:** `sosyal-son` git etiketi (kök, web, admin, worker) ve yerel `_arsiv/sosyal-son/`. Geri dönüş: `git checkout -b sosyal sosyal-son`.
- **DB ortaktır, şema yalnızca eklemelidir.** Sosyal tablolar (`follows`, `messages`, `conversations`, `match_*`, `social_profiles`, `profile_*` …) durur; **DROP yok** (yıkıcı → Sahibe sorulur). Eski sosyal veri hiçbir amaçla işlenmez; hesap silinince CASCADE ile gider.
- **Geri eklenmez:** Sosyal kod, kullanıcılar arası görünürlük ve iletişim yeni işlerde önerilmez.
- **Sıfır maliyet mimarisi sürer:** 7/24 sunucu yok; günlük işler Supabase `pg_cron` (10 iş), ağır işler on-demand GitHub Actions worker'ında.
- **Hukuki:** `/privacy` (KVKK) V2'ye göre güncellendi; kayıt formunda aydınlatma bildirimi var.

## Bekleyen kararlar (Sahip)

1. Eski sosyal veri kalıcı temizlensin mi? (yıkıcı — onay ister; şimdilik hesap silinene kadar durur)
2. Sosyal tabloların kod tarafındaki kalıntıları (worker eşleşme paketi, `social_profiles` okuyan eski yardımcılar) ayrı bir turda temizlenebilir.

---

## 2026-09-29 — Son nokta: "kendi kurulumun" + davetli kişisel Rosso

**Karar (Sahip):** Rosso bitirilip elden çıkarılıyor. Sahibin kendi Rosso'su (mevcut repolar, Vercel, Supabase) bakım gerektirmeden çalışmaya devam eder; herkesin kendi kurabilmesi için AYRI, sıfır geçmişli, herkese açık bir portfolyö reposu (`ugurshelby/rosso`, monorepo) üretilir. Satış hedeflenmiyor.

| Konu | Karar |
| :--- | :--- |
| Kayıt | **Davet listeli kapı** (migration 0359): `izinli_eposta` tablosu + `auth.users` tetikleyicisi. İlk kayıt otomatik SAHİP olur, sonra kayıt kapanır; sahip Ayarlar → "Arkadaşını davet et"ten davet ekler. Spotify Development Mode'da aynı e-posta Dashboard → User Management'a elle eklenir. |
| Diğer 33 hesap | Silinmek üzere işaretlenir (`account_deletions`, 30 gün geri alınabilir, sonra `account-purge` cron'u siler). Toplu işaretleme Sahibin SQL'iyle (bkz. `docs/reference/son-manuel-adimlar.md` §1). |
| AI | **17 Aralık 2026 00:00 UTC'de otomatik kapanır** (`web/src/lib/ai/ai-kapanis.ts`; tek nokta `vertexYapilandirmasi()`). Yeniden açmak: Vercel `AI_KAPANIS_TARIHI`. Yayın kopyasında kilit kapalıdır. |
| Mobil | Projeden çıkarıldı (yerel kopya `_arsiv/mobil-son/`). `rosso-mobile` GitHub reposunu Sahip siler. `web/` altındaki mobil için yazılmış API rotaları şimdilik durur. |
| Admin | Yayına GİRMEZ (servis anahtarıyla veriye erişen auth'suz bir kopya risklidir); özel `rosso-admin` reposunda kalır. |
| Worker | `rosso-worker` özel repoya çekilir (canlı sistemin arka ucu: yedek + katalog bakımı). Yayın monoreposunda `worker/` temiz bir kopyadır. |
| Sosyal | Kalıcı olarak geri getirilmez: ortak veritabanı ister, kendi-kurulum modeliyle çelişir. `sosyal-son` etiketi "bilerek arşivlendi" hikâyesidir. |
| Yayın | `scripts/yayin-hazirla.mjs` (kök repo) temiz kopyayı üretir: kişisel veri env'e çevrilir, şema tek `schema.sql`'e indirilir, secret taraması yapılır. |

