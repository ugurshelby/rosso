# Rosso — Arka Plan Rehberi

> **Bu doküman kimin için?** Sahip için. Rosso'nun **görünmeyen** yüzünü —
> veritabanı, worker, algoritmalar, API'ler, çalışma prensipleri — teknik jargona
> boğulmadan, analojilerle anlatır. Amacı: Sahibin projenin arka planına
> **hakim olması** ve gözden geçirip notlar ekleyebilmesi.
>
> **Kapsam:** Yalnızca arka plan. Frontend/UI/UX'e girilmez (Sahip onu zaten
> görüp yorumlayabiliyor).
>
> **Nasıl okunmalı?** Baştan sona. Her bölüm bir öncekinin üstüne kurar. Not
> eklemek istediğiniz yere doğrudan yazın — `> NOT (Sahip):` diye işaretlerseniz
> ben sonra kolayca bulurum.
>
> **Son güncelleme:** 2026-07-15 · **Doğrulama:** canlı veritabanından ölçülerek
> yazıldı (tahmin değil). Felsefe notu §1'e eklendi (Sahip, 2026-07-15).

> **⚠ 2026-09-25 (V2) notu:** Bu rehber 2026-07-15'te yazıldı. Sonradan değişenler:
> **Railway kapatıldı** (worker artık on-demand GitHub Actions; günlük işler Supabase `pg_cron`),
> **sosyal katman ve platform taşıma kaldırıldı** (ilgili bölümler silindi),
> admin paneli yeniden yazıldı. Cron tablosu (§6) ve tablo listesi (§5) ölçülmüş 07-15 durumunu
> gösterir; güncel iş listesi için `admin` → "Arka plan işleri". Karar: [`decisions/kisisel-rosso.md`](decisions/kisisel-rosso.md).

---

## 📑 İçindekiler

