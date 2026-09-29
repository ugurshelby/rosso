# Yıllık Bakım Kontrol Listesi — "1 Yıl Dokunmasam Ne Olur?"

> Otorite değil, hatırlatma. Kaynak: `docs/plans/01-yillik-kontrolsuz-calisma-plani.md`
> (2026-09-15/16, uygulandıktan sonra silindi — bkz. `logs/2026-09-16.md`).
> Sahip sisteme hiç dokunmasa da BİLMESİ gereken tek sayfa.

---

## 1. Otomatik çalışan, sizin hiçbir şey yapmanız gerekmeyen

| İş | Ne zaman | Nerede çalışır |
|---|---|---|
| Spotify saatlik senkron | Her saat başı | Vercel (TS) |
| Günlük istatistik/tür/dönem/zevk/journey paketi | Her gün 03:00 UTC | Supabase SQL |
| Günlük recap tazeleme | Her gün 04:00 UTC | Vercel (TS) |
| Aylık otomatik playlist | Her ayın 1'i, 05:00 UTC | Vercel (TS) |
| Haftalık log/pipeline_runs temizliği | Pazar 05:00 UTC | Supabase SQL |
| Günlük mood listesi hesaplama + haftalık Spotify senkron | Her gün 02:30 UTC | Vercel (TS) |
| 12 saatte bir otomatik playlist tazeleme | Günde 2 kez | Vercel (TS) |
| Günlük katalog bakımı (ISRC/kapak/sanatçı görseli) | Her gün 06:00 UTC | GitHub Actions (Python) |
| Günlük katalog AI zenginleştirme | Her gün 03:10 UTC | Vercel (TS) |
| pg_cron geçmişi + log temizliği | Pazar 05:00 UTC (`cleanup_old_logs`, 0355: `cron.job_run_details` 14 gün) | Supabase SQL |

Hepsi Supabase `pg_cron`'da yaşar — GitHub reposuna hiç dokunulmasa bile (60 gün, 1 yıl fark etmez) **durmaz**, çünkü tetikleyici GitHub'ın kendi zamanlayıcısı değil, veritabanının içindeki `pg_cron`'dur.

**2026-09-16 mimari revizyonu:** `account_purge`, `mood_pkg` ve `playlist_refresh` GitHub Actions/Python'dan TypeScript'e (Vercel) taşındı — bu üçü artık `WORKER_GITHUB_PAT`'e hiç bağımlı değil, doğrudan `pg_cron → pg_net → Vercel` gider (Spotify senkron/recap/auto-playlists ile aynı desen). Yalnızca **katalog bakımı** (ISRC/kapak/sanatçı görseli — Deezer/Last.fm/MusicBrainz, düşük öncelikli/kozmetik) hâlâ GitHub Actions'ta.

> **2026-09-26 denetimi:** TS cron rotaları (recap, playlist_refresh, spotify senkron, account_purge,
> auto_playlist, katalog zenginleştirme) artık `pipeline_runs`'a yazar (boş turlar yazılmaz). Admin'de
> "3 Eylül'den beri sessiz" görünen ~14 iş, Railway/Python dönemi run_type'larıydı (nightly, fast,
> ytmusic_*, match_batch…) — iş çalışıyordu, kayıt yoktu ya da iş artık yok. Ayrıntı: `logs/2026-09-26.md`.

## 1b. Kendiliğinden kapanan/dönen (2026-09-29 eklendi)

| İş | Ne olur |
|---|---|
| **AI kapanışı** | 17 Aralık 2026 00:00 UTC'de Vertex/Gemini çağrıları kendiliğinden durur (`web/src/lib/ai/ai-kapanis.ts`); anahtar Vercel'de kalsa bile kullanılmaz, fatura oluşmaz. Uygulama AI'sız (SQL fallback) çalışır. Yeniden açmak için Vercel'de `AI_KAPANIS_TARIHI`. |
| **Hesap purge** | Silinmek üzere işaretlenen hesaplar 30 gün sonra `account-purge` cron'uyla kalıcı silinir. |
| **Kayıt kapısı** | Yeni kayıt yalnız davet listesindekilere açık (`izinli_eposta`); ilk kayıt sahip olur. |

## 2. ASLA otomatikleşmeyen, sizin elle yapmanız gereken 2 adım

Yeni bir gerçek kullanıcı (arkadaşınız) Spotify'ı bağlamak istediğinde:

1. **Spotify Developer Dashboard**'a girip o kişinin Spotify hesabını **elle** ekleyin. Spotify'ın bunun için bir API'si yok — bu adım hiçbir şekilde otomatikleştirilemez, Rosso'nun değil Spotify'ın kısıtı.
2. **Rosso admin panelinde** (`admin/spotify-access-table`) o kullanıcıyı tek tıkla onaylayın.

Bunun dışında hiçbir gerçek kullanıcı işlemi elle müdahale gerektirmez.

## 3. "Hâlâ çalışıyor mu?" — 2 dakikalık canlı kontrol

Supabase SQL Editor'de (veya MCP ile) çalıştırın:

```sql
-- pg_cron kuyruğa almayı başardı mı? (SQL hatasız döndü mü)
select j.jobname, d.status, max(d.start_time) as son_calisma
from cron.job_run_details d
join cron.job j on j.jobid = d.jobid
where d.start_time > now() - interval '7 days'
group by j.jobname, d.status
order by j.jobname;

-- ⚠ Yukarısı YETERLİ DEĞİL — asıl kanıt HTTP çağrısının gerçekten 200
-- döndüğüdür (2026-09-15'te netleşen ayrım):
select id, status_code, created
from net._http_response
order by created desc
limit 20;
```

`status_code` sütununda `200` dışında bir şey (401, 500, boş) görürseniz: `CRON_SECRET`, `WORKER_GITHUB_PAT` (yalnız katalog bakımı için) veya `vault.decrypted_secrets`'taki `cron_secret` değerlerinden biri bozulmuş/değişmiş olabilir.

## 4. Sessizce durabilecek tek şeyler

- **`WORKER_GITHUB_PAT`** artık yalnız **katalog bakımı** için kullanılıyor (`account_purge`/`mood_pkg`/`playlist_refresh` TS'e taşındığı için bu 3'ü etkilemez). Bir son kullanma tarihiyle oluşturulduysa, o tarih dolunca yalnız katalog bakımı sessizce durur. "No expiration" seçilmesi önerilir.
- **Supabase ücretsiz plan** 7 gün API hareketsizliğinde projeyi duraklatır — ama saatlik `pg_cron` aktivitesi bunu fiilen engeller.
- **`account_purge` cron'u kasıtlı olarak `active = false`** eklendi (geri alınamaz silme). Devreye almak isterseniz:
  ```sql
  SELECT cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'rosso-account-purge-cron'),
    active := true
  );
  ```

## 5. Yeni bir bakım işini nereye eklemeli?

- Dış API'ye istek atmıyorsa (yalnız Supabase okuma/yazma) → **her zaman TS** (`web/src/lib/services/`), `pg_cron → pg_net → Vercel` deseni.
- Spotify/Deezer/Last.fm/MusicBrainz gibi dış API'ye istek atıyorsa → yine TS tercih edilir (mevcut `ensureValidToken`/`api-gate` altyapısı hazır); yalnız **çok sağlayıcılı, karmaşık rate-limit mantığı** olan ağır işler (örn. tür zenginleştirme) GitHub Actions/Python'da kalabilir — port riski faydasından fazlaysa.
