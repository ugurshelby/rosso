# Rosso — Teknik Referans (kısa harita)

> **Son doğrulama: 2026-10-23 (portfolyoya aktarıldı; içerik 2026-10-05)** (kod ve manifestlerden okundu; canlı sistem sorgulanmadı).
> **Kitle:** ajanlar ve geliştiriciler. **Otorite sırası:** kod > `../decisions/kisisel-rosso.md` > bu dosya.
> Bu dosya yalnız haritadır; ayrıntı ilgili kod ve belgelerdedir. Tarihsel anlatılar git geçmişindedir (Railway, `pgmq`,
> YouTube/Apple veri alımı, profil sayfası ve sosyal katman **yoktur**).

---

## 1. Stack

Son doğrulama: 2026-10-05

| Parça | Teknoloji |
|---|---|
| `web/` | Next.js 16.3.5 (App Router), React 19.2, TypeScript strict, Tailwind 4, `motion` 12, Zod 4, Vitest 4, Playwright |
| Veri | Supabase: Postgres, Auth, Storage, `pg_cron` + `pg_net` + Vault |
| AI | İsteğe bağlı (Vertex AI / Gemini); yapılandırılmazsa kapalıdır ve sistem onsuz çalışır |
| `worker/` | Python (`>=3.11`, CI 3.13), FastAPI, httpx, ijson; GitHub Actions'ta olay güdümlü |
| Barındırma | Vercel Hobby (`fra1`), Supabase ücretsiz plan, GitHub Actions. 7/24 açık ücretli sunucu yok |

`three`, `styled-components`, `next-auth` projede kullanılmaz.

## 2. Dizin haritası

Son doğrulama: 2026-10-05

- `web/src/app`: `(auth)` login/register/şifre · `(dashboard)` dashboard, data, gecmis, journey, taste, mood, playlists, recap, settings, album/artist/track · `(marketing)` landing, blog, help, privacy, modules (+ `/en` ikizleri). Profil sayfası yok.
- `web/src/app/api`: account, analytics, auth, automations, cron, export, images, journey, log, mood, playlists, quick-start, settings, spotify, taste.
- `web/src/lib`: `analytics`, `catalog` (`resolve-track.ts`), `journey`, `recap`, `taste`, `spotify`, `playlists`, `images`, `i18n` (tr/en), `middleware`, `security`, `supabase`, `cron`, `worker`.
- `web/supabase/migrations` (0001–0362), `web/supabase/kurulum` (self-host: `schema.sql`, `cron.sql`).
- `worker/app`: `cron/`, `jobs/`, `matching/`, `parser/`, `pipeline/`, `playlist_rules/`, `routers/`, `services/`.
- Kök: `web/`, `worker/`, `docs/` (`mobile/` planlı).

## 3. İstek hattı

Son doğrulama: 2026-10-05

`web/middleware.ts` → `lib/middleware/pipeline.ts` sırası: (0) CSP nonce, (1) kimlik uçlarına hız sınırı, (2) Supabase oturumu.
CSP yalnız middleware'de üretilir; `next.config.ts` statik CSP koymaz (nonce'la çakışır), yalnız çerçeve/nosniff/referrer/permissions/HSTS başlıkları.
Cron rotaları `Authorization: Bearer <CRON_SECRET>` ister; karşılaştırma `lib/security/timing-safe-equal.ts` ile, gizli değer yoksa reddeder.

## 4. Spotify

Son doğrulama: 2026-10-05

- **İki ayrı kapı:** giriş OAuth'u (`/api/auth/oauth/[provider]`) ve veri bağlantısı (`/api/spotify/connect`, `/callback`, `/refresh`, `/byoc`, `/sync`). Veri yalnız `platform_connections`'tan okunur; giriş token'ı veri kapısını açmaz.
- **BYOC:** her kullanıcı kendi Spotify geliştirici uygulamasını bağlar (`lib/spotify/byoc.ts`); Development Mode tavanı Client ID başına 5 kullanıcı ve izin Dashboard'dan elle verilir (`lib/spotify/allowlist.ts`). Bu, Rosso'nun kayıt davetinden (`izinli_eposta`, migration 0359) ayrı bir adımdır.
- **Canlı senkron:** `pg_cron` her 5 dakikada `/api/cron/sync-spotify`'ı çağırır; kullanıcı başına yaklaşık saatlik, 6 paralel, 240 sn bütçe.
- **Dış API kuralı:** çağrılar arası ≥250 ms, 429'da cooldown DB'ye yazılır, token almadan önce cooldown kontrolü (`lib/spotify/api-gate.ts`, `worker/app/services/cooldown.py`). Playlist uçları `/items` (`/tracks` 403 verir).
- **ZIP verisi:** ayrıntı ve çift dinleme kuralları `spotify-veri-ve-zip.md`.

## 5. ZIP hattı ve worker

Son doğrulama: 2026-10-05

