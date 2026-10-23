# Rosso — Arka Plan Rehberi

> **Son doğrulama: 2026-10-05** (koddan ve dosyalardan okundu; canlı sistem sorgulanmadı).
> **Kimin için?** Rosso'yu kuran ve işleten kişi için. Rosso'nun görünmeyen yüzünü — veritabanı, cron'lar, worker, güvenlik, kotalar — jargonsuz anlatır.
> Teknik ayrıntı için: [`reference/teknik-mimari-referansi.md`](reference/teknik-mimari-referansi.md).
> Not eklemek istediğin yere `> NOT:` diye yaz.

---

## 1. Rosso tek cümlede

Spotify'daki dinleme geçmişini alır, **kendi veritabanına** koyar, ondan hikâyeler (Journey, Recap, Taste) çıkarır. Yalnız Spotify; sosyal katman yok; mobil uygulama yok; 7/24 açık ücretli sunucu yok. Kullanıcı sen ve davet ettiğin birkaç arkadaşsındır (Spotify Development Mode tavanı Client ID başına 5 kullanıcı).

## 2. Üç ayrı "beyin"

| Beyin | Ne yapar | Nerede yaşar |
|---|---|---|
| **Vitrin ve rotalar** | Sayfaları gösterir, API'leri ve cron rotalarını çalıştırır | Vercel (`web/`) |
| **Hafıza ve zamanlayıcı** | Verinin kendisi, giriş sistemi, dosya depolama, `pg_cron` ile "şu saatte şunu yap" | Supabase |
| **Ağır işçi** | ZIP'i açıp okumak, tür/kapak/ISRC tamamlamak | GitHub Actions'ta Python (`worker/`) — yalnız çağrılınca uyanır |

## 3. Veri nereden geliyor — üç kapı

1. **Canlı bağlantı:** Spotify hesabını bağlarsın; her 5 dakikada bir sıra gelen kullanıcıların son dinlemeleri çekilir (kişi başı yaklaşık saatte bir). Herkes kendi Spotify geliştirici uygulamasını getirir (BYOC); Spotify'ın Development Mode kuralı yüzünden her arkadaşı Spotify Dashboard'da **elle** eklemen gerekir (tavan 5 kişi).
2. **ZIP:** Spotify'dan istediğin geçmiş dosyasını yüklersin. Web, GitHub'daki işçiyi `repository_dispatch` ile uyandırır; işçi ZIP'i okur ve veritabanına yazar. İş bitince aynı şarkının farklı kimliklerini birleştirir, aynı dinlemenin iki kez yazılmışlarını arşive taşır.
3. **Zenginleştirme:** Tür, kapak, ISRC gibi eksik bilgiler Deezer, Last.fm ve MusicBrainz'den günlük bakımla tamamlanır.

## 4. Veritabanı — bilgi nerede yaşıyor (69 tablo)