1. [Rosso Nedir — Tek Cümlede Sistem](#1)
2. [Büyük Resim — Üç Ayrı Beyin](#2)
3. [Teknoloji Yığını — Neyle Yapılmış](#3)
4. [Veri Nereden Geliyor — Üç Kapı](#4)
5. [Veritabanı — Bilginin Yaşadığı Yer](#5)
6. [Worker — Arka Plandaki İşçiler (Cron'lar)](#6)
7. [Beyin Katmanı — RPC'ler (Hesaplamalar Nerede Yapılır)](#7)
8. [Modül Modül — Her Özellik Nasıl Çalışır](#8)
9. [Güvenlik — Kim Neyi Görebilir](#9)
10. [Kota ve Rate-Limit — En Kırılgan Nokta](#10)
11. [Admin Paneli — Kontrol Kulesi](#11)
12. [Bilinen Zayıf Noktalar ve Teknik Borç](#12)

---



## 1. Rosso Nedir — Tek Cümlede Sistem

Rosso, **müzik dinleme geçmişini alıp anlamlı bir şeye dönüştüren** bir sistem.

Üç şey yapar:

1. **Veri Toplar** — Spotify, YouTube Music, Apple Music'ten ne dinlediğini çeker.
2. **Analiz Eder** — bu ham veriden "zevk profili", "yıllık recap", "müzikal yolculuk" çıkarır.
3. **Sunar** — müzik verini hikayeye dönüştürür (Taste, Recap, Journey) ve playlist üretir; herkes yalnız kendi verisini görür.

**Analoji:** Rosso bir **değirmen** gibi. Bir yandan ham buğday (dinleme kayıtları)
giriyor, öbür yandan un (recap, taste, eşleşme) çıkıyor. Bu dokümanın konusu
değirmenin **içi** — çarklar nasıl dönüyor.

> **NOT (Sahip — 2026-07-15, felsefe):** Rosso'nun amacı "en çok özelliği olan
> uygulama" olmamalı. Amacı **"insanın müzik kimliğini en iyi anlatan uygulama"**
> olmak. Merkezde ortak müzik verisi var; Recap / Taste / Journey / Dating /
> Social / Playlist hep o veriden türüyor. Uzun vadede en güçlü silah **Journey**
> ("hayatının yıllarını müzik üzerinden anlatan kişisel hikâye") — Spotify zaten
> Wrapped yapıyor. Dating "Tinder ama müzik" değil; müzik verisi kişilik sinyali.
> En büyük risk: özellik çöplüğü. Teknik temel oluştu; asıl ihtiyaç UX ·
> onboarding · animasyon · yazı dili — ilk 60 saniyede "neden var?" hissi.
> Konumlandırma: *"Müziğin üzerinden seni anlatıyorum."*
> Tam metin + yakınlık takibi → `docs/vision/kuzey-yildizi.md`.
> Uygulamalı vizyon (Veri→Anlam→Kimlik, landing, bekleme, dil, anlatıcı) →
> `docs/vision/uygulamali-vizyon.md`.
> Teşhis: sorun özellik eksikliği değil — hikâyenin her yüzeye aynı güçle
> yansımaması. Spotify veri gösterir; Rosso insanı anlatır. Rakip = kendi hafıza.

---



## 2. Büyük Resim — Üç Ayrı Beyin

Rosso tek bir program değil. **Üç ayrı parça** birbiriyle konuşuyor:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   1. WEB APP     │      │  2. VERİTABANI   │      │   3. WORKER     │
│   (Next.js)      │◄────►│   (Supabase)     │◄────►│   (Python)      │
│                  │      │                  │      │                 │
│ Kullanıcının     │      │ Her şeyin        │      │ Arka planda     │
│ gördüğü site +   │      │ saklandığı +     │      │ sessizce çalışan │
│ anlık işlemler   │      │ hesaplandığı yer │      │ işçiler (cron)  │
│                  │      │                  │      │                 │
│ Vercel'de        │      │ Postgres         │      │ Railway'de      │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

**Her birinin işi ayrı:**


| Parça          | Ne yapar                                                              | Analoji                                          |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| **Web App**    | Kullanıcı butona basınca olan şey. Sayfa gösterir, anlık istek yapar. | **Kasiyer** — müşteriyle yüz yüze, hızlı işler   |
| **Veritabanı** | Her şeyi saklar VE ağır hesapları yapar.                              | **Kütüphane + muhasebeci** — hem arşiv hem hesap |
| **Worker**     | Kimse bakmazken çalışır: veri çeker, recap üretir.                    | **Gece bekçisi** — sen uyurken iş yapar          |


> **Önemli ilke:** Ağır hesaplamalar (recap, taste, eşleşme) **veritabanının içinde**
> yapılır, web app'te değil. Neden? Veri zaten orada — hesabı veriye götürmek,
> veriyi hesaba taşımaktan hızlı. (Buna bölüm 7'de döneceğiz.)

---



## 3. Teknoloji Yığını — Neyle Yapılmış

Sade tablo:


| Katman           | Teknoloji                   | Ne işe yarar (analoji)                      |
| ---------------- | --------------------------- | ------------------------------------------- |
| Site iskeleti    | **Next.js 16** + React 19   | Sitenin duvarları ve odaları                |
| Görünüm dili     | TypeScript (katı mod)       | "Yanlış tuğla koyarsan uyarırım" diyen usta |
| Stil             | Tailwind v4 + CSS Modülleri | Boya ve döşeme                              |
| Veritabanı       | **Supabase** (Postgres)     | Arşiv + kasa + hesap makinesi               |
| Arka plan işçisi | **Python**                  | Gece bekçisi                                |
| Barınma (site)   | **Vercel**                  | Sitenin kirada olduğu bina                  |
| Barınma (worker) | **Railway**                 | İşçilerin çalıştığı atölye                  |


**Geliştirme portu:** Site yerelde `3847` portunda çalışır.

**Kritik kural:** Sırlar (şifreler, API anahtarları) `.env.local` dosyasında durur,
asla koda yazılmaz, asla ekrana basılmaz.

---



## 4. Veri Nereden Geliyor — Üç Kapı

Rosso'ya müzik verisi **üç ayrı yoldan** girer. Bu ayrımı anlamak önemli, çünkü
her kapının kendi kısıtı var.

### Kapı 1 — Canlı Bağlantı (API)

Kullanıcı Spotify/YT Music hesabını bağlar. Worker düzenli aralıklarla
"en son ne dinledi?" diye sorar.

- **Analoji:** Her sabah gazete dağıtıcısının kapına bıraktığı yeni haberler.
- **Kısıt:** Platformlar günde sınırlı sayıda soru sormaya izin verir (bkz. bölüm 10).
- **Spotify:** son 50 şarkı · **YT Music:** beğenilenler + geçmiş.

### Kapı 2 — Toplu Dosya Yükleme (Export/ZIP)

Kullanıcı Spotify'dan "tüm verimi indir" der, gelen ZIP'i Rosso'ya yükler.

- **Analoji:** Bütün eski gazete arşivini tek seferde kütüphaneye bağışlamak.
- **Değeri:** Yıllara yayılan tam geçmiş — recap ve journey bunsuz zayıf kalır.
- İşleyen: `export_runner.py` (worker).

### Kapı 3 — Zenginleştirme (Enrichment)

Ham dinleme kaydında sadece "şarkı adı + sanatçı" var. Tür (genre), süre, albüm
gibi bilgiler **eksik**. Worker bunları dış kaynaklardan (Spotify, Deezer,
MusicBrainz, Last.fm) tamamlar.

- **Analoji:** Kütüphaneye gelen kitabın kapağında sadece adı var; görevli gidip
yazarını, türünü, sayfa sayısını araştırıp künyeyi tamamlıyor.
- **En kırılgan kapı:** Dış kaynaklara çok istek atınca ceza yenir (bkz. bölüm 10).

> **NOT — Görseller neden yok?** Şarkı/sanatçı görselleri hiçbir kapıdan **kalıcı
> saklanmaz** (telif/ToS gereği). Her gösterimde canlı olarak Spotify'dan çekilir
> (`/api/images/...`). Bu yüzden Spotify cezası sırasında **görseller de kaybolur** —
> ceza bitince kendiliğinden geri gelir.

---



## 5. Veritabanı — Bilginin Yaşadığı Yer

**51 tablo** var. Hepsini ezberlemeye gerek yok; **gruplar** halinde düşün.

### Grup A — Ham Müzik Verisi (en kalabalık)


| Tablo                | Ne tutar                                            | Kaç satır (bugün) |
| -------------------- | --------------------------------------------------- | ----------------- |
| `play_events`        | Her tekil dinleme olayı ("şu an şu şarkıyı çaldın") | **124.483**       |
| `tracks`             | Şarkı künyeleri (ad, sanatçı, tür, süre, ISRC…)     | 13.295            |
| `playlist_tracks`    | Hangi şarkı hangi playlist'te                       | 5.246             |
| `artists`            | Sanatçı künyeleri (ad, tür)                         | 3.234             |
| `podcast_events`     | Podcast dinlemeleri (müzikten ayrı)                 | 719               |
| `liked_songs_events` | Beğenilen şarkılar                                  | 143               |


**Analoji:** `play_events` sistemin **kalbi**. Her dinleme buraya bir satır düşer.
Diğer her şey (recap, taste, journey) sonuçta bu tablodan hesaplanır.

### Grup B — Hesaplanmış Sonuçlar (ham veriden türetilen)


| Tablo                     | Ne tutar                                                 |
| ------------------------- | -------------------------------------------------------- |
| `user_taste_profile`      | Kullanıcının zevk parmak izi (6 eksen)                   |
| `user_track_weights`      | Her şarkının kullanıcı için "ağırlığı" (ne kadar önemli) |
| `user_genre_vectors`      | Tür tercihlerinin matematiksel özeti                     |
| `user_top_strips`         | "Şu An" ve "Değişmeyenler" şeritleri                     |
| `recaps`                  | Üretilmiş aylık/yıllık özetler (120 adet)                |
| `journey_year_milestones` | Journey anketi cevapları                                 |


**Analoji:** Bunlar **pişmiş yemek**. Ham malzeme Grup A'da; Grup B, worker'ın
gece pişirip tabağa koyduğu hazır sonuçlar. Kullanıcı siteyi açınca yemek zaten
hazır — o an pişirilmez (yoksa sayfa yavaş açılırdı).

### Grup C — Kullanıcı ve Bağlantılar


| Tablo                  | Ne tutar                                                   |
| ---------------------- | ---------------------------------------------------------- |
| `social_profiles`      | Sosyal profil (kullanıcı adı, bio, yaş, konum…)            |
| `platform_connections` | Spotify/YT/Apple token'ları (şifreli)                      |
| `user_plans`           | Kimin free, kimin pro planda olduğu (YENİ — bugün eklendi) |
| `user_consents`        | Kullanıcının onayları (KVKK)                               |


> **Güvenlik notu:** `platform_connections`'taki token'lar **şifreli** durur
> (AES-256). Ham hâlde asla saklanmaz. Konum (`lat/lon`), doğum tarihi gibi
> hassas veriler istemciye asla gönderilmez.

### Grup D — (kaldırıldı)

V2'de sosyal katman yok; sosyal tablolar (`follows`, `messages`, `conversations`, `match_*`, `social_profiles` …) veritabanında DURUR ama kullanılmaz. Bkz. [`decisions/kisisel-rosso.md`](decisions/kisisel-rosso.md).

### Grup E — Sistem ve İş Takibi


| Tablo             | Ne tutar                                                    |
| ----------------- | ----------------------------------------------------------- |
| `pipeline_runs`   | Her cron çalışması burada loglanır (7.085 kayıt)            |
| `api_cooldowns`   | **Devre kesici** — bir platform ceza verirse buraya yazılır |
| `yt_search_quota` | YouTube günlük arama sayacı                                 |
| `system_logs`     | Genel sistem kayıtları                                      |
| `migration_queue` | Taşıma kuyruğu (YENİ — bugün eklendi)                       |


**Analoji:** Grup E, sistemin **kara kutusu**. Bir şey ters giderse önce buraya
bakılır. `pipeline_runs`'a her cron "ben çalıştım, sonuç şu" diye yazar.

---



## 6. Worker — Arka Plandaki İşçiler (Cron'lar)

> **2026-09-11 GÜNCELLEMESİ (Sıfır Maliyet & pg_cron Mimarisi):**
> Railway üzerindeki ücretli Python worker bağımlılığı %100 sonlandırılmıştır.
> Sistem artık sıfır maliyetle **Supabase `pg_cron`** (`invoke_spotify_sync_cron` -> `/api/cron/sync-spotify`, `/api/cron/recap`, vb.)
> ve kullanıcı etkileşimine duyarlı akıllı **Stale-While-Revalidate** tetikleyicileri (`triggerSmartSyncIfNeeded` + 30 dakikalık DB kota kalkanı)
> ile daima taze ve kendi kendini besleyen (self-healing) olarak çalışır.

Tarihsel referans olarak cron işlerinin listesi ve görevleri:


| Cron                      | Ne yapar (analoji)                                            | Ne sıklıkta                                                     |
| ------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `spotify_recently_played` | Spotify'dan son dinlenenleri çeker                            | Sık (saatlik)                                                   |
| `ytmusic_history`         | YT Music dinleme geçmişini çeker                              | Günlük                                                          |
| `ytmusic_liked`           | YT Music beğenilenleri çeker (artık sadece müzik video değil) | Günlük                                                          |
| `enrichment`              | Şarkı türlerini/künyelerini tamamlar                          | Sık                                                             |
| `catalog_backfill`        | ISRC/albüm/süre doldurur                                      | ⏸ **AYLIK (geçici olarak sistem yeniden kurulana kadar durdu)** |
| `taste_refresh`           | Taste profilini yeniden hesaplar                              | Günlük 04:00                                                    |
| `recap_refresh`           | Aylık/yıllık recap üretir                                     | Periyodik                                                       |
| `nightly_sync`            | Gece toplu senkron                                            | Gecelik                                                         |
| `playlist_refresh`        | Playlist'leri tazeler + otomatik senkron kuralları            | Periyodik                                                       |
| `auto_playlist`           | Aylık "top" playlist'i otomatik üretir                        | Aylık                                                           |
| `export`                  | Yüklenen ZIP'leri işler                                       | Kuyruk oldukça                                                  |
| `migration_queue`         | Taşıma kuyruğunu işler (YENİ)                                 | Periyodik                                                       |
| `match_batch`             | Sosyal eşleşme partisi üretir (üç-kulvar) (YENİ, 2026-07-15)  | Günlük 04:30 (`30 4 * * *`)                                     |


**Analoji:** Bir otelin gece ekibi gibi. Biri çamaşır yıkar (enrichment), biri
hesapları kapatır (taste_refresh), biri sabah kahvaltısını hazırlar (recap). Sen
(kullanıcı) sabah kalktığında her şey hazır.

### Bir işçinin anatomisi (hepsi aynı desende)

Her cron iki parçadan oluşur:

1. `**cron/xxx.py`** — sadece **zamanlayıcı**. "Uyandım, işi başlat, sonucu logla."
2. `**pipeline/xxx_runner.py`** — asıl **iş mantığı**.

**Neden ayrı?** Zamanlayıcıyı iş mantığından ayırmak, iş mantığını test etmeyi
kolaylaştırır. (Alarm ile yapılan işi ayırmak gibi.)

> **Kritik kural (acı bir dersle öğrenildi):** Her cron `pipeline_runs`'a sonucunu
> **dürüstçe** yazar. "Başarılı" derken aslında hiçbir şey yapmamışsa, bu bir
> yalandır ve en tehlikeli hata türüdür — çünkü sorun görünmez olur. Bu yüzden
> cron'lar `success` / `partial` / `error` / `empty` / `blocked` diye net konuşur.

### En önemli iki işçi — detay

`**spotify_recently_played`** (kalp atışı):
Spotify sadece **son 50 şarkıyı** veriyor. Bu yüzden sık çekmek zorundayız —
kullanıcı 50'den fazla dinlerse aradakiler kaybolur. Bu cron o boşluğu önler.

`**taste_refresh`** (zevk hesaplayıcı):
Her gece kullanıcının tüm dinleme geçmişini tarayıp zevk profilini yeniden çıkarır.
Ağır bir iş — bu yüzden gece yapılır, kullanıcı beklemez.

---



## 7. Beyin Katmanı — RPC'ler (Hesaplamalar Nerede Yapılır)

Bu bölüm sistemin en **kafa karıştırıcı ama en önemli** kısmı. Yavaş gidelim.

**RPC nedir?** "Veritabanının içinde yaşayan hesap fonksiyonu." Web app veya worker
"şu kullanıcının recap'ini hesapla" der, hesap **veritabanının içinde** yapılır,
sonuç geri döner.

**Neden veritabanının içinde?**

**Analoji:** 100.000 kayıtlık bir defterden ortalama almak istiyorsun. İki yol var:

- **Kötü yol:** Bütün defteri fotokopi çekip (ağdan çekip) eve götür, evde hesapla.
- **İyi yol:** Hesap makinesini defterin yanına götür, orada hesapla, sadece sonucu al.

RPC ikinci yol. Veri zaten veritabanında; hesabı oraya götürüyoruz. `play_events`
124 bin satır — bunu web app'e taşıyıp orada hesaplamak felaket olurdu.

### RPC'ler ne yapar — gruplar halinde

**Taste (zevk) hesaplayıcıları:**


| RPC                               | Ne hesaplar                                   |
| --------------------------------- | --------------------------------------------- |
| `compute_user_track_weights`      | Her şarkının kullanıcı için ağırlığı          |
| `compute_user_genre_vector`       | Tür tercihi vektörü                           |
| `compute_user_identity`           | 6 eksenli kimlik (davranış, ritüel, estetik…) |
| `compute_user_behavioral_signals` | Kararlılık, shuffle, gün ritmi…               |
| `compute_user_mainstream`         | Ne kadar "popüler/niş" dinliyor               |
| `refresh_user_taste`              | Yukarıdakilerin hepsini sırayla çağırır       |


**Analoji:** Bir terzinin ölçü alması gibi. Her RPC farklı bir ölçü alıyor
(boy, bel, kol); `refresh_user_taste` hepsini birden alıp elbiseyi (taste profili) dikiyor.

**Recap üreticileri:**
`build_recap`, `recap_top_tracks`, `recap_top_artists`, `recap_hourly_pattern`,
`recap_platform_breakdown` — bir dönemin (ay/yıl) özetini çıkarır.

**Journey (yolculuk) üreticileri:**
`get_journey_years` (yıl yıl istatistik), `build_journey_arc` (yolculuk eğrisi),
`get_journey_lock_status` (kilit açık mı).

**Eşleşme motoru:**
`pair_match_score` (iki kişinin uyum puanı), `get_match_slots` (günlük eşleşme
adayları), `build_match_batch` (aday havuzu hazırla).

**Taşıma kuyruğu (YENİ):**
`user_migration_capacity_today` (bugün kaç şarkı taşınabilir),
`get_migration_queue` (kuyruk durumu + tahmini bitiş).

> **Toplam ~60 RPC var.** Hepsi `supabase/migrations/` klasöründeki dosyalarda
> tanımlı. Bir hesabın nasıl yapıldığını merak edersen, ilgili RPC'nin adını
> bana söyle, açıklarım.

---



## 8. Modül Modül — Her Özellik Nasıl Çalışır

Şimdi her büyük özelliği **uçtan uca** izleyelim: veri nereden gelir, nasıl işlenir,
nasıl gösterilir.

### 8.1 Taste (Zevk Profili)

**Amaç:** "Sen nasıl bir dinleyicisin?" sorusunu cevaplamak.

**Akış:**

```
play_events (ham dinleme)
    │
    ▼  (gece, taste_refresh cron'u tetikler)
refresh_user_taste RPC → 6 ayrı hesap RPC'si çağırır
    │
    ▼
user_taste_profile + user_genre_vectors + user_top_strips (sonuç tabloları)
    │
    ▼  (kullanıcı /taste sayfasını açınca)
Web app hazır sonucu okur, gösterir
```

**Önemli tasarım:** Taste **iki şerit** halinde tutulur:

- **"Şu An"** — son dönemde ne dinliyorsun (zamanla değişir, decay uygulanır)
- **"Değişmeyenler"** — yıllardır sabit olan çekirdek zevkin (evergreen)

**Analoji:** Gardırobun gibi. "Şu An" = bu sezon giydiklerin. "Değişmeyenler" =
her sezon dönüp giydiğin klasiklerin.

### 8.2 Recap (Dönemsel Özet)

**Amaç:** "Bu ay/yıl neler dinledin?" — Spotify Wrapped benzeri ama sürekli.

**Akış:** `recap_refresh` cron'u → `build_recap` RPC → `recaps` tablosuna yazılır →
kullanıcı `/recap` sayfasında görür.

**Kritik eşik:** Bir dönemde **çok az veri** varsa (ör. 500 dinlemeden az, 3 aktif
aydan az) recap **üretilmez**. Neden? "0 şarkılık recap" saçma olurdu. (Bu, 2018
yılı için gerçekten yaşanmıştı — boş recap üretiliyordu, düzeltildi.)

### 8.3 Journey (Müzikal Yolculuk)

**Amaç:** Yıllar içinde müzik zevkinin nasıl değiştiğini bir hikaye olarak anlatmak.

**İki katman:**

1. **Veri katmanı** — `get_journey_years` her yılın istatistiğini çıkarır (tür,
  keşif oranı, dominant tür, kırılma noktası).
2. **Anket katmanı** — kullanıcı her yıl için "o yıl kariyer/aşk/sosyal hayatın
  nasıldı?" sorularını cevaplar (`journey_year_milestones`).

**İkisi birleşince** anlatı motoru bir paragraf üretir: *"Bekleyen bir yıldı…"*

**Kilit mekanizması:** Journey'i görmek için hem yeterli veri hem anket cevabı
gerekir (`get_journey_lock_status`). Sahibin dediği gibi: "gizem ve emek katmanı."

> **NOT — Kırılma noktası nasıl bulunur?** Bir yıl, bir öncekine göre dominant
> türü değiştiyse VE keşif oranı %15+ düştüyse ya da dinleme %25+ değiştiyse
> "kırılma yılı" işaretlenir. Sahibin verisinde bu **2024**.

### 8.6 Enrichment (Tür/Künye Tamamlama)

**Amaç:** "şarkı adı + sanatçı"dan ibaret ham kaydı zenginleştirmek.

**Tür (genre) nereden gelir?** Tek kaynak yeterli değil, bu yüzden **çok kaynaklı**:
Spotify (sanatçıdan) → Deezer → MusicBrainz → Last.fm sırasıyla denenir.

**Analoji:** Bir kelimenin anlamını bulmak için önce TDK'ya, olmadı Wikipedia'ya,
olmadı sözlüğe bakmak gibi. Biri bulana kadar sırayla.

---



## 9. Güvenlik — Kim Neyi Görebilir 

Rosso'da güvenlik **iki katmanlı**:

### Katman 1 — RLS (Satır Düzeyi Güvenlik)

Her tablonun kendi bekçisi var. "Bu satırı kim görebilir?" kuralı **veritabanında**
tanımlı, koda bırakılmamış.

**Analoji:** Bir apartmanda her dairenin kilidi ayrı. Sen sadece kendi daireni
açabilirsin — komşununkine giremezsin, yönetici bile senin anahtarınla giremez.

Örnek: Sen sadece **kendi** dinleme kayıtlarını görürsün. Başkasının `play_events`'ine
erişemezsin, çünkü RLS kuralı `auth.uid() = user_id` diyor.

### Katman 2 — SECURITY DEFINER Fonksiyonları + Guard

Bazı hesaplar başkasının verisine bakmayı gerektirir (ör. eşleşme puanı iki kişiyi
karşılaştırır). Bunlar özel yetkiyle çalışır ama **içlerinde guard** vardır:
"çağıran kişi bu iki taraftan biri mi?"

> **🔴 Acı ders (bu hafta):** Üç fonksiyonun guard'ı **eksikti**. Kimliksiz bir
> kişi iki gerçek kullanıcının **mesafesini ve engel durumunu** öğrenebiliyordu.
> Kapatıldı. Ders: "güvenlik denetiminin WARN dediği şeyi önemsiz sanma."

### Hassas veri kuralı

Şunlar istemciye **asla** gitmez: ham konum (`lat/lon`), doğum tarihi, cinsiyet
tercihi, şifresi çözülmüş token'lar. Bunlara ihtiyaç duyan hesaplar veritabanının
içinde yapılır, sadece **sonuç** (ör. "12 km uzakta") dışarı çıkar.

NOT: Fable 5 modeli ile güvenlik katmanımızdaki acı derslere kırılgan noktalara bakarız düzeltiriz. Daha sonra yaparız bunu artık backend tarafı tamamlanmaya ve yeni dış servisler vs kalmadığında, örneğin daha smtp mail entegre etmemiz lazım kullanıcı bilgileri kvkk gibi şeyler de var.

---



## 10. Kota ve Rate-Limit — En Kırılgan Nokta

Bu bölüm **en çok dikkat gerektiren** yer. Sahip, bu hafta buradan yandık.

### Sorun ne?

Platformlar (Spotify, YouTube) günde sınırlı sayıda istek kabul eder. Aşarsan
**ceza** verirler — bir süre hiç cevap vermezler.

### İki tür sınır var

**1. Günlük sayı sınırı (kota):**

- **YouTube:** günde 10.000 "birim". Ama fiyatlar farklı:
  - Arama = 100 birim 🔴 (en pahalı)
  - Playlist'e ekleme = 50 birim
  - Okuma = 1 birim (bedava sayılır)
  - **Sonuç:** günde ~66 şarkı taşınabilir (arama+ekleme = 150 birim/şarkı)
- **Önemli:** Bu kota **tüm uygulamaya** ait, kullanıcı başına değil. Sen 65 şarkı
taşırsan friend Bey o gün taşıyamayabilir.

**2. Hız sınırı (rate-limit):**
İstekleri **çok hızlı** atarsan, sayı sınırına takılmasan bile ceza yersin.

> **🔴 CANLI OLAY (2026-07-12) — bu dokümanın en önemli uyarısı:**
> Spotify'a 50 isteği arka arkaya attık. Spotify uygulamayı **6,4 saat**
> cezalandırdı — tek bir istek bile cevap alamadı, görseller kayboldu.
>
> **Ders:** İstekleri arka arkaya atma. Aralarına bekleme koy. Ceza yersen
> **devre kesiciye yaz** (`api_cooldowns` tablosu) ki tekrar denemeyesin.

### Devre kesici nasıl çalışır?

`api_cooldowns` tablosu bir **sigorta** gibi. Bir platform ceza verirse, "bu
platforma X saat dokunma" diye yazılır. Cron'lar iş yapmadan önce buraya bakar —
sigorta atmışsa hiç denemez.

**Analoji:** Elektrik sigortası. Kısa devre olunca atar; sen tamir edene kadar o
hat ölü kalır — ama evin geri kalanı çalışmaya devam eder.

### Plan limitleri (YENİ)

Kullanıcıya kota "YouTube'un sınırı" olarak değil, **"Rosso'nun plan limiti"**
olarak gösterilir:

- **Pro:** günde 65 şarkı
- **Free:** günde 30 şarkı
- owner + a friend → kalıcı Pro

Arkada **iki tavan** birden kontrol edilir: kullanıcının plan hakkı VE uygulamanın
toplam kotası. Hangisi küçükse o geçerli.

NOT: Fable 5 ile sistemi anlamak için testler yaparız kırılgan noktaları buluruz reverse engineering yaparız olası senaryıları deneriz ve bulgulardan yola çıkarak sistemi güçlendiririz. 

---



## 11. Admin Paneli

Admin paneli "sorun var mı, ne yapayım?" paneline dönüştü (Genel durum, Sorunlar + agent talimatı, Sunucu, Arka plan işleri, Katalog, Kullanıcılar). Ayrıntı: `admin/README.md`.

---

## 12. Bilinen Zayıf Noktalar ve Teknik Borç

Dürüst olmak, dokümanın en değerli kısmıdır. Şu an bilinen eksikler:

### 🔴 Aktif sorunlar

1. **Spotify cezası** — 6,4 saatlik rate-limit cezası (2026-07-12), süre çoktan doldu.
  Katalog cron'u hâlâ AYLIK'ta duruyor (ISRC sistemi Fable 5 ile yeniden kurulana
  kadar bilinçli olarak açılmadı).
2. **ISRC doluluk %2,5** — katalog dolgusu çalışmadı. **Fable 5** ile yeniden
  yapılandırılacak (ceza yemeyen, kendi kendine işleyen tasarım).
3. **Görseller** — kalıcı saklanmıyor, canlı çekiliyor; ceza sırasında kayboluyor.
  Plan hazır (bkz. §12 "Ertelenmiş" altındaki not), uygulama ayrı işe bırakıldı.
4. **YT Music playlist ekleme 500'ü** — Sahibin canlı testinde (2026-07-13)
  worker `add_playlist_item_official` 15. şarkıda beklenmeyen bir hata verdi.
  Kota değildi (34/100 kullanım). Kök neden henüz netleşmedi — Railway MCP
  yetkisiz (`railway login` gerekiyor). Bu hatanın kullanıcıya **yanlış** rapor
  edilmesi (matched sayacı) düzeltildi (commit 462ae3f), ama worker'ın kendisi
  hâlâ 15. şarkıda takılabilir — yalnızca artık kullanıcı bunu doğru görecek.

### 🟡 Ertelenmiş / bekleyen

1. **Görsel sistemi** — kalıcı görsel altyapısı hiç kurulmadı (`tracks`/`artists`
  tablolarında görsel sütunu yok). 

NOT: Görsellerin ceza yendiğinde görülememesi can sıkıcı oldu, kalıcı görsel altyapısını kurarır kurmasına ama on binlerce track artist albume vs için depolama maliyetleri ve optimizasyon hız performans nasıl olur tartışalım, direkt çekmek ile aradaki farklara bakalım. 

> **CEVAP (Jarvis, 2026-07-13 akşam):** Plan hazır ve onaylandı —
> `archive/planlar/gorsel-kalici-altyapi-uygulandi.md`. Toptan 16.500 görsel
> indirmek yerine "lazy cache on view": yalnız gerçekten görüntülenen
> track/artist/playlist görseli ilk açılışta arka planda **Supabase Storage**'a
> kaydedilir, bir dahaki sefer Spotify'a hiç gidilmez. Depolama maliyeti bu
> yüzden toptan yaklaşıma göre çok daha düşük — kullanıcılar kataloğun tamamını
> gezmez, yalnız gerçekten baktıkları kadarı dolar (muhtemelen ilk aylarda
> birkaç yüz MB). Uygulama ayrı bir oturuma bırakıldı, açık sorular kapandı.

1. **Taşıma kuyruğu UI** — ✅ **artık YAPILDI** (2026-07-12, bu doküman yazıldıktan
  hemen sonra). `src/components/playlists/migration-queue-panel.tsx`.
  > **CEVAP (Jarvis):** §8.4'te anlatılan "233 şarkılık playlist günler sürer"
  > sorununun **ekranı**. Playlist sayfanızda, yalnızca **bekleyen bir taşıma
  > işi varsa** görünen bir panel: hangi playlist, kaynak→hedef platform, kaç
  > şarkıdan kaçı taşındı (ilerleme çubuğu), tahmini ne zaman biter ("~3 gün ·
  > 15 Temmuz civarı hazır"), ve iki buton — **iptal et** ya da **ertele**
  > (sırayı değiştirmek için). İş yoksa panel hiç render edilmez, sayfayı
  > meşgul etmez. Arkasındaki motor `src/lib/migration/queue.ts` — Next.js'te
  > yaşıyor (worker'da değil, çünkü token/eşleştirme/önbellek zaten burada).
2. **Kuyruk için Railway servisi** — kurulacak (onay bekliyor). Bunu da yaparız sorun yok. 

### 🟢 Sağlam çalışan

- YT Music token'ı (yayına alındı, artık ölmüyor)
- Beğenilenler (artık sadece müzik)
- Taste / Recap / Journey hesaplamaları
- Sosyal + eşleşme motoru
- Güvenlik (anon açığı kapatıldı)

---

## Kapanış — Bu Dokümanı Nasıl Kullanmalı

Sahip, bu doküman bir **fotoğraf** — 2026-07-12 tarihli. Sistem geliştikçe
eskiyecek. Ama arka planın **iskeletini** verir.

**Not eklerken:** Bir bölümün yanına düşüncenizi yazın. Örneğin:

> `> NOT (Sahip): Bu eşleşme puanına yaş faktörü de eklenmeli.`

Ben bu notları tek tek okuyup her birinden iş çıkarırım. Sizin dediğiniz gibi:
"O notlar üzerinden birçok iş çıkacak."

> **Güncelleme (Jarvis, 2026-07-13 gece):** 8 notun 3'ü için detaylı teknik plan
> hazırlandı (`archive/planlar/eslesme-motoru-uc-kulvar-plani.md`,
> `03-oneri-motoru-zit-kutup-ve-sosyal-cevre.md`, `archive/planlar/gorsel-kalici-altyapi-uygulandi.md`), ana
> plana (`00-rosso-ana-plan.md`) referans düşüldü. Taşıma kuyruğu
> UI sorunuz ve admin panel notunuz doğrudan §8.4 ve §11'e cevap olarak eklendi.
> Hiçbir kod değişikliği yapılmadı — hepsi onayınızı bekliyor, sabah birlikte
> bakarız.

> **Güncelleme (Jarvis, 2026-07-13 akşam):** 8 notun **hepsi kapandı**:
> - Üç-kulvar eşleşme (§8.5, 1. not) ✅ CANLI
> - Sert filtreler (§8.5, 2. not) ✅ CANLI + ✅ UI; zıt-kutup/sosyal-çevre bonusu
>   ayrı işe bırakıldı (tanımı hâlâ netleşmedi)
> - Görsel kalıcı altyapısı (§12) ✅ PLAN ONAYLANDI (Supabase Storage), uygulama
>   ayrı oturuma bırakıldı
> - Admin panel (§11) not olarak kaydedildi, henüz uygulama fazına geçmedi
> Ayrıca bugün Sahibin kendi hesabıyla canlı testinde 4 yeni bug bulunup
> düzeltildi: eşleşme red durumu hiç işlenmiyordu, kabul edilmiş yorumlar öneri
> havuzunu sızdırıyordu, mesaj "okundu" bilgisi gerçek zamanlı gelmiyordu,
> playlist taşıma sonuç ekranı yalancı "tam başarı" gösteriyordu (bkz. §12
> "Aktif sorunlar" madde 4). Detay: `logs/2026-07-13.md`.

**Merak ettiğiniz her kutuyu açabilirim:** Bir RPC'nin içini, bir cron'un tam
mantığını, bir tablonun her sütununu — hangisini isterseniz derinleştiririm.