`/api/export/upload` → `/queue` → `repository_dispatch` `process_new_export` → `worker/.github/workflows/process-zip.yml`: `export_runner`, sonra `genre_runner`.
İçe aktarma sonunda runner şarkı bütünlüğü RPC'lerini çağırır (`kopya_sarkilari_birlestir`, `cift_dinlemeleri_temizle`).
Katalog bakımı `scheduled-maintenance.yml`'de (yalnız `repository_dispatch` `scheduled_maintenance`; GitHub `schedule` bilerek yok — 60 gün sessizlikte durur). `db-yedek.yml` ise `schedule` kullanır ve worker reposuna 60 gün push gelmezse durur.
Zenginleştirme kaynakları: Deezer, Last.fm, MusicBrainz (`worker/app/services/`).

## 6. Veri modeli (özet)

Son doğrulama: 2026-10-05 (`kurulum/schema.sql`, 69 tablo)

- Ham: `play_events`, `tracks`, `artists`, `track_spotify_alias`, `play_events_cift_arsiv` (çift dinleme arşivi).
- Paketler (günlük SQL turu `refresh_active_users_batch`): `user_stats_pkg`, `user_pattern_pkg`, `user_period_pkg`, `user_taste_pkg`, `user_top_strips`, `journey_year_pkg`, `journey_eslikci_pkg`, `year_pkg`, `mood_pkg`.
- Okuma yüzleri: `recaps`, `playlists` + `playlist_tracks` (sıra kolonu `track_pos`).
- Kullanıcı ve bağlantı: `platform_connections`, `spotify_byoc_credentials`, `user_preferences`, `user_plans`, `account_deletions`, `izinli_eposta` (yalnız service_role).
- Sistem: `pipeline_runs`, `system_logs`, `api_cooldowns`, `api_budgets`, `ai_generation_logs`, `cron_kullanici_sirasi`.
- Şarkı kimliği: bir şarkı = bir `tracks` satırı (başlık anahtarı + ilk sanatçı anahtarı + süre ±3 sn). Çözüm sırası: spotify_id → alias → ISRC → anahtar (`kanonik_sarki_bul`) → yeni satır.
- Kimlik tuzağı: canlı veritabanı migration geçmişinin sonucudur ve sosyal dönemden kalan nesneler içerir; `schema.sql` bunun sosyalsiz kopyasıdır. Canlıyı `schema.sql`'den "onarma".

## 7. Görseller

Son doğrulama: 2026-10-05

- `CoverArt` (`components/media/cover-art.tsx`): varsayılan lazy/async; yalnız açık `priority` eager. UUID olmayan şarkı kimlikleri `/api/images` ucuna gitmez.
- `/api/images/tracks?ids=` toplu uç (≤50 UUID): yalnız DB'deki kalıcı kopyaları döner, Spotify'a gitmez; eksikler `missing` olarak döner ve tekil uca (`/api/images/track/[id]`) düşer.
- `lib/images/sized-url.ts` (`sizedUrl(url, cssPx)`): ekranda gösterilen boyuta en yakın varyantı seçer. Spotify albüm kodları: 4851 = 64, 1e02 = 300, b273 = 640 px; sanatçı: f178 = 160, 5174 = 320, e5eb = 640 px. Playlist ve mozaik kapaklarına dokunmaz.

## 8. Cron

Son doğrulama: 2026-10-05 (`kurulum/cron.sql`; canlı `active` bayrakları okunmadı)

Takvim ve işler `web/supabase/kurulum/cron.sql` içindedir (11 iş: 5 dakikalık senkron ve paket tikleri, mood, playlist tazeleme, recap, aylık otomatik playlist 1–3. günler, hesap silme, saatlik şarkı bütünlüğü, katalog zenginleştirme 03:10, katalog bakımı 06:00, haftalık log temizliği). Yeni bakım işi: dış API'ye gitmiyorsa TS + `pg_cron → pg_net → Vercel`; ağır, çok sağlayıcılı işler worker'da.

## 9. Güvenlik özeti

Son doğrulama: 2026-10-05

RLS 69 tablonun hepsinde açık (`schema.sql`'den sayıldı); 37 tabloda politika var, 32 tabloda politika yok (yalnız servis rolü ve `SECURITY DEFINER` fonksiyonlar erişir). `SECURITY DEFINER` fonksiyonlar `REVOKE ... FROM PUBLIC, anon, authenticated` + belirli `GRANT` ve `SET search_path` ile yazılır. Kayıt kapısı `davet_listeli_kayit_kapisi()` tetikleyicisidir.

## 10. Hızlı komutlar

```bash
cd web    && npm run type-check && npm run lint && npm run test && npm run build
cd worker && python -m pytest -q
```

Hangi dosyaya bakılır: Spotify/ZIP `spotify-veri-ve-zip.md` · bakım `yillik-bakim-kontrol-listesi.md` · yedek `db-yedek-ve-geri-yukleme.md` · kararlar `../decisions/kisisel-rosso.md`.