- **Ham müzik:** `play_events` (her dinleme), `tracks`, `artists`. Bir şarkı = bir `tracks` satırı; kaynağı farklı gelse de (single/albüm, "Remastered") aynı şarkı tek satırda toplanır.
- **Hesaplanmış paketler:** istatistik, dinleme örüntüsü, dönem, zevk, Journey yılları ve **Journey eşlikçileri** (yıl boyunca sana eşlik eden sanatçı/albüm/şarkılar). Günlük SQL turu bunları önceden hesaplar; sayfalar hazır olanı okur.
- **Okuma yüzleri:** Recap kartları, playlist'ler.
- **Kullanıcı ve bağlantı:** Spotify bağlantıları (token'lar şifreli), tercihler, davet listesi (`izinli_eposta`), silinmek üzere işaretlenenler (`account_deletions`).
- **Sistem:** iş kayıtları (`pipeline_runs`), loglar, API cooldown ve bütçe tabloları.

## 5. Zamanlayıcılar (cron) — kim ne zaman çalışır

Hepsi Supabase `pg_cron`'da yaşar; GitHub'a hiç dokunmasan da durmaz. Çoğu "tik" mantığıyla çalışır: her tikte sırası gelen birkaç kullanıcıyı işler.

- Her 5 dk: Spotify senkronu; günlük paket turu (her tikte 30 aktif kullanıcı).
- Her 10 / 15 dk: mood hesabı / playlist tazeleme. :07 ve :37: recap.
- Her saat: hesap silme (işaretli hesaplar), şarkı bütünlüğü bakımı (:50).
- Her ayın 1–3'ü: otomatik aylık playlist.
- 06:00 katalog bakımı (worker'ı uyandırır). Pazar 05:00 log temizliği.

Bir işçi hep aynı desendedir: **sıra kimde? → yap → sonucu `pipeline_runs`'a yaz**. "Çalıştı" kanıtı için HTTP cevabına ve yazılan satıra bakılır (`reference/yillik-bakim-kontrol-listesi.md` §3).

## 6. Hesaplamalar — veritabanındaki fonksiyonlar

Ağır hesaplar (paketler, şarkı birleştirme, çift dinleme temizliği, Journey eşlikçileri) uygulamada değil, veritabanı içindeki fonksiyonlarda (RPC) yapılır; böylece tek yerde, hızlı ve aynı sonuçla çalışır. Örnekler: `refresh_active_users_batch`, `build_journey_eslikci_pkg`, `kopya_sarkilari_birlestir`, `cift_dinlemeleri_temizle`.

## 7. Modüller

- **Taste:** "şu an" (mood) ve "değişmeyenler" (karakter). Zevk yorumları elle yazılmış sabit metinlerdir.
- **Recap:** dönemsel ayna. Dashboard'daki "Dinlemelerin" dönemleri son 7 gün / son 1 ay / son 12 ay / tüm zaman — hepsi kayan pencere, takvim ayı değil.
- **Journey:** her dolu yıl (≥300 dinleme ve ≥3 aktif ay) kendi eşlikçileriyle anlatılır; ilk/son dinleme anlatının merkezi değildir.
- **Playlist ve otomasyonlar:** aylık otomatik playlist, mood playlist'leri; sıra kolonu `track_pos`.

## 8. Güvenlik — kim neyi görebilir

1. **RLS:** 69 tablonun hepsinde satır düzeyi güvenlik açık; kullanıcı yalnız kendi satırını görür. 32 tabloda politika yoktur; bunlara yalnız sunucu (servis rolü) ve özel yetkili fonksiyonlar erişir.
2. **Fonksiyon yetkileri:** yeni fonksiyonlar herkese açık bırakılmaz (`REVOKE`), yalnız gereken role `GRANT` verilir.
3. **Kayıt kapısı:** yeni hesap yalnız davet listesindeki e-posta ile açılır; ilk hesap sahip olur, sonra kayıt kapanır.
4. **Sırlar:** token'lar şifreli saklanır; cron rotaları gizli anahtar ister; sır dosyaları repoya girmez.

## 9. Kota ve hız sınırı — en kırılgan nokta

Spotify'ı rahatsız edersen ceza gelir (2026-07-12: 6,4 saat). Bu yüzden her dış API döngüsünde: istekler arası **en az 250 ms**, 429 gelirse bekleme süresi veritabanına yazılır, token almadan önce bekleme kontrol edilir. "Bir hatayı çok sayıda küçük istekle atlatmak" yasaktır.

## 10. Bilinen zayıf noktalar (2026-10-05)

- **Deploy:** Vercel Hobby kotasını aşmamak için gereksiz push'tan kaçın; build günlükleri Vercel panelindedir.
- **Yedek:** haftalık yedek GitHub `schedule` ile çalışır; worker reposuna 60 gün push gelmezse kendiliğinden durur.
- **AI:** isteğe bağlıdır (Vertex AI / Gemini); yapılandırılmazsa kapalıdır, sistem onsuz çalışır.
- **Ölçülmeyenler:** canlı cron sağlığı, hesap silme cron'unun açık/kapalı durumu, güvenlik uyarı sayısı (`pipeline_runs` ve `cron.job_run_details` sorgularıyla ölçülür).
- **Sosyal dönemden kalanlar:** worker'da YouTube ve eşleşme kalıntıları olabilir; sosyal tablo verisi silinmemiştir.

## 11. Bu doküman nasıl güncel kalır?

Kod değişince ilgili bölüm aynı commit'te güncellenir; tarihsel anlatılar git geçmişindedir. Çelişkide kod kazanır.
