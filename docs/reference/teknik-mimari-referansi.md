# Rosso — Teknik Referans

> **⚠ 2026-09-25 (V2) notu:** Sosyal katman koddan kaldırıldı (bu belgedeki Social bölümleri silindi;
> tablolar DB'de durur, kullanılmaz). **Railway kapatıldı**: aşağıda "Railway" geçen yerler tarihsel
> ölçümdür — güncel düzen: günlük işler Supabase `pg_cron`, ağır işler on-demand GitHub Actions worker'ı.
> Karar: [`../decisions/kisisel-rosso.md`](../decisions/kisisel-rosso.md).

> **Kitle:** Agent ve geliştiriciler.
> **Otorite:** Bu dosya projenin stack, mimari, API yüzeyi, veri modeli ve
> teknik kısıtlarını belgeler.
>
> **Güncellenme kuralı:** Yeni bir platform entegrasyonu, kalıcı API endpoint,
> DB tablosu veya stack değişikliği yapıldığında ilgili bölüm güncellenir.
> Detay otoriteleri değişmez — bu dosya özetler, onlar tanımlar.
>
> **Detay otoriteleri:**
> Tasarım → `docs/design.md` · Worker → `docs/reference/spotify-veri-ve-zip.md` ·
> Sosyal mimari → `docs/reference/sosyal-platform-kararlari.md` ·
> Platform kısıtları → `docs/platform-dev-docs/` ·
> Ürün felsefesi (kuzey yıldızı) → `docs/vision/kuzey-yildizi.md` ·
> Uygulamalı vizyon → `docs/vision/uygulamali-vizyon.md`

---

## 1. Teknoloji Yığını (Stack)

### Frontend (web)

| Katman | Teknoloji | Not |
|--------|-----------|-----|
| Framework | **Next.js 16** (App Router) | React 19, port `3847` |
| Stil | **Tailwind CSS v4** + **CSS Modules** | Hibrit; token'lar `globals.css` |
| Animasyon | **motion** (Framer Motion v12) | Spring spec: `stiffness:380, damping:34` |
| Grafik | **recharts** | Recap / taste data-viz |
| 3D (seçili) | **three** + **@react-three/fiber** | Profil / dekoratif kullanım |
| UI ikon | **lucide-react** | |
| Styled (legacy) | **styled-components** | Registry ile SSR |
| Fontlar | Geist, **Archivo** (display), **Hanken Grotesk** (body), Geist/JetBrains Mono | `layout.tsx` |
| Doğrulama | **zod** v4 | API input |
| Test | **Vitest** + Testing Library | `npm run test` |
| E2E | **Playwright** | `npm run e2e` |

### Backend (uygulama sunucusu)

| Katman | Teknoloji |
|--------|-----------|
| API | Next.js Route Handlers (`src/app/api/`) |
| Auth | **Supabase Auth** (SSR: `@supabase/ssr`) |
| DB | **Supabase Postgres** + RLS |
| Zamanlanmış İşler | **Supabase pg_cron** (`/api/cron/sync-spotify`, `/api/cron/recap`, `/api/cron/auto-playlists`) |
| Akıllı Sync | Next.js Stale-While-Revalidate (Dashboard Layout Arka Plan Tetikleyicisi + 30dk DB Kota Kalkanı) |
| Kuyruk | `export_jobs.status` DB poll (pgmq kaldırıldı 2026-06-30) |
| Şifreleme | `jose` — platform token cipher |

**Çok Kullanıcılı Mimari (2026-09-11 Güncellemesi):**
- 2026-08-31'deki tek sahip (`OWNER_EMAIL`) kilitleri kaldırılarak çok kullanıcılı sosyal keşif ve eşleşme mimarisine geri dönüldü (`0290_cok_kullanici_kayit_kapisi_ac.sql`).
- Spotify Developer Mode (5 kullanıcı sınırı) gereği:
  - **Organik Kullanıcılar:** Spotify allowlist'inde bulunan gerçek hesaplar. Canlı API senkronizasyonu yalnızca bu kullanıcılar için çalışır.
  - **Test Profilleri (Sentetik):** `test-fixtures/` üzerinden üretilen profiller. Sosyal keşif ve eşleşme için veritabanında yaşar; Spotify API'yi asla tetiklemez (bypass).
- **Veri Katmanları (Growing Identity):** Katman 1 (L1 Canlı API), Katman 2 (L2 Dinleme Geçmişi ZIP'i) ve Katman 3 (L3 Hesap Verisi + Teknik Log ZIP'leri) kademeli Kilitli Önizleme (`LockedPreview`) ve Seviye Atlama Paneli (`PhasePanel`) ile yaşar.

### Altyapı & Maliyet (Zero-Cost / Sıfır Maliyet Mimarisi)

| Servis | Rol | Durum |
|--------|-----|-------|
| **Vercel** | Next.js frontend & Route Handlers | Aktif (Hobby Free) |
| **Supabase** | Postgres, Auth, Storage, Realtime, `pg_cron` | Aktif (Free Tier) |
| **Railway** | Eski Python worker konteynerleri | **%100 Sonlandırıldı (Sıfır Maliyet)** |
| **GitHub Actions** | lint · type-check · test · build | Aktif (`master` branch) |

---

## 2. Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────┐
│  Kullanıcı (tarayıcı)                                        │
│  Next.js App Router — marketing / auth / dashboard          │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
        Route Handlers                  Supabase Realtime
        (src/app/api/*)                 (export progress UI)
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  Supabase Postgres + RLS   │◄──│  Python Worker (Railway)    │
│  pgmq kuyrukları           │   │  ZIP parse · match · enrich │
│  cron jobs                 │   │  sync · auto-playlist       │
└───────────────────────────┘   └──────────────┬──────────────┘
                                               │
                    ▼
              Spotify API
              (OAuth + export)
                    │
                    └──────── Deezer · MusicBrainz · Last.fm (genre enrichment)
```

### Frontend route grupları

| Grup | Yollar | Amaç |
|------|--------|------|
| **Marketing** | `/privacy`, `/help` | Yasal metin. `/` login'e düşer; fiyat/blog kapalı |
| **Auth** | `/login`, `/forgot-password`, `/update-password` | Yalnız sahip. `/register` login'e |
| **Dashboard** | `/dashboard`, `/recap`, `/journey`, `/taste`, `/profile`, `/playlists`, `/gecmis`, `/mood`, `/settings/*` | Giriş sonrası ürün |
| **Admin** | `/admin`, … | Ops (ayrı servis) |

### API yüzeyi

| Alan | Endpoint örnekleri |
|------|-------------------|
| Auth | `/api/auth/callback`, `/api/auth/logout`, `/api/auth/login-guard` |
| Export | `/api/export/upload`, `/api/export/delete` |
| Analytics | `/api/analytics/recap`, `/api/analytics/taste`, `/api/analytics/top-*`, `/api/analytics/listening-pattern` |
| Platform | `/api/spotify/connect`, `/api/spotify/callback`, `/api/spotify/refresh` (yalnız Spotify — YT/Apple route'ları plan 07'de silindi) |
| Token | `/api/auth/token-status` |
| Playlists | `/api/playlists`, `/api/playlists/[id]`, `/api/playlists/generate` (POST — **parametreli** üretim: dönem + tür + sanatçı + sayı + sıralama + ad/açıklama/kapak), `/api/playlists/add-track` (şarkıyı playlist'e + Spotify'a ekle), `/api/mood/create-playlist`, `/api/mood/remove-track` |
| Profil | `/api/profile/[userId]` |
| Ayarlar | `/api/settings/preferences`, `/api/account/delete` (soft-delete), `/api/account/export-data` (KVKK veri paketi — JSON indir) |
| Otomasyon | `/api/automations/playlist-rule` |
| **Admin** | `/api/admin/verify` (POST), `/api/admin/jobs/[id]/retry` (POST), `/api/admin/cooldowns/[provider]` (DELETE), `/api/admin/users/[id]` (PATCH keşfedilebilirlik / DELETE kullanıcı) |

#### Playlist üretimi — RPC sözleşmesi (2026-08-15)

| RPC | Ne yapar | Kullanan |
|---|---|---|
| `get_top_tracks_for_rule(user, from, to, limit, skipped, min_plays, hour_from, hour_to, **sort_by**)` | Dönemin en çok dinlenenleri. `sort_by`: `plays` (varsayılan) \| `duration` | Worker (otomasyon) + süzgeçsiz manuel üretim |
| `parametreli_top_tracks(user, from, to, limit, genres, artists, sort_by)` | Aynı iş + **tür/sanatçı süzgeci**. Boş dizi/NULL = süzgeç yok | `/playlists/create` |
| `kullanici_turleri(user)` · `kullanici_sanatcilari(user)` | Panellerin seçenekleri — kullanıcının KENDİ dinledikleri (tüm katalog değil) | `/playlists/create` panelleri |
| `mesaji_geri_al(message_id)` | Mesajı geri alır: `body` boşaltılır + `deleted_at` damgalanır. Satır SİLİNMEZ | Sohbet (web + mobil) |

⚠ **`get_top_tracks_for_rule`'a parametre eklerken:** `create or replace` yeni
parametrede **aşırı yükleme** yaratır ve worker'ın mevcut çağrısı
`function is not unique` hatası alır. Eski imza `drop function` ile
düşürülmeli (bkz. migration 0278b — bu tuzağa düşülüp ölçümle yakalandı).

✅ **`auto_playlist_rules.sort_by`** (`plays` | `duration`, varsayılan `plays`)
uçtan uca bağlı: UI yazar → `auto_playlist_generator` kural satırından **okur**
(SELECT listesinde) → `top_month`/`top_year` → RPC'ye `p_sort_by`.
Bilinmeyen değer worker'da `plays`e düşer + uyarı loglanır.
`RuleTrack.score` ölçüte göre gelir (süre ölçütünde `total_ms`).
*(2026-08-15 bitti; 2026-08-14'te kolon vardı ama worker okumuyordu —
üretim hep `plays` yapıyordu, bkz. `archive/planlar/01-kullanici-testi-
duzeltmeleri-TAMAMLANDI.md` → P4.1-worker.)*

---

## 3. Mevcut Özellikler

### Veri & analitik

- **Spotify Extended Streaming History** ZIP yükleme ve işleme (pgmq + worker).
- **Play events** saklama: `music` / `podcast` / `audiobook` / `unknown` sınıflandırması.
- **Recap** — dönemsel dinleme özeti, top artist/track, saatlik dağılım grafikleri.
- **Dinleme Geçmişi** (`/gecmis` + mobil Ana Sayfa'dan) — stats.fm ilhamı: 3 sekme
  (şarkı/sanatçı/albüm) × zaman aralığı (aylık/yıllık/tümü + özel) × kapak+istatistik
  × grid seçici. RPC: `history_top_tracks/artists/albums` (migration 0133, kapak +
  süre/çalma sıralaması).
- **Taste** — tür dağılımı ve dinleme profili (enrichment tamamlanınca tam güç).
- **Profil** — Living Avatar (genre→palet), dinleme imzası, streak, yoğunluk kartları.
- **Dashboard** — hızlı başlangıç, stat bar, bento aksiyon grid.

### Platform & kütüphane

- **OAuth bağlantısı:** yalnız Spotify (2026-07-28 plan 07 — YT/Apple kaldırıldı).
- **Token yönetimi:** `platform-auth.ts` + `token-refresh.ts` — Spotify OAuth refresh.

#### 🔑 Spotify İKİ AYRI KAPIDAN girer (2026-08-25, BACKEND TURU)

| | Uç | Scope | Token nerede |
|---|---|---|---|
| **GİRİŞ** | `/api/auth/oauth/spotify` | yalnız `user-read-email` | `auth.identities` |
| **VERİ** | `/api/spotify/connect` | 9 scope | `platform_connections` |

🔴 **`platform_connections` TEK GERÇEK.** `auth.identities`'teki sağlayıcı
token'ı **asla okunmaz** — nöbetçi test var (`src/lib/auth/spotify-kimlik.test.ts`).
İkisi aynı işi yapmıyor: giriş token'ı yalnız `user-read-email` kapsamında,
dinleme geçmişini zaten okuyamaz; görevi giriş anında biter. `platform_connections`
ise AES-256-GCM şifreleme, yenileme eşiği, cooldown ve allowlist alanlarını
taşır. "Hangisi taze?" yanlış sorudur — paylaşılan durum yok, senkron gerekmez.

⚠ **Giriş, veri bağlantısı AÇMAZ.** Spotify'la giren kullanıcının
`platform_connections` kaydı olmaz; dashboard'ı boş görür. Bu durum ayrıca
karşılanıyor: `spotify_veri_izni_gerekli` uyarısı (genel "Spotify'ı bağla"
kartı değil — kullanıcı zaten Spotify'la girdiğini biliyor).

⚠ Hesap birleştirme **otomatik DEĞİL**: `spotify_user_id` ana anahtar, çakışma
`system_logs`'a `warn` olarak düşer, kararı insan verir (birleştirme geri
alınamaz ve yanlışı iki kullanıcının geçmişini karıştırır).

Tam gerekçe: `docs/decisions/spotify-giris-saglayicisi-3-soru.md`
- **Playlist oluşturma** — dinleme geçmişinden Spotify playlist (`spotify-target.ts` +
  `playlists/generate.ts`). ⚠ Platformlar arası TAŞIMA özelliği kaldırıldı (hedefi
  YT/Apple'dı).
- **Playlist yönetimi** — liste, detay, otomasyon kuralları.
- **Otomasyonlar** — aylık auto-playlist kuralları (`/settings/automations`).
- **Spotify export** ayarları — dönem seçimi, geçmiş, silme.

### UX & kişiselleştirme

- **3 renk paleti** — V1 Amber Dark (varsayılan), V2 Green Butter, V3 Cherry Cola.
- **Glassmorphism nav** — landing pill nav + collapsible dashboard sidebar.
- **Skeleton shimmer**, stagger reveal, reduced-motion desteği.
- **Marketing landing** — hero reveal, asimetrik bento feature grid.

### Worker yetenekleri

- ZIP stream parse, dedup, fingerprint filtreleri.
- **İçerik-tabanlı ZIP tespiti** (`zip_detect.py`): dosya adı sinyal + `message_*`
  anahtar kümesi içerik kanıtı; adı değiştirilmiş ZIP'ler de doğru tanınır.
- **Mixed ZIP desteği:** streaming + account/techlog yan-veri tek ZIP'te karışıksa
  her iki parser da çalışır.
- **Genre enrichment — Deezer + Last.fm** (Spotify terk edildi; Dev Mode 23 saatlik
  429 kotası vardı). `artist+title` ile search; `genre_normalize.py` ~20 kanonik tür.
  15 dk'da 50 track; kota duvarı yok. Key: `LAST_FM_API_KEY`.
- **Stale-job recovery:** export cron başında `processing` + 15 dk → `queued`.
- **Kota yönetimi DB-tabanlı:** 429 → `api_cooldowns.blocked_until = now() + min(Retry-After, 6h)`;
  sleep yok, sonraki cron cooldown'ı görür, API'ye dokunmaz.
- **İki katmanlı loglama:** Railway stdout (kısa, insan) + `pipeline_runs` tablosu (detaylı, sorgulanabilir).
- **Account/Technical Log parser'ları** (gerçek Spotify formatı): `message_item_uri`,
  `timestamp_utc`, `message_is_car_connected`, `message_playlist_title`, `message_daypart`,
  `message_title`, Inferences `Interest | Music |` prefix.
- Nightly sync (Spotify-only), auto-playlist generation (Spotify).
- **ZIP-sonrası anında recap+taste tetikleme** (`post_import_refresh.py`, 2026-07-28):
  bir ZIP `completed` olunca o kullanıcının recap+taste'i HEMEN üretilir (yeni
  kullanıcı gece cron'unu beklemez). İzole: hata export'u bozmaz, gece cron yedek.
- **account_purge cron** (2026-07-27): soft-delete süresi (30 gün) dolan hesapları
  otomatik siler (Storage + auth.users CASCADE). Railway: `python -m app.cron.account_purge`.

---

## 4. Platformlar & Dış API'ler

### Müzik platformu — YALNIZ SPOTIFY

> **2026-07-28 (plan 07): Rosso saf Spotify.** YouTube Music + Apple Music
> **komple kaldırıldı** (Sahip: "komple Rosso'dan ayır, tamamen Spotify ile
> devam"). Worker cron/servisleri, Next API'leri (`/api/yt-music`, `/api/apple-music`),
> **playlist taşıma özelliği** (hedefi YT/Apple'dı), UI ve DB (migration 0146,
> `platform` CHECK = 'spotify') temizlendi. İlerde playlist taşıma başka bir
> web sitesinde yapılabilir; Rosso'da yok. Detay: `archive/planlar/07-yt-music-
> apple-music-kaldirma-TAMAMLANDI.md`.

| Platform | Entegrasyon | Kısıtlar & notlar |
|----------|-------------|-------------------|
| **Spotify** | OAuth, Extended Streaming History ZIP, playlist API | **Development Mode:** 5 test kullanıcısı; Audio Features / Recommendations yeni uygulamalara kapalı (Kas 2024+). Genre track seviyesinde yok — enrichment dış kaynak. `localhost` redirect yasak — `127.0.0.1` kullan. Extended Quota başvurusu bekliyor (docs/decisions). ⚠ **Şubat 2026'da uçlar değişti** (`/me/tracks`→`/me/library`, toplu uçlar kaldırıldı): yazma işlemi yazmadan önce **`reference/spotify-veri-ve-zip.md` §2 "YAZMA İŞLEMLERİ"** oku — eski uç 403 döner ve sebebini söylemez. |

### Spotify canlı senkron sistemi (recently-played · playlist — 2026-07-02)

Rosso'nun "ZIP yükle → bir kerelik işle" modelinin ötesinde, Spotify'la
sürekli canlı senkron katmanı (worker cron'ları + Next.js API route'ları).
Plan: `archive/oturum-notlari/2026-07-02-platform-senkronizasyon.md`.
**Kod tamam, testler PASS, ama hiçbiri henüz Railway'de cron olarak
kurulmadı** (bilerek — tüm fazlar bitince hep birden devreye alınacak).

- **Token şifreleme (`token_cipher.py` / `token-cipher.ts`):**
  AES-256-GCM, format `iv_base64:tag_base64:data_base64` (3 parça, `:` ile
  ayrılmış — TEK blob DEĞİL, bu yanlış varsayım canlı testte kritik bir
  bug'a yol açmıştı, 2026-07-02'de düzeltildi). Her iki dil de aynı formatı
  üretip okur, `TOKEN_ENCRYPTION_KEY` üç ortamda (yerel/Vercel/Railway)
  tutarlı olmalı.
- **Spotify recently-played sync** (`worker/app/services/spotify_recently_played.py`,
  `worker/app/pipeline/recently_played_runner.py`): `/me/player/recently-played`
  `next` URL pagination ile sıfır veri kaybı, `after` cursor'ı
  `platform_connections.last_recently_played_sync_at`'te tutulur. Eşleşen
  track'e ISRC eksikse doldurulur, eşleşmeyen yeni satır olarak eklenir.
  401→bağlantı deaktive, 429→cooldown.
- **Playlist tazeleme** (`worker/app/services/spotify_playlists.py`,
  `worker/app/pipeline/playlist_refresh_runner.py`): `snapshot_id` ucuz
  kontrolü (değişmemişse item fetch atlanır). **Spotify API 2026 şeması:**
  playlist listesi yanıtında `tracks.total` DEĞİL `items.total` kullanılıyor
  (canlı testte keşfedildi, eski şema geriye dönük desteklenir).
  `playlist_tracks` tablosu `UNIQUE(playlist_id, position)` kısıtı yüzünden
  upsert değil, delete-all + sıralı reinsert ile senkronlanır.
- **Playlist CRUD** (`src/app/api/playlists/[id]/tracks/route.ts`): POST
  (ekle) `{uris: [...]}`, DELETE (çıkar) **`{items: [{uri}]}`** (dikkat:
  `{tracks: [{uri}]}` DEĞİL — bu, Spotify'ın deprecated endpoint şeması,
  400 verir; canlı testte keşfedilip düzeltildi, 2026-07-02). Her ikisi de
  yanıttaki yeni `snapshot_id`'yi `playlists` tablosuna yazar. Rate-limit:
  dakikada 20 yazma (`checkRateLimit` gerçek imzası `(key, limit, windowMs,
  now?)` — 3 zorunlu parametre, tek parametreli varsayım yanlıştır).
- **⛔ nightly_sync — KALDIRILDI (2026-08-26):** `sync_rules` tablosundaki
  kurallara göre platformlar arası playlist kopyalama yapıyordu. Rosso saf
  Spotify olduğundan beri (plan 07) kaynak=hedef=aynı playlist olduğu için
  fark hesaplaması her zaman boş çıkıyordu — sessizce işlevsizdi (`sync_rules`
  zaten 0 kayıt ölçülmüştü). Kod tamamen silindi (`worker/RAILWAY.md` §6).
  `sync_rules`/`sync_runs` tabloları DURUYOR, yeniden kullanılabilir.
- **Canlı doğrulama dersi:** cross-language (TS↔Python) format
  varsayımları ve üçüncü taraf API şemaları gerçek karşı tarafla test
  edilmeden "tamamlandı" sayılmamalı — mock/round-trip testler bu sınıf
  hataları yakalayamaz. Detay: `logs/2026-07-02.md`.

### Genre DNA sistemi (çok kaynak · ağırlıklı · hiyerarşik — 2026-07-01)

Genre artık düz liste değil, **ağırlıklı DNA**: iki katman.
- **`tracks.genre_data` (jsonb):** `{slots, weights, raw_scores, sources}` — tam DNA.
- **`tracks.genres` (text[]):** slots'un düz hali, geriye dönük uyum (UI/analytics çalışır).
- **Track:** 3 slot (%60/%30/%10). **Artist** (`artists` tablosu): 5 slot (%40/25/15/12/8).

**Kaynaklar (güvenilirlik ağırlığı):** lastfm_track(1.0) · deezer_track(0.9) ·
musicbrainz_rec(0.85) · db_tracks(0.7) · lastfm_artist(0.6) · musicbrainz_artist(0.5) ·
deezer_artist(0.3). Hepsi kotasız/ISRC'siz, `artist+title` ile çalışır.

**Skor:** `source_weight × (count/100) × frequency_bonus`. Last.fm gerçek count
(0-100); count vermeyen kaynaklar pozisyona göre azalan count (50/35/25/15/10).
`frequency_bonus`: kaç kaynakta geçtiyse 1.0/1.2/1.5/1.7.

**Hiyerarşik sözlük** (`genre_normalize.py`, 60+ tür, parent/alias): alt tür
seçilmişse üst tür yazılmaz (gereksiz); üst tür önce geldiyse sonraki alt tür
spesifik bilgi olarak eklenir. `select_slots()` bu filtreyi uygular.

**Akış (`genre_runner.py`):** başlık iki aşamalı aranır (önce ham, feat./parantez
eki `title_clean.clean_title()` ile temizlenip boşsa tekrar) → track için 3 kaynak
(Deezer+Last.fm+MB recording) → `merge_scores` → `select_slots(3)` → boş slot(lar)
varsa `artist_profile`'dan doldur (`get_or_build_artist_profile`, 4 kaynak, 30 gün
cache) → `genre_data`+`genres`+`genre_source` yaz. Her şey boşsa
`genre_lookup_failed_at` (kalıcı).

> **Deezer artist isim doğrulaması:** Deezer yanlış sanatçı döndürebiliyor
> (Drake→Brezilyalı Drake, SALİ→Saliva). `artist_profile.is_artist_match()` difflib
> benzerlik > 0.85 değilse o kaynağı eler.

> **Çapa (2026-07-01):** Deezer track araması, tür yanında **doğrulanmış sanatçı
> adını** (çapa) da döner. `is_artist_match(artists[0], çapa)` geçerse artist profili
> Last.fm/MB/Deezer sorgularını **çapa adıyla** yapar (kör aramanın yanlış sanatçı
> bulmasını önler — manifest→Henrique gibi). **Cache anahtarı her zaman DB adı**
> (`artists[0]`) kalır; çapa yalnızca sorgu adını değiştirir.

> **Aile-süzme (`are_related`, 2026-07-01):** Artist-level tag isim çakışmasına açık
> ("manifest" adında 15+ farklı sanatçı var). Track-level tür "gerçeğin çapası"
> kabul edilir; artist türü ancak track'in türüyle aynı hiyerarşik aileden ise
> eklenir. Track tamamen boşsa güvenilir kaynaklı (deezer_artist/db_tracks/
> musicbrainz_artist) bir taban türle aile referansı kurulur (`_build_from_artist_base`).

> **Rate-limit dayanıklılık (2026-07-01, hız geçidi 2026-07-16):** MusicBrainz
> process-genelinde `threading.Lock` + monotonik son-istek damgasıyla seri. Deezer
> TÜM çağrıları `deezer_genre._paced_get` küresel geçidinden geçer (istekler arası
> ≥250ms ≈ 4 istek/sn — canlı ölçülen limit 50 istek/5sn kayan pencere, ~2sn'de
> açılır; kota HTTP 429 VEYA 200+gövde `{error.code:4}` olarak gelir, ikisi de
> `RateLimitError`). Batch 429'u yakalayıp `api_cooldowns`'a damgalar (track
> `lookup_failed` YAZILMAZ). `batch_limit=200` + `time_budget_s=240` (Railway cron
> minimumu 5 dk; önceki tur bitmeden yeni tur atlanır — pencereye sığmak şart).

> **Az-track sanatçı backfill'i (2026-07-16, migration 0101):** `<5` track'li
> sanatçıda İSİM aramalı profil kurulmaz (Last.fm güven hakemi çalışamaz) — track
> `genre_pending_reason='artist_too_small'` ile bekler. Ama track-çapasından
> **doğrulanmış** Deezer artist.id varsa `get_or_build_artist_profile(id_only=True)`
> güvenlidir (yalnız Deezer-by-id + db_tracks; isim araması yok → çakışma riski yok).
> Ana kuyruk boşken `small_artist_backfill` pending'leri sanatçı-bazlı yeniden dener;
> bulunamayanlar `small_artist_no_match` olur (kalıcı DEĞİL) — sanatçı ≥5 track'e
> ulaşınca `reactivate_small_artist_pending` RPC'si iki işareti de temizler, ana
> akış tam kaynaklarla dener. Canlı doğrulama: %69 çözüm, sıfır 429.

> **Spotify genre terk edildi (2026-06-30):** Dev Mode 23 saatlik 429 kotası. MusicBrainz
> ISRC yerine artık recording/artist araması (search→MBID→lookup `inc=genres+tags`) ile
> kullanılıyor; ISRC gerekmiyor.

### Taste modeli (FAZ P6 — çekirdek canlıda, 2026-07-07)

**Otorite (tasarım):** `docs/reference/sosyal-platform-kararlari.md` MODÜL 1 (§1.1–1.14).
Buradaki kayıt yalnızca **mimari sınır** (tablolar/RPC/cron) — algoritma detayı orada.

**Motor mimarisi: Postgres RPC** (Sahip kararı). Tüm hesap DB içinde `SECURITY
DEFINER` fonksiyonlarla; her biri IDOR guard'lı (`p_user_id IS DISTINCT FROM
auth.uid() → forbidden`, analytics 0008 deseni). Migration'lar **0032–0039**.

**RPC zinciri** (orkestratör `refresh_user_taste(p_user_id)` sırayla çağırır):
1. `compute_user_track_weights` — completion% × decay (`0.5^(ay/3)`, yarı-ömür 3ay) +
   evergreen (≥40 çalma/2yıl → decay muaf +2×) + **mükerrer birleştirme** (`merge_key
   = lower(title)|lower(artist)`; ISRC boş olduğu için aynı şarkının farklı
   `spotify_id`'leri birleşir). → `user_track_weights`.
1.5. `apply_liked_songs_weight` — **A3 (0187)**. Beğenilmiş ama dinleme eşiğini
   geçmemiş şarkıları taban ağırlıkla (2.0) tabloya katar. ⚠ Sıra kritik:
   ağırlıklardan SONRA, tür vektöründen ÖNCE. Ölçüm (2026-08-02): 2.662 aktif
   beğeninin 828'i `user_track_weights`'te yoktu; 312'si eklendi (kalan 475
   `merge_key` çakışması). Zaten ağır olana bonus VERMEZ — beğeni orada
   ağırlığın tekrarı (1,21 kat).
2. `compute_user_behavioral_signals` — `play_events`'ten 6 skaler (kararlılık/shuffle/
   tamamlama/gün ritmi/coğrafya) + exploration. → `user_taste_profile`, `has_l2=true`.
3. `compute_user_genre_vector` — tür rollup (şarkı→sanatçı→tür), L2-normalize (jsonb),
   entropi `H=-ΣP·log₂P`, baskın tür, **olgunluk = ağırlıklı kapsama** (türü olan
   `final_weight` / toplam ≥%90 → `is_mature`). → `user_genre_vectors`.
4. `compute_user_mainstream` — L3 varsa `user_export_signals` Wrapped
   `avgTrackPopularity`; yoksa `NULL` (proxy yok, dürüst). `has_l3` set eder.
5. `compute_user_identity` — deterministik katmanlı kimlik (E1 Davranış / E2 İlişki /
   E3 Ritüel canlı; E4/E5/E6 bekliyor). → `identity_words[]`.
6. `materialize_user_top_strips` — iki şerit (`now`=decay, `evergreen`=final×2) →
   `user_top_strips`; `is_hidden` kümesi korunur (histerezis ~%10).

**Cron:** worker `taste_runner` (play_events olan her kullanıcı → `refresh_user_taste`,
izole hata) + `cron/taste_refresh` (**haftalık**). `pipeline_runs` run_type CHECK'ine
`taste_refresh` eklendi (0039 — aksi halde `record_run` sessiz patlar). **Not:**
Railway servis kaydı bekliyor (`python -m app.cron.taste_refresh`).

> **⚠️ Kullanıcı listesi RPC ile (2026-07-17):** `taste_runner` VE `recap_runner`
> kullanıcıları `recap_user_ids()` RPC'siyle (migration 0102, DB-taraflı DISTINCT)
> çeker — eski `play_events.select("user_id").limit(100000)` + Python `set()` yolu
> Supabase REST'in ~1000 satır kırpmasına takılıyordu, 253k satırlık tabloda yalnız
> en eski kullanıcılar görünüyordu (friend iki cron'dan da sessizce düşüyordu, cron
> yine de `"outcome":"success"` diyordu). Detay: `CLAUDE.md` «Ölçüme güven». Yeni bir cron
> kullanıcı taraması eklerken bu RPC'yi kullan, aynı deseni tekrarlama.

**Cron kayıt kuralı (önemli):** Yeni bir worker cron eklerken `pipeline_runs` iki CHECK
constraint'i de güncellenmeli: `run_type` (yeni cron adı) + `outcome` (runner'ın
dönebileceği tüm değerler; `success/blocked/empty/error/partial`). Aksi halde
`record_run` ilk çalışmada INSERT constraint ihlaliyle patlar. Kayıtlı cron'lar:
export · enrichment · spotify_recently_played · playlist_refresh ·
nightly_sync (⛔ kodu kaldırıldı 2026-08-26, CHECK constraint'te tarihsel
olarak duruyor) · ytmusic_liked · ytmusic_history · taste_refresh ·
**recap_refresh** (0056, aylık
`app.cron.recap_refresh`) · **auto_playlist** (0056, aylık `app.cron.auto_playlist`) ·
**isrc_backfill** (0121, `app.cron.isrc_backfill`).

**ISRC dolgu cron'u (FAZ ISRC-D, 2026-07-20):** `pipeline/isrc_backfill.py` —
**Deezer öncelikli** (API key yok, cezasız; canlı ölçüm: bilinen ISRC'lerde 40/40
doğru şarkı, katalogda ~%90 isabet; MusicBrainz %20 ve iTunes 0 → elendi).
Akış: fold'lu arama + sanatçı≥0.85/başlık≥0.60 doğrulaması → `/track/{id}` →
ISRC + duration_ms(s×1000) + album + release_year → `apply_catalog_backfill`
RPC (COALESCE). Bulunamayan da damgalanır (sonsuz retry yok); 429/kota →
`cooldown` (provider=deezer) + tur `partial`. Tur: 8×50 track, bütçe 240sn.
Eski Spotify-tabanlı `catalog_backfill` yalnız kalıntı katmanı (aylık, fiilen
kapalı). Railway servis kaydı Sahip onayı bekliyor.

**Recap cron:** `recap_runner` → `build_recap` (live: bu ay+bu yıl her çalışmada;
frozen backfill: geçmiş dönemler idempotent). Railway `0 3 1 * *` (canlı, 2026-07-09).

**Otomatik playlist cron:** `auto_playlist_generator.run_auto_playlist_job` — opt-in
`auto_playlist_rules` (enabled=true); top_month her ay ("Mayıs - 2026"), top_year yalnız
Ocak ("2025"). Temel taş `get_top_tracks_for_rule` RPC (0055). Manuel muadili:
`lib/playlists/generate.ts` + `/api/playlists/generate` (aynı RPC, engine.ts yazıcıları).

**Frontend:** `src/lib/analytics/taste-profile.ts` (RPC tablolarından `available:boolean`
desenli okuma) → `two-strips.tsx` (Şu An / Değişmeyenler, mobil alt alta) +
`identity-badges.tsx` (`/taste` sayfası).

**Üç veri katmanı ("Büyüyen Kimlik"):** L1 Spotify Connection (taste yok, "ne varsa o")
→ L2 Streaming History ZIP (kademeli açılan profil, olgunluk %90) → L3 Account+Technical
ZIP (seviye atlama, L2 fallback'li). `has_l2`/`has_l3`/`genre_coverage_pct` bunu izler.

### ZIP verisi → ürün (FAZ ZIP-ÜRÜN — migration 0176-0193, 2026-08-02 canlıda)

Account Data / Technical Log ZIP'lerindeki veriyi ürüne bağlayan katman.
Plan arşivi: `archive/planlar/zip-verisi-urune-baglama-TAMAMLANDI.md`.

**Kullanıcıya görünen**

| RPC | Ne | Not |
|---|---|---|
| `liked_songs_page` · `user_liked_track_ids` | A2 beğenilenler | DB-taraflı sayfalama (§4.3) |
| `discovery_bucket_page` | A4 keşif kovaları | Eşikler **parametre**, gömülü değil |
| `playlist_track_added_dates` | A1 eklenme tarihi | Ad VEYA URI ile eşleşir |
| `playlist_growth_series(uuid,uuid)` | A8 büyüme serisi | **0182**: ID'li imza; eski `(uuid,text)` "tüm kütüphane" için duruyor |
| `car_listening_summary` | A6 araba | Recap dipnotu + journey ölçümü |
| `mood_profile` | A13.1 duygu profili | **0191**, kalibrasyon hatası 2,62 puan |
| `recap_obsession` | A13.5 takıntı | **0193**: YOĞUNLAŞMA ölçer (en yoğun 30 gün) |
| `recap_top_albums` | A13.6 albümler | ≥3 farklı şarkı şartı (single tuzağı) |
| `recap_discovery_total` · `recap_number_one` · `recap_genre_variety` | A13.2/3/7 | Kart DEĞİL — manifesto dipnotu |

**Motor yakıtı (kullanıcıya GÖSTERİLMEZ)**

| RPC | Ne | Durum |
|---|---|---|
| `inference_genre_overlap` | A12 çıkarım örtüşmesi | **Koşullu** ağırlık: iki tarafta da etiket varsa %10 |
| `shuffle_identity` · `shuffle_similarity` | A9 shuffle kimliği | ⚠ Motora BAĞLI DEĞİL — `behavior_similarity` zaten `shuffle_reliance` kullanıyor (çift sayma olurdu). Katkısı **dönemsel** ölçüm |
| `wrapped_engine_inputs` · `wrapped_taste_similarity` | A13.9 | ⚠ Motora bağlı değil: Wrapped tek kullanıcıda |
| `daylist_name_pool` · `daylist_identity_contrast` | A11 | UI YOK (plan şartı) |
| `soundcapsule_coverage` · `soundcapsule_coverage_audit` | A10 doğrulama | Admin `/admin/system` |

**⚠ Kalibrasyon parametreleri — yeniden ölçülmeli (§6.1)**

Hepsi bugün **tek/az kullanıcının** verisinden türetildi:

- `pair_match_score` güven ağırlığı **K=50** (0181)
- A12 payı **%10**, koşullu (0185)
- A9 eşikleri **%25 / %70** (0186)
- A3 taban ağırlığı **2.0** (0187)
- A10 kapsama eşiği **%90** (0184)
- A13.1 tür→duygu haritası **E** (0191) — `scripts/wrapped-duygu-kalibrasyon.mjs`
- A13.5 eşikleri: 30 çalma + yoğun pencerede 15 (0193)
- A13.6 albüm eşiği: **3 farklı şarkı** (0192)

**⚠ NULL ≠ 0 sözleşmesi.** A12/A9/A13.9 benzerlik fonksiyonları "ölçülemez"
için **NULL**, "ölçüldü ve sıfır" için **0** döndürür. Çağıran taraf ikisini
ayırmak zorunda: NULL'a ağırlık vermek, veri eksikliğini düşük skor olarak
cezalandırmak olur (0185'te simülasyonla yakalandı — sabit ağırlık her çifti
karşılıksız %10 düşürüyordu).

**Veri sınırları (ölçüldü 2026-08-02)**

- Playlist eşleşmesi **kısmi**: 112 listeden 30'u (export'ta playlist URI'si yok)
- `spotify_export` 2026-06-23'te bitiyor, `api_realtime` 2026-07-02'de başlıyor
  → **24 Haz – 1 Tem arası 8 gün hiçbir kaynakta yok** (A10 buldu)
- `tracks` tablosunda `popularity`/`explicit` sütunu **YOK** → A13.9 yalnız
  Wrapped'ten gelir, kendimiz hesaplayamayız

### Track matching önceliği

1. `spotify_id` eşleşmesi (INSERT → `tracks` tablosu export sırasında doldurulur)
2. Title + artist fuzzy (`pg_trgm`, ±3 sn süre toleransı)
3. Unmatched → `track_id = null`

### Platform görsel sistemi (track/artist/album kapak — 2026-07-03 canlı doğrulandı)

**Sözleşme kısıtı (Spotify/Apple Music Developer Policy):** görseller kalıcı
DB/sunucuya indirilemez, kırpılamaz/bulanıklaştırılamaz/overlay eklenemez,
platform atfı (logo) + orijinal platforma deep link zorunlu. Spotify köşe
yuvarlama: ≤64px → 4px, >64px → 8px. **Mimari karar: doğrudan platform
URL'i, CDN proxy/indirme yok, DB'ye görsel URL kolonu eklenmez.**

**Spotify — gerçek API davranışı (client credentials ile canlı test edildi,
DB'deki gerçek `spotify_id`'lerle):**
- `GET /tracks/{id}` yanıtındaki `album.images[]` **3 boyut** verir: 640×640,
  300×300, 64×64 — `i.scdn.co` CDN, kimlik doğrulama gerektirmez (`<img src>`
  client-side'da token'sız çalışır, `curl -I` ile 200 OK doğrulandı).
- **Sanatçı görseli AYRI ÇAĞRI gerektirir** — track/albüm yanıtındaki
  `artists[]` sadece `id`/`name` içerir, `images` yok. `GET /artists/{id}`
  şart. Sanatçı görseli **farklı boyut seti** döner: 640×640, **320×320**,
  **160×160** (albümden farklı — 300/64 değil, bu ayrım eski spec'te yoktu).
- **Albüm görseli için ayrıca `/albums/{id}` çağırmaya gerek yok** —
  `track.album.images` zaten `GET /albums/{id}` ile birebir aynı veriyi
  içeriyor (canlı doğrulandı). Gereksiz ekstra çağrıdan kaçının.
- **Batch `/tracks?ids=...` hâlâ 403** (Dev Mode kısıtı, bkz.
  [[spotify-dev-mode-batch-tracks-403]] hafızası) — N track için N ayrı
  `/tracks/{id}` çağrısı şart.
- **Albüm/sanatçı görsel URL'leri stabildir** (aynı track iki kez çekildi,
  URL değişmedi) — sadece **playlist görselleri** ~24 saatte expire olur
  (Spotify dokümantasyonu; bu proje henüz playlist kapak görseli
  göstermiyor, dolayısıyla expire riski şu an devrede değil).

**Performans ölçümü (anlık çekim mi, DB'de sakla mı sorusuna kanıt):**
- Tekil sıralı istek: **~300ms/track** — 20-30 track'lik bir liste sıralı
  çekilirse 6-9 saniye, kabul edilemez.
- **Paralel istek (server-side, 10-15 eşzamanlı worker): 30 track ~1.8
  saniyede, 0 hata/429.** Next.js route handler veya server component'ten
  `Promise.all` ile toplu çekim pratik ve hızlı.
- **Sonuç: anlık çekim DB saklamadan daha mantıklı** — sözleşme zaten
  kalıcı saklamayı yasakladığı için bu zaten tek seçenekti, ama performans
  da bunu destekliyor. Client-side'dan tek tek fetch YAPILMAMALI (rate-limit
  riski + yavaş); server-side toplu paralel çekim + `sessionStorage` 1h
  cache (spec'teki öneri) doğru yaklaşım.

**Next.js entegrasyonu — whitelist yalnızca `<Image>` için şart:**
CSP zaten `img-src 'self' data: blob: https:` (genel `https:` izinli) —
yani düz `<img src>` (mevcut `top-list.tsx` böyle kullanıyor) **hiçbir
whitelist olmadan** platform CDN'lerinden görsel gösterebilir. `next.config.ts`'de
**`images.remotePatterns` şu an tanımsız** — Next.js `<Image>` bileşenine
geçilecekse (spec'in `CoverArt` bileşeni önerisi) bu whitelist zorunlu hale
gelir: `i.scdn.co`, `mosaic.scdn.co` (Spotify). (Apple/YouTube host'ları plan
07 sonrası gereksiz — Rosso saf Spotify.)

**DB durumu (2026-07-03 doğrulandı):** `tracks` tablosunda görsel URL kolonu
YOK (bilinçli — sözleşme uyumu), `artists` tablosunda da `spotify_id` bile
yok (genre DNA sistemi Deezer/Last.fm tabanlı, Spotify'dan bağımsız).
`album_image_url` alanı `top-list.tsx`/`listenings-content.tsx`'te tip
olarak tanımlı ama **hiçbir sorgu fonksiyonu şu an doldurmuyor** — placeholder
hep gösteriliyor. Bu, spec'in "Faz 6: CoverArt bileşeni + track listesinde
`album.images[2]` kullanımına geç" maddesinin henüz uygulanmadığının kanıtı.

**Uygulama önceliği (değişmedi, spec'teki sıra geçerli):**
1. `next.config.ts` whitelist (yalnızca `<Image>` kullanılacaksa)
2. `CoverArt` ortak bileşeni — server-side toplu paralel görsel çekimi
   (`Promise.all`, tek tek client-side fetch değil) + `sessionStorage` 1h
   cache ile besle
3. Track listelerinde placeholder yerine gerçek `album.images[2]` (64px)
   kullanımına geç
4. Sanatçı sayfalarında ayrı `/artists/{id}` çağrısı gerektiğini unutma
   (track/albüm yanıtı yetmez)

### Boyut eşleştirme kararı (Sahip onayı — 2026-07-03)

Track/albüm 3 boyut döner (640/300/64), sanatçı farklı 3 boyut döner
(640/320/160) — UI'daki mevcut placeholder boyutlarına şöyle eşlenir:

| UI yeri | Placeholder boyutu | Track/Albüm seçimi | Sanatçı seçimi |
|---|---|---|---|
| Liste satırı (top-list, recap) | küçük (~40-64px) | `images[2]` (64×64) | `images[2]` (160×160, en yakın) |
| Kart / orta önizleme | orta (~120-160px) | `images[1]` (300×300) | `images[1]` (320×320) |
| Hero / detay sayfası | büyük (~300px+) | `images[0]` (640×640) | `images[0]` (640×640) |

Sanatçının en küçük seçeneği (160px) track'inkinden (64px) daha büyük —
liste satırında sanatçı görseli kullanılacaksa 160px'i olduğu gibi küçük
render etmek (`width/height` CSS ile küçültme) yeterli, ekstra küçük boyut
Spotify'da yok.

### Eşzamanlı istek sayısı ve strateji (Sahip kararı — 2026-07-03)

**Bir sayfada aynı anda gösterilen track/artist/album görseli sayısı
pratikte küçüktür** (bir liste/recap/playlist sayfası tipik olarak
10-50 satır) — canlı test edilen "30 track paralel ~1.8s" senaryosu zaten
gerçekçi üst sınırı temsil ediyor. Bu ölçekte:

- **Track başına ayrı istek güvenle kullanılabilir** — batch endpoint zaten
  Dev Mode'da 403 verdiği için tek seçenek bu, ve performans testi bunun
  yeterince hızlı olduğunu kanıtladı.
- **Sunucu tarafında (`Promise.all`) paralel çekim zorunlu** — sayfa
  render edilmeden önce tüm görsel URL'leri toplanıp tek seferde hazırlanır,
  UI'da "bazı görseller geç geliyor" tutarsızlığı olmaz.
- **Skeleton/yükleme animasyonu korunur** — sayfa verisi (track/artist
  isimleri + görsel URL'leri) hazır olana kadar mevcut skeleton bileşeni
  gösterilmeye devam eder; görseller teker teker "pop-in" yapmaz, sayfa tek
  seferde tam veriyle render olur.
- **Albüm görseli için `track.album.images` yeterli** — ayrı `/albums/{id}`
  çağrısı yapılmaz (yukarıda doğrulandı). **Sanatçı görseli göstermek
  gerektiğinde** ayrı `/artists/{id}` çağrısı bu paralel `Promise.all`
  grubuna dahil edilir (aynı istek dalgasında, ek bir round-trip beklemeden).

---

## 5. Renk Sistemi

**Kanonik kaynak:** `src/app/globals.css` → `:root` · Mobil: `apps/mobile/src/theme/tokens.ts`
**Bağlayıcı kurallar:** `docs/design/katmanlar/dashboard-design.md` §3

**TEK PALET: Deep Violet** (2026-08-01). Palet seçici, `PaletteProvider` ve
`rosso-palette` storage anahtarı KALDIRILDI — önceki 4 seçilebilir tema
arşivde: `archive/tasarim/eski-4-palet-katalogu.md`.

| Token | Değer | Rol |
|-------|-------|-----|
| `--bg` | `#0A0910` | Sayfa zemini |
| `--surface` / `--surface-hi` | `#16141F` / `#1F1C2C` | Kart / hover |
| `--text` / `--muted` / `--faint` | `#F4F4F5` / `#A5A0B5` / `#8B85A6` | Metin hiyerarşisi |
| `--accent` / `--accent-hover` | `#7C5CFF` / `#9D84FF` | Yalnız durum ve aksiyon |
| `--on-accent` | `#0A0910` | Accent zemin üstünde metin (ölçüm: beyaz AA'yı geçmiyor) |
| `--v1`…`--v5` | mor alfa rampası | Grafik, ısı haritası, bar |

Eski `--color-*` adları korundu ve kanonik adlara bağlandı (200+ kullanım yeri).
**Yeni kodda kanonik adları kullan.**

**Admin paneli** kendi ops-teal CSS değişkenlerini kullanır (`admin-theme.css`);
ürün paletiyle çakışmaz — `#56B6C2` ürüne SIZAMAZ.

**Platform rengi** (yalnızca rozet/chart): Spotify `#1DB954` (YT/Apple renkleri plan 07'de kaldırıldı)

### 5.1 Mobil dokunma fiziği (2026-08-14)

**Kanonik kaynak:** `apps/mobile/src/theme/physics.ts`
**Bağlayıcı kurallar:** `docs/design/katmanlar/mobil-design.md` §11.2

Renk token'ları gibi, **dokunma hissi de tek kaynaktan** gelir. Bileşende elle
`stiffness`/`damping` yazmak yasak (hardcoded hex yasağının etkileşim
karşılığı).

| Dışa açılan | Ne yapar |
|---|---|
| `spring(dampingRatio, response)` | Apple'ın iki parametresini RN `Animated.spring`e çevirir |
| `springs.press/move/momentum/sheet` | İsimli reçeteler — yeni his gerekirse buraya eklenir |
| `pressScale.card/control/compact` | Yüzey ağırlığına göre ölçek (0.98 / 0.96 / 0.94) |
| `haptics.selection/tap/snap/success/warning/error` | Yalnız seçim değişimi · eşik · sonuç; sıradan gezinme **almaz** |

Tüketiciler: `usePressPhysics` (hook) · `RowPressable` (satır — ölçek değil
zemin ışığı) · `IconPressable` (küçük hedef) · `Sheet` (bottom sheet).

**Jest kurulumu:** `GestureHandlerRootView` `App.tsx`'te en dışta olmak
**zorunda** — yoksa jestler Android'de sessizce çalışmaz (derleme ve
`expo-doctor` bunu yakalamaz).

**Sheet kapanma kararı:** `apps/mobile/src/lib/sheet-policy.ts` (saf mantık,
test edilir) — **hız VEYA mesafe**, yalnız mesafe değil.

⚠ **İzin ↔ kütüphane:** yeni native kütüphane eklenirken
`node_modules/<lib>/android/src/main/AndroidManifest.xml` okunup `app.json`
→ `blockedPermissions` ile karşılaştırılır. 2026-08-14'te `expo-haptics`
`VIBRATE` istiyordu ama liste onu **bloke ediyordu**; APK'da tüm haptikler
ölü olacaktı. Hiçbir otomatik kontrol bunu yakalamaz (`mobil-design.md` §14.1).

**Semantik:** success `#10B981` · error `#EF4444` · info `#3B82F6`

**Living Avatar:** Dominant genre → 15 palet mapping (`GENRE_PALETTES`); sphere animasyon hızları tasarım kimliği (yavaşlatılmaz).

---

## 6. Veri Modeli (Özet)

Kaynak: `supabase/migrations/0001_initial_schema.sql` ve sonraki migration'lar

| Tablo | Amaç |
|-------|------|
| `platform_connections` | OAuth token'ları (şifreli), export durumu |
| `tracks` | Normalize **global** katalog (user_id YOK): `spotify_id`, `genres[]`, `genre_data` (jsonb DNA), `genre_source`, `artists`, `spotify_artist_ids` |
| `artists` | Sanatçı genre DNA profili (5 slot, ağırlıklı), `name_normalized` tekil, 30 gün TTL cache (`refreshed_at`) |
| `play_events` | Dinleme olayları; `track_id NOT NULL`, `skipped`, `ms_played`. Yalnızca müzik. |
| `podcast_events` | Podcast dinlemeleri (play_events'ten ayrı) |
| `playlists` / `playlist_tracks` | Çok platformlu playlist mirror |
| `export_jobs` | ZIP işleme durumu; `export_type`, `genre_pending` (UI rozeti), stale recovery kodu export cron başında |
| `migration_jobs` | (Kullanılmıyor) — playlist taşıma özelliği plan 07'de kaldırıldı; tablo boş |
| `sync_rules` / `sync_runs` | ⛔ (Kullanılmıyor) — platformlar-arası playlist senkron kuralları; kod 2026-08-26'da kaldırıldı (Rosso saf Spotify, işlevsizdi), tablo boş/koruma amaçlı duruyor |
| `auto_playlist_rules` / `auto_playlist_runs` | Otomatik playlist |
| `user_preferences` | Kullanıcı ayarları |
| `api_cooldowns` | Deezer/Last.fm kota durumu; `blocked_until`, sleep yoktur |
| `pipeline_runs` | Her cron çalıştırması = 1 satır JSONB (outcome, processed, error, details) |
| `liked_songs_events` | AddedToCollection / RemovedFromCollection |
| `playlist_track_events` | AddedToPlaylist / AddToPlaylist |
| `car_sessions` | CarDetectionEvent connect/disconnect çifti |
| `user_export_signals` | Wrapped2025, SoundCapsule, Inferences, DaylistGenerated, HomeSectionResponse |
| `recaps` | Recap: dönemsel özet (`period_type` month/year, `period_label`, `status` live/frozen, `payload` JSONB). `build_recap` RPC üretir (play_events+tracks agregasyonu + deterministik persona `{fusion_title,identity_words,frame_sentence}` — taste profilinden, Postgres'te); `get_latest_monthly/yearly_recap`/`list_recaps` okur. Worker cron `app.cron.recap_refresh` (live + frozen backfill, idempotent) tetikler. Migration 0053+0054, FAZ RECAP-R1/R2 |
| `user_track_weights` | Taste: şarkı ağırlığı (`merge_key` ile mükerrer birleştirilmiş), `decayed_weight`/`raw_weight`/`is_evergreen`/`final_weight`, `representative_track_id` |
| `user_genre_vectors` | Taste: tür vektörü (jsonb, L2-normalize), `dominant_genre`, `contributing_tracks` |
| `user_taste_profile` | Taste: davranışsal skalerler + entropi + `mainstream_ness`/source + `identity_words[]`/`identity_blurb` + `has_l2`/`has_l3`/`genre_coverage_pct`/`is_mature` |
| `user_top_strips` | Taste: iki şerit (`strip='now'`/`'evergreen'`), `rank`, `merge_key`, `is_hidden` |
| `social_profiles` | Sosyal: `username` (CITEXT unique), `display_name`, `bio`≤300, `birth_date` (18+ CHECK), `gender`, `gender_pref TEXT[]` (**client'a gitmez**), `is_discoverable`, `onboarded_at` |
| `profile_photos` | Sosyal: 1-3 foto, `storage_path` (private bucket), `is_main`, `position` |
| `user_consents` | Sosyal: granular rıza (`consent_type`, `granted`, `granted_at`) |
| `follows` / `blocks` | Sosyal graf (takip / engel; block follows'u iki yönlü siler) |
| `reports` | Sosyal: şikayet kuyruğu (`target_type`, `category`; service_role-only okuma) |
| `match_requests` | Sosyal: eşleşme isteği (`status` pending/accepted/rejected, unique çift) |
| `match_daily_slots` | Sosyal: günlük 5 eşleşme kovası (`raw_score`, `now/evergreen_overlap`, `shared_rare`, `state`) |
| `match_passes` | Sosyal: geçilen adaylar (anti-tekrar) |
| `conversations` | Sosyal: sohbet (`user_a<user_b` unique, `opened_via`, `status`) |
| `messages` | Sosyal: mesaj (`body`≤2000, `read_at`; Realtime publication) |
| `profile_hidden_items` | Profil: kullanıcının gizlediği top şarkı/sanatçı (`item_type`, `item_key`); okuma katmanı herkese uygular (6. kayar). `get_hidden_items` RPC. Migration 0058 |
| `profile_interests` | Profil: ilgi/hobi (hazır havuz, çoktan-çoğa); public okunur. Havuz 7 kategori / 73 etiket (`profile-constants.ts`). Migration 0059 |
| `profile_prompts` | Profil: müzik prompt cevapları (`prompt_key`, `answer`≤200, `track_id`→`tracks` nullable). `kind='track'` sorularda cevap kullanıcının kendi geçmişinden seçilir, profilde kapakla gösterilir. Arama: `search_my_tracks` RPC (SECURITY DEFINER + IDOR guard). Migration 0059 + 0060 |
| `social_profiles` (+kolon) | P3: `city`/`country`/`lat`/`lon`(client'a GİTMEZ)/`university`/`occupation`/`featured_playlist_id`. Burç `zodiac_sign(birth_date)` ile hesaplı. Mesafe `distance_between_users` (Haversine, server-side). `social_profiles_public` view genişletildi (lat/lon/birth_date HARİÇ, **security_invoker=false korundu**). Migration 0059 |
| `comments` | Sosyal: tanışma/intro (görünürlük asimetrisi, 2-ret sayacı) |

**Sosyal view/bucket:** `social_profiles_public` (VIEW, `security_invoker=false`, gizli
kolonlar hariç + block filtreli) · `profile-photos` (private storage bucket, EXIF strip).

**Export filtreleri (worker):**
- `ms_played < 5000` → discard
- Aynı timestamp + URI → dedup
- `identity.json` → hard-discard (içerik okunmaz)

**Not:** `enrichment_cache`, `enrichment_checkpoints` tabloları eski mimariye aitti — yeni cron-tabanlı sistemde kullanılmıyor. Genre enrichment artık `genres IS NULL` filtresiyle idempotent; cursor gerekmez.

### 6.1 Playlist içeriği okuma

`playlist_tracks_page(user, playlist)` (migration 0211) — bir listenin
şarkılarını **sırasıyla** döner. Web ve mobil aynı RPC'yi kullanır ki sıra ve
içerik birebir aynı olsun.

⚠ Sıra kolonu `position` DEĞİL **`track_pos`**. Mobil istemci bu adı okuyor;
değiştirilirse her satır `i+1`'e düşer ve liste sırası **hata vermeden** bozulur.
Playlist bir DİZİdir, küme değil — sıra ürünün kendisi.

**Rosetta kaldırıldı (2026-08-04).** Arayüz, API rotaları, `src/lib/rosetta` ve
17 DB fonksiyonu silindi (migration 0212). Tanımlar 0196-0210 migration'larında
duruyor. 9 tablo veri kaybı olmasın diye DÜŞÜRÜLMEDİ; erişilemez kabuk hâlinde.

## 7. AI Özellik Referansları (İleride)

> Henüz uygulanmadı. Mimari referans olarak tutuluyor.

### Spotify Campfire Agent — Eylem Taksonomisi

**Kaynak:** Spotify APK analizi, 2026-07-01.

Spotify'ın AI asistanı (kod adı "Campfire") şu eylem kategorilerini yönetiyor:
- **Profil:** taste profili analizi, top track'lere bakma, yakın geçmişe bakma
- **Playback:** müzik çalma, durdurma, sıradaki şarkıya geçme, tekrar modu
- **Library:** playlist oluşturma/yönetme, kuyruğa ekleme, klasör yönetimi
- **Social:** Jam oturumu başlatma/bitirme/yönetme, üye kontrolü
- **Discovery:** öneri bulma, albüm/sanatçı/şarkı detayı arama
- **Device:** cihaz listesi, ses seviyesi, bağlantı yönetimi

**Rosso için uygulama zamanı:** AI özet veya sohbet özelliği eklenecekse bu taksonomi
`system_prompt` bağlamı ve eylem sınıflandırması için referans alınabilir.
Özellikle "taste profili analizi" + "top track'lere bakma" Rosso'nun
recap/taste modülüyle doğrudan örtüşüyor.

**Bağlantılı:** `docs/vision/fikir-backlogu.md` — Zevk Profili Notları

---

## 8. Güvenlik & Uyumluluk

- **RLS** tüm kullanıcı tablolarında; `auth.uid()` wrap'li politikalar. `api_cooldowns`/
  `pipeline_runs`/`yt_search_quota` bilinçli policy'siz (service_role-only default-deny).
- **CSP:** `script-src 'self' 'unsafe-inline'` (next.config'te). Nonce-tabanlı CSP
  denendi (2026-07-08) ama Next.js 16 hydration inline-script'lerine nonce uygulanamadı
  → tüm client component'ler donuyordu (hero boş kaldı); geri alındı, ayrı kapsamlı
  iş olarak ertelendi. HSTS/X-Frame/nosniff de next.config'te.
- **Zip-bomb guard:** worker export parse öncesi açılmış-boyut (2GB) + oran (100x)
  sınırı (`zip_detect.guard_zip_bomb`) — kimlik-doğrulamalı DoS önlenir.
- **Token cipher:** AES-256-GCM (TS↔Python uyumlu). Anahtar 64-char OLMAMALI (TS UTF-8
  slice ↔ Python fromhex uyumsuzluğu → guard reddeder). Çözme başarısızsa RAISE (sessiz 401 yok).
- Client bundle secret-leak guard (CI: `bundle-secrets.test.ts`).
- Service role key yalnızca server-side; client'ta `anon` key.
- Spotify export'tan `ip_addr` gibi hassas alanlar DB'ye yazılmaz.
- **Admin paneli:** İki katmanlı kapı — Supabase `role=admin` metadata + 6 haneli PIN → HMAC-imzalı
  httpOnly cookie (8 saat TTL, SameSite=Strict). PIN ve session secret client'a sızmaz.
  `src/lib/admin/auth.ts` · Env: `ADMIN_PIN`, `ADMIN_SESSION_SECRET`.
- **KVKK/GDPR (2026-07-27/28):**
  - **Hesap silme:** soft-delete (`social_profiles.deleted_at` + 30 gün grace,
    geri alınabilir) → 30 gün sonra `account_purge` cron KALICI siler. Anında
    kalıcı silme YOK (yanlışlıkla silme kurtarılabilir).
  - **Veri taşınabilirliği:** `/api/account/export-data` → kullanıcının kişisel
    verisini JSON paketi olarak ANINDA indirir (`collectUserDataExport`). Token'lar
    HARİÇ (şifreli sır), başka kullanıcıyı ifşa eden veri HARİÇ. SMTP (Resend)
    gelince maile ZIP olarak da bağlanacak. Detay: `src/lib/account/data-export.ts`.
  - **Auth:** e-posta onayı sonrası `/login`'e yönlendirir (Supabase Site URL =
    `your-app.vercel.app`).

---

## 8. Proje Yapısı

```
project-rosso/
├── src/                    # Next.js uygulaması
│   ├── app/                # App Router sayfaları + API route handlers
│   ├── components/         # UI, nav, profile, charts, theme
│   └── lib/                # Servisler, crypto, platform-auth helpers
├── worker/                 # Python FastAPI worker (Railway)
├── supabase/migrations/    # Postgres şema (tek kaynak)
├── design-components/      # Ham HTML/CSS referans bileşenleri
├── docs/
│   ├── README.md           # Docs haritası
│   ├── design.md           # Tasarım giriş
│   ├── design/             # Tasarım otoritesi
│   ├── vision/             # Kimlik, narratif, teknik referans
│   ├── specs/              # Teknik / ürün spec'leri
│   ├── engineering/        # Export, worker, pipeline
│   ├── platform-dev-docs/  # Platform kısıtları + spotify zip arşivi
│   ├── plans/       # Aktif geliştirme planı
│   ├── research/           # Araştırma notları
│   ├── audits/             # Tarihli denetimler
│   └── superpowers/        # Tamamlanmış oturum plan/spec arşivi
├── .claude/CLAUDE.md       # Agent operasyon kuralları
├── e2e/                    # Playwright testleri
└── logs/                   # Günlük geliştirme logları
```

### Hangi dosyaya ne zaman bakılır?

| Soru | Dosya |
|------|-------|
| Buton radius, motion, Bento kuralları? | `docs/design/rosso-design-system.md` |
| Stack, mimari, API, veri modeli? | `docs/reference/teknik-mimari-referansi.md` (bu dosya) |
| Eşleşme skoru formülü, sosyal modül? | `docs/reference/sosyal-platform-kararlari.md` |
| Worker Railway deploy / bilinen limitler? | `docs/reference/spotify-veri-ve-zip.md` |
| Tamamlanan ana plan (arşiv)? | `docs/archive/planlar/00-rosso-ana-plan-TAMAMLANDI-2026-09-04.md` |
| Spotify 5 kullanıcı limiti? | `docs/platform-dev-docs/spotify/critical-points.md` |
| Agent günlük log + plan kuralları? | `.claude/CLAUDE.md` |
| Ürün kimliği, ilkeler, marka tonu? | `docs/vision/kimlik-ve-ilkeler.md` |
| Vizyon, narratif, konumlandırma? | `docs/vision/konumlandirma.md` |

---

---

## 10. API İstek Pipeline & İstemci İptali (2026-08-05)

> Instagram ilham envanteri · Orta öncelik

### Middleware sırası (hedef)

Next.js `middleware.ts` + route handler guard'ları şu sıraya yaklaşmalı:

```
0. CSP nonce (istek başına)          ← 2026-08-13
1. Rate limit (auth / hassas uçlar)
2. Oturum doğrulama (Supabase SSR)
3. Yetkilendirme (rol / sahiplik)
4. İş mantığı (route handler)
5. Merkezi hata formatı
```

**Bugün:** `runMiddlewarePipeline`: (0) CSP nonce → (1) auth rate limit →
(2) Supabase oturum. `safeNextPath` login redirect'lerinde.

#### CSP nonce (adım 0) — 2026-08-13

Politika **middleware'de, istek başına** kuruluyor; `next.config.ts`'te
statik CSP **YOK** (bir daha eklenmemeli — iki CSP başlığı kesişim olarak
uygulanır ve statik olanın `'unsafe-inline'`i nonce'u etkisiz kılar).

| Dosya | İş |
| --- | --- |
| `src/lib/security/csp.ts` | Politika kurucu, nonce üretici, beyaz liste (web) |
| `src/lib/middleware/csp.ts` | Pipeline adımı — request+response başlığı |
| `apps/admin/src/lib/admin/csp.ts` | Admin karşılığı (ayrı politika) |

**Kritik kural:** nonce **hem request hem response** başlığına yazılır.
Next nonce'u *request*'ten okuyup script'lere basar (`app-render.js` →
`parseRequestHeaders`), tarayıcı *response*'takini uygular. Biri eksikse
sistem sessizce bozulur — request eksikse **beyaz ekran**, response
eksikse **koruma yok**.

**Nonce yalnız beyaz listedeki dinamik rotalara** uygulanır
(`NONCE_ELIGIBLE_PREFIXES`). Statik prerender edilen sayfalar ve 404'e
düşen tanımsız yollar nonce alamaz (HTML'leri build anında yazılır,
script'leri nonce'suzdur). Kara liste denendi ve canlıda kırıldı —
gerekçe ve ölçümler: `docs/decisions/guvenlik.md`.

**Geri dönüş:** `CSP_NONCE_MODE=off` env değişkeni — kod değişmeden,
deploy beklemeden eski davranışa döner.

### AbortSignal (istemci)

Kullanıcı sayfadan ayrılınca **okuma** istekleri iptal edilmeli:

```tsx
import { useAbortableEffect } from '@/lib/hooks/use-abortable-effect'
import { isAbortError } from '@/lib/fetch/is-abort-error'

useAbortableEffect((signal) => {
  void (async () => {
    try {
      const res = await fetch('/api/playlists', { signal })
      // ...
    } catch (error) {
      if (isAbortError(error)) return
      // gerçek hata
    }
  })()
}, [])
```

Manuel alternatif:

```tsx
useEffect(() => {
  const ac = new AbortController()
  fetch(url, { signal: ac.signal })
  return () => ac.abort()
}, [])
```

**İptal edilmez:** beğeni yazma, taşıma job'ı, şifre değişimi — yarım yazma riski.

Detay: worker tarafında `api_gate` + cooldown ayrı konu (`ogrenilen-dersler.md`).

---

## 11. Hızlı Komutlar

```bash
npm run dev          # http://localhost:3847 (veya 127.0.0.1:3847)
npm run build        # production build
npm run test         # Vitest
npm run e2e          # Playwright
npm run db:types     # Supabase → src/types/database.ts

cd worker && pytest  # Worker testleri
```
