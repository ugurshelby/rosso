# Spotify verisi ve ZIP içe aktarma

Spotify'ın verdiği veriler, ZIP dışa aktarma sistemi, ISRC geçmişi ve ZIP verisiyle ilgili kararların gerekçeleri. V2'de her kullanıcı kendi Spotify dev app'ini getirir (BYOC) ve ZIP'ini yükler.

> **Birleştirildi (2026-09-25):** aşağıdaki bölümler daha önce ayrı dosyalardı; geçmiş için git geçmişine bakın.

## İçindekiler

- Platform Veri Haritası — Rosso (SAF SPOTIFY) _(eski: `spotify-veri-ve-zip.md`)_
- Spotify Veri Yönergesi — Developer & Yönetici Referansı _(eski: `spotify-veri-ve-zip.md`)_
- Rosso — ZIP Verisi & Faz Sistemi · Karar GEREKÇELERİ _(eski: `spotify-veri-ve-zip.md`)_
- Export Sistemi — Referans Notu _(eski: `spotify-veri-ve-zip.md`)_
- ISRC — Geçmişten Bugüne Tam Bağlam _(eski: `spotify-veri-ve-zip.md`)_
- Veri Envanteri — İki Yeni ZIP'in Ürün Entegrasyonu Kararına Hazırlık _(eski: `veri-envanteri-iki-yeni-zip-entegrasyonu.md`)_
- Spotify Wrapped2025 — Recap Geliştirme Rehberi _(eski: `spotify-veri-ve-zip.md`)_

---

## Platform Veri Haritası — Rosso (SAF SPOTIFY)

_Eski dosya: `reference/spotify-veri-ve-zip.md`_

> ⚠ **2026-07-28 (plan 07): Rosso artık YALNIZ SPOTIFY.** YouTube Music + Apple
> Music komple kaldırıldı. Aşağıdaki YT/Apple bölümleri (Bölüm 2 karşılaştırma
> tablosunun YT/Apple sütunları, Bölüm 3 Senaryo B/C/D/E) **artık geçersiz** —
> tarihsel bağlam için tutuluyor, gerçek durum yalnız Spotify. Detay:
> `archive/planlar/07-yt-music-apple-music-kaldirma-TAMAMLANDI.md`.
>
> **Amaç:** Spotify verilerinin Rosso'da hangi özelliklere bağlandığını özetler.
>
> **Son güncelleme:** 2026-07-28 (plan 07 — saf Spotify)

---

### Önce: Veri Nasıl Geliyor? (yalnız Spotify)

```
Spotify OAuth (API)          → profil, playlist, gerçek zamanlı meta
Spotify ZIP (3 tip)          → streaming history, account data, technical log
```

Detaylı aşama kilidi: `reference/veri-ozellik-kilit-haritasi.md`.

---

### Bölüm 1 — Spotify ZIP Export: Gelen Ham Veri

#### 1.0 ZIP Tipleri Özeti

| ZIP | Geliş süresi | Rosso'da rol |
|---|---|---|
| Extended Streaming History | ~1 gün | `play_events` — temel dinleme geçmişi |
| Account Data | ~4–5 gün | Wrapped, Sound Capsule, Inferences, kütüphane snapshot |
| Technical Log | ~4–5 gün | Beğeni timeline, playlist oluşturma, araçta dinleme |

Worker otomatik tip tespiti: [`reference/spotify-veri-ve-zip.md`](spotify-veri-ve-zip.md).

#### 1.1 Extended Streaming History — Dinleme Kaydı

Rosso saklar: `played_at`, `ms_played`, `track` meta (URI, isim, sanatçı, albüm), `platform`, `shuffle`, `skipped`, `reason_*`.

Atar / işlemez: podcast history, konum/IP, cihaz reklam ID'leri.

#### 1.2 Account Data — Seçilen Dosyalar

Özet: [`reference/spotify-veri-ve-zip.md`](spotify-veri-ve-zip.md) §4.2.

Notlar:
- `Follow.json` — kullanıcı takibi; Rosso işlemiyor. Sanatçı takibi bu exportta boş gelebilir; `YourLibrary.json` artists alanına güvenilmez.
- `SearchQueries.json` — KVKK; bireysel arama logu saklanmaz.

#### 1.3 Technical Log — Davranış Event'leri

Özet: [`reference/spotify-veri-ve-zip.md`](spotify-veri-ve-zip.md) §4.3.

`PlaylistCreated.json` → playlist `created_at` (**Aşama 2B**). Account Data'da oluşturma tarihi yok.

---

### Bölüm 2 — Platform Bazında Veri Karşılaştırması

| Veri türü | Spotify API | Spotify ZIP | YouTube Music | Apple Music |
|---|---|---|---|---|
| Çalma geçmişi (tam) | Kısıtlı (recently-played) | ✅ Extended History | Kısıtlı / export yok | Kütüphane odaklı |
| Playlist listesi | ✅ | ✅ (Account) | ✅ | ✅ |
| Playlist oluşturma tarihi | API kısıtlı | ✅ Tech Log | Değişken | Değişken |
| Beğenilen şarkılar (timeline) | ❌ / kısıtlı | ✅ Tech Log | ✅ | ✅ (token süresi) |
| Genre / taste | Enrichment gerekli | Inference sinyalleri | Sınırlı | Sınırlı |
| Kapak görselleri | URL (geçici) | — | thumbnails | Artwork nesnesi |

Platform görsel kısıtları ve runtime proxy kararı: [`reference/teknik-mimari-referansi.md`](../reference/teknik-mimari-referansi.md)
(görsel URL'si DB'ye yazılmaz; `CoverArt` bileşeni `/api/images/{kind}/{id}`'den anlık çeker).

---

### Bölüm 3 — Senaryo Bazlı Analiz

#### Senaryo A — Yalnızca Spotify Export

- **Aşama 1:** Dashboard istatistikleri, recap (temel kartlar), taste panelleri (enrichment sonrası genre).
- **Aşama 2:** Liked songs, ruh hali kartları, araçta dinleme, playlist `created_at`.
- **Eksik:** Gerçek zamanlı playlist sync; API olmadan playlist detayı export/API birleşimi gerekir.

#### Senaryo B — Yalnızca YouTube Music Bağlı

- Playlist taşıma / kütüphane görünümü mümkün.
- Derin recap / tam taste için Spotify export veya eşdeğer dinleme geçmişi gerekir.
- Kota ve rate limit: `archive/spotify-rate-limit-research.md`, `platform-dev-docs/youtube-music/`.

#### Senaryo C — Yalnızca Apple Music Bağlı

- MusicKit kütüphane erişimi; append-only playlist kısıtı.
- Arka plan sync token süresi dolunca re-auth gerekir.
- Detay: `platform-dev-docs/apple-music/critical-points.md`.

#### Senaryo D — Spotify Export + Apple Music

- Spotify tarafı A senaryosu; Apple playlist taşıma / eşleştirme.
- Cross-platform eşleştirme: `platform-dev-docs/shared/track-matching-sync-research.md`.

#### Senaryo E — Spotify Export + API + YT + Apple (tümü)

- En zengin yüzey; platform dağılımı kartı `play_events.platform` + bağlantı durumu.
- UI'da bağlam hatası riski: export işlendi ama dashboard hâlâ "veri bekleniyor" gösterebilir — state birleştirme kontrol edilmeli.

---

### Bölüm 4 — Özellik Bazında Gereksinim Tablosu

| Özellik | Minimum veri |
|---|---|
| Dashboard canlı istatistik | Aşama 1 (streaming) |
| Yıllık / aylık recap | Aşama 1 |
| Genre DNA / taste | Aşama 1 + enrichment |
| Liked Songs sayfası | Aşama 2B (tech log) veya 2A snapshot |
| Playlist oluşturma tarihi | Aşama 2B |
| Ruh hali / Wrapped kartları | Aşama 2A |
| Musical Journey | Aşama 1 + narrative modüller |
| Sosyal eşleşme (ileride) | Taste modeli + profil |

Tam kilit tabloları: `reference/veri-ozellik-kilit-haritasi.md`.

---

### Bölüm 5 — Export İşleme Kapasitesi

- Browser → signed URL → Supabase Storage → pgmq → Python worker (Railway).
- Vercel body limiti nedeniyle ZIP Vercel'den geçmez.
- Büyük ZIP'ler: stream parse, idempotency, stale job guard.

Detay: [`reference/spotify-veri-ve-zip.md`](spotify-veri-ve-zip.md).

---

### Bölüm 6 — Veri Paketi Notları

- Üç ZIP ayrı yüklenebilir; sıra önemli değil; worker tipi tespit eder.
- Account Data ve Technical Log genelde aynı pakette gelir (~4–5 gün).
- Tam dosya envanteri: `platform-dev-docs/spotify zip/spotify-data-tree.md` (arşiv snapshot).

---

### İlişki Referansı

| Konu | Dosya |
|---|---|
| Spotify alan seçimi | `reference/spotify-veri-ve-zip.md` |
| Özellik kilidi | `reference/veri-ozellik-kilit-haritasi.md` |
| Recap kartları | `design/katmanlar/recap-journey-design.md` · `vision/recap-journey-ilkeleri.md` |
| DB şema | `platform-dev-docs/shared/database-schema.md` |

---

## Spotify Veri Yönergesi — Developer & Yönetici Referansı

_Eski dosya: `reference/spotify-veri-ve-zip.md`_

> **Amaç:** Rosso'nun kullandığı Spotify veri kaynaklarını, seçim kararlarını, içerik yapılarını
> ve her verinin projede hangi göreve bağlandığını tek belgede toplar.
> Hem geliştirici hem yönetici perspektifinden okunabilir.
>
> **Son güncelleme:** 2026-06-28

---

### 1. Veri Kaynakları Genel Bakış

Rosso, Spotify verilerine iki farklı yoldan ulaşır:

| Kaynak | Ne | Nasıl Alınır | Güncellik |
|---|---|---|---|
| **Spotify Web API** | Gerçek zamanlı profil, playlist, son dinlenenler | OAuth 2.0 + token refresh | Anlık / dakika bazlı |
| **GDPR Export (ZIP)** | Tam dinleme geçmişi, kişisel çıkarımlar, teknik loglar | Kullanıcı Spotify'dan talep eder → ZIP indirir → Rosso'ya yükler | Tek seferlik snapshot |

Bu iki kaynak birbirini tamamlar: API gerçek zamanlı, ZIP ise tarihi derinlik sağlar.

---

### 2. Spotify Web API

#### Kimlik Doğrulama

Spotify OAuth 2.0 Authorization Code Flow kullanılır.

```
Kullanıcı → Spotify OAuth → authorization_code
→ /api/auth/spotify/callback → access_token + refresh_token
→ Supabase DB (users.spotify_tokens JSONB)
```

**Token yenileme:** `access_token` 1 saat geçerli. Worker ve API route'ları kullanmadan önce `refresh_token` ile otomatik yeniler.

#### Kullanılan Endpoint'ler — OKUMA

| Endpoint | Kullanım |
|---|---|
| `GET /v1/me` | Kullanıcı profili (display_name, id) — ⚠ `country`/`product`/`email` **artık dönmez** |
| `GET /v1/me/playlists` | Kullanıcı playlist listesi |
| `GET /v1/playlists/{id}/items` | Playlist şarkıları — ⚠ `/tracks` DEĞİL |
| `GET /v1/artists/{id}` | Sanatçı metadata (ISRC backfill için) |
| `GET /v1/tracks/{id}` | Track metadata + ISRC — ⚠ **tekil**, `?ids=` toplu uç kaldırıldı |
| `GET /v1/me/top/{type}` | En çok dinlenen sanatçı/şarkı (çalışıyor — 2026-08-05 ölçüldü) |
| `GET /v1/me/player/recently-played` | Son çalınanlar (50 kayıt) |
| `GET /v1/me/library/contains?uris=` | Bir şey kütüphanede mi? — ⚠ `/me/tracks/contains` DEĞİL |

#### ★ YAZMA İŞLEMLERİ — nasıl yapılır (2026-08-05, canlıda doğrulandı)

> Bu bölüm bir kez pahalıya mal oldu: Şubat 2026'da uçlar değişti, Rosso
> eskilerini çağırmaya devam etti, **beğeni butonu haftalarca sessizce
> çalışmadı** ve dört doğrulama (build/lint/test/type-check) de geçti.
> Ayrıntı: `logs/2026-08-05.md`.

**Altın kural:** Kütüphaneye bir şey **eklemek/çıkarmak** (şarkı beğenisi,
albüm kaydetme, sanatçı takip, playlist follow) artık **tek uçtan** yapılır:
`/v1/me/library`. Tür-özel uçların (`/me/tracks`, `/me/albums`,
`/me/following`, `/playlists/{id}/followers`) **hepsi kaldırıldı → 403.**

| İşlem | Doğru çağrı |
|---|---|
| İşlem | Doğru çağrı | Ölçüldü |
|---|---|---|
| **Şarkı beğen** | `PUT /v1/me/library?uris=spotify:track:{id}` | ✅ 200 |
| **Beğeniyi kaldır** | `DELETE /v1/me/library?uris=spotify:track:{id}` | ✅ 200 |
| **Playlist oluştur** | `POST /v1/me/playlists` · gövde `{name, description?, public}` | ✅ 201 |
| **Playlist'e şarkı ekle** | `POST /v1/playlists/{id}/items` · gövde `{uris:[...]}` | ✅ 201 |
| **Playlist'ten şarkı çıkar** | `DELETE /v1/playlists/{id}/items` · gövde **`{items:[{uri}]}`** | ✅ 200 |
| **Playlist adı/açıklaması** | `PUT /v1/playlists/{id}` · gövde `{name, description}` | ✅ 200 |
| **Playlist içeriğini oku** | `GET /v1/playlists/{id}/items` | ✅ 200 |
| **Playlist sırasını değiştir** | `PUT /v1/playlists/{id}/items` · gövde `{range_start, insert_before, range_length}` | ✅ 200 |
| **Playlist kapağı yükle** | `PUT /v1/playlists/{id}/images` · **ham base64 JPEG gövde**, `Content-Type: image/jpeg` (`ugc-image-upload`) | ✅ **202** |
| **Playlist'i kütüphaneden çıkar** | `DELETE /v1/me/library?uris=spotify:playlist:{id}` | ✅ 200 |

⛔ **Playlist "follow" çağrısı YAPMA.** `POST /me/playlists` listeyi zaten
kütüphaneye ekler (ölçüldü: hemen `contains → [true]`, `/me/playlists`'te
görünüyor). Ayrıca follow denemesi **500** döndürür — zaten üye olana tekrar
üyelik yok. Eski `PUT /playlists/{id}/followers` ise tamamen kaldırıldı (403).

⚠ **Kapak yükleme 202 döner, 200 değil.** Durum kontrolü `in (200, 202)`
olmalı; yalnız `200` bekleyen kod başarılı yüklemeyi hata sayar.

> **Tablo 2026-08-05'te uçtan uca ölçüldü** —
> `scripts/olc-spotify-yetenek-haritasi.mjs` ile tekrar koşulabilir (yazdığını
> geri alır, iz bırakmaz). ✅ = canlıda çalıştığı görüldü.
> §6.1 gereği: **karar anında yeniden ölç**, tablo nereye bakacağını söyler.

#### Yanıt alan adları — `tracks` → `items` (ölçüldü)

Playlist yanıtında eski adlar **tamamen gitti**, geriye dönük uyumluluk YOK:

| Alan | Durum |
|---|---|
| `playlist.items` | ✅ VAR |
| `playlist.tracks` | ❌ YOK |
| satırda `.item` | ✅ VAR |
| satırda `.track` | ❌ YOK |

Kod her ikisini de deneyecek şekilde yazılmalı (`item.get("item") or
item.get("track")`) — worker'daki `spotify_playlists.py` bu deseni kullanıyor.
⚠ Playlist **içeriği** yalnız kullanıcının sahibi/katkıcısı olduğu listelerde
döner; başkasının listesinde `items` alanı hiç gelmez (metadata gelir).

⚠ **Üç tuzak — hepsi canlı ölçümle bulundu, hiçbiri belgede açıkça yazmıyor:**

1. **`/me/library` id değil URI alır** — `spotify:track:...`
2. **`/me/library` gövde değil SORGU DİZESİ** — `?uris=a,b`.
   Gövdeyle → `400 Missing required field: uris`
3. **Playlist uçları tam tersi: GÖVDE kullanır.** Üstelik anahtar adları
   metoda göre değişir:

| Çağrı | Gövde anahtarı | Yanlışı |
|---|---|---|
| `POST /playlists/{id}/items` | `{"uris": ["spotify:track:x"]}` | — |
| `DELETE /playlists/{id}/items` | `{"items": [{"uri": "spotify:track:x"}]}` | `{"tracks":...}` → 400 *"No uris provided"* · `{"items":["uri"]}` → 400 *"Invalid base62 id"* |

Ekleme düz URI dizisi, silme ise `{uri}` **nesnesi** ister. Bu asimetri
belgede yok; 2026-08-05'te dört biçim denenerek bulundu.

⚠ **403 sebebini SÖYLEMEZ** — yalnız `{"error":{"status":403,"message":
"Forbidden"}}`. Bir çağrı 403 veriyorsa **önce uç noktanın hâlâ var olduğunu
kontrol et**, izin aramaya sonra geç. (Bu sırayı ters yapmak iki tur kaybettirdi.)

**Gereken izinler:** `user-library-modify` (beğeni/kütüphane yazma) ·
`playlist-modify-private` + `playlist-modify-public` · `ugc-image-upload`.
Yeni izin eklerken OAuth'a `show_dialog=true` şart — yoksa Spotify onay
ekranını atlar ve yeni izin sessizce gelmez.

#### Dev Mode Kısıtları (Şubat 2026 sonrası)

Spotify uygulaması **Development Mode**'da (`Client ID: bd2ed9d1...`):

- **5 kullanıcı** sınırı (eskiden 25). Şu an 2/5: Sahip + friend
- App sahibinin **Spotify Premium** olması şart — düşerse uygulama durur
- Toplu metadata uçları (`GET /tracks?ids=`, `/artists?ids=`…) **kaldırıldı**;
  tekil çağrı + 250ms geçit
- `GET /search` limiti **maks 10** (varsayılan 5) — eskiden 50
- `/browse/*`, `/artists/{id}/top-tracks`, `/markets`, `GET /users/{id}` yok
- Playlist içeriği yalnız kullanıcının **sahibi/katkıcısı olduğu** listelerde döner

**Kaybolan alanlar** (kod `undefined` beklemeli): Track/Album `popularity`,
`available_markets` · Artist `followers`, `popularity` · User `country`,
`email`, `product`, `explicit_content`.
✅ `external_ids` (ISRC) Mart 2026'da **geri alındı** — duruyor.

Kaynak: `docs/platform-dev-docs/` → Şubat 2026 Changelog + Migration Guide.
Extended Quota'ya geçilirse bu kısıtların hiçbiri uygulanmaz.

#### Ek Araçlar

**Deezer API:** Track ISRC alındıktan sonra genre enrichment için kullanılır.
`GET https://api.deezer.com/track/isrc:{isrc}` → genre bilgisi

**Last.fm API:** Deezer'da bulunamayan track'ler için fallback genre kaynağı.
`artist.getInfo` + `track.getInfo` endpoint'leri

**MusicBrainz:** ISRC → genre eşleştirme için üçüncü katman.

---

### 3. GDPR Export (ZIP) — 3 ZIP Türü

Kullanıcı Spotify hesabından "Verilerimi İndir" talebi açtığında **3 ayrı ZIP** gelir, farklı gecikmelerde:

| ZIP Türü | Spotify'dan Gelme Süresi | İçerik Özeti |
|---|---|---|
| **Extended Streaming History** | ~1 gün | Tam dinleme geçmişi (ts, ms_played, skip, shuffle, reason, platform) — `Streaming_History_Audio_*.json` |
| **Account Data** | ~4-5 gün | Kütüphane, playlist, çıkarımlar, yıllık özet + basit `StreamingHistory_music_*.json` (sadece 4 alan: endTime/artistName/trackName/msPlayed — URI, skip, shuffle **yok**) |
| **Technical Log Information** | ~4-5 gün | Sistem logları + değerli davranış event'leri |

Rosso bunların üçünü de kabul eder, her birini ayrı bir pipeline ile işler. Kullanıcı ZIP'leri aynı drop zone'a atar; worker ZIP içeriğini analiz ederek tipini otomatik tespit eder.

> 🔴 **2026-09-27'de gerçek bir ZIP'te bulundu ve düzeltildi:** yukarıdaki "URI/skip/shuffle yok" notu
> spec'te vardı ama UYGULAMA bunu iki yerde atlamıştı. **Bug 1:** `zip_detect.py` içerik kanıtı bu
> camelCase alanları (`endTime`/`msPlayed`/`trackName`/`artistName`) tanımıyordu — ZIP "account_data"
> sanılıyor, streaming dosyaları HİÇ okunmadan "başarılı" dönüyordu (tüm dinleme geçmişi sessizce
> kayboluyordu). **Bug 2:** şema doğru tanınsa bile track eşleştirme yalnız `spotify_track_uri` ile
> çalışıyordu — bu formatta URI hiç olmadığı için müzik olayları yine `play_events`'e ulaşmıyordu.
> İkisi de düzeltildi (worker `045de07`/`a9421d8`, migration 0356 `resolve_or_create_track_by_name` —
> ad+sanatçı ile mevcut kataloga eşleşir, yoksa yeni kayıt açar). Gerçek ZIP'te doğrulandı:
> 20.070 dinleme + 25 podcast + 2.532 şarkı doğru işlendi (`logs/2026-09-27.md`).

---

### 4. Seçilen Dosyalar ve Görevleri

#### 4.1 Streaming History ZIP

| Dosya | Seçildi mi | DB Hedefi | Görev |
|---|---|---|---|
| `StreamingHistory_music_*.json` | ✅ | `play_events` | Tüm dinleme geçmişi — Rosso'nun temel veri kaynağı |
| `StreamingHistory_podcast_*.json` | ⏭️ Atla | — | Rosso müzik odaklı, podcast işlenmez |

#### 4.2 Account Data ZIP

| Dosya | Seçildi mi | DB Hedefi | Görev |
|---|---|---|---|
| `Inferences.json` | ✅ | `user_export_signals` | Spotify'ın müzik genre etiketleri → "Spotify vs Rosso" karşılaştırması, identity kelimeleri. **233 etiket:** 19 müzik (`Interest\|Music\|*`), 37 diğer ilgi, 53 üçüncü taraf (`3P_Custom_*`: Capital One, Sonos vb.), 124 diğer. Yalnızca `Interest\|Music\|*` prefix'li etiketler alınır; `3P_` prefix'liler filtrelenir. |
| `YourLibrary.json` | ✅ | `liked_songs_events` + `user_export_signals` | Aktif beğeni listesi, "beğenip dinlememiş" analizi |
| `Playlist1.json` | ✅ | `playlists` + `playlist_tracks` | Tüm playlist'ler + şarkıları (ekleme tarihi dahil) |
| `Wrapped2025.json` | ✅ | `user_export_signals` | Yıllık recap bootstrap: ruh hali dağılımı, toplam süre, streak |
| `YourSoundCapsule.json` | ✅ | `user_export_signals` | Haftalık kapsüller, "Türkiye ortalaması" karşılaştırması, FIRST_TO_DISCOVER |
| `StreamingHistory_music_*.json` | ✅ | `play_events` | Ek dönem varsa streaming history ile birleşir |
| `Follow.json` | ⏭️ Atla | — | Spotify kullanıcı takip listesi (sosyal bağlantılar) — Rosso bu özelliği işlemiyor. Not: sanatçı takibi değil, 5 kullanıcı takip kaydı içerir; `YourLibrary.json`'daki `artists` bu exportta boş geldi. |
| `Identifiers.json` | 🔒 Hard-discard | — | E-posta — kimlik verisi, parse edilmez |
| `Identity.json` | 🔒 Hard-discard | — | Kimlik |
| `UserAttributes.json` | 🔒 Hard-discard | — | Doğum tarihi, Facebook UID |
| `AdsIdentitySecondPartyIdentifiers.json` | 🔒 Hard-discard | — | Reklam profil ID'leri |
| `SearchQueries.json` | ⏭️ Atla | — | Ham arama logu — KVKK gereği bireysel log saklanmaz |
| `AgentGateway.json`, `Marquee.json`, `Payments.json`, `S4XProfile.json` | ⏭️ Atla | — | Destek/reklam/ödeme logları |

#### 4.3 Technical Log ZIP

| Dosya | Seçildi mi | DB Hedefi | Görev |
|---|---|---|---|
| `AddedToCollection.json` | ✅ | `liked_songs_events` | Kronolojik beğeni geçmişi (like event'leri) |
| `RemovedFromCollection.json` | ✅ | `liked_songs_events` | Beğeni geri çekme event'leri |
| `AddedToPlaylist.json` | ✅ | `playlist_track_events` | 1.801 kayıt. Alan adları: `{message_playlist_uri, message_item_uri, message_item_uri_kind, message_client_platform, timestamp_utc}`. Platform değeri: `"None"` string veya platform adı. |
| `AddToPlaylist.json` | ✅ | `playlist_track_events` | 166 kayıt. **Farklı format:** `{message_item_uris (liste), message_playlist_uri, message_new_playlist, cihaz context alanları}`. Parser'da ayrı ele alınmalı. |
| `PlaylistCreated.json` | ✅ | `playlists.created_at` | Playlist oluşturma tarihleri |
| `DaylistGenerated.json` | ✅ | `user_export_signals` | Günlük mood/genre/zaman etiketleri (chronotype çapraz doğrulama) |
| `OnRepeatContents.json` | ✅ | `user_export_signals` | On Repeat içeriği (evergreen kalibrasyon) |
| `ShuffleSequenceEvent*.json` | ✅ | `user_export_signals` | Shuffle davranışı analizi |
| `CarDetectionEvent.json` | ✅ | `car_sessions` | Araçta dinleme süresi (recap kartı: "X saat araçta müzik"). **Önemli:** `message_is_car_connected` alanı Python **bool** (`True`/`False`) — string `'True'` değil. Worker'da `== True` ile karşılaştır. |
| `HomeSectionResponse.json` | ✅ | `user_export_signals` | Spotify'ın bu kullanıcıya sunduğu kategori başlıkları (genre algoritması sinyali) |
| `DeviceIdentifier.json` | 🔒 Hard-discard | — | Google Advertising ID, Android ID |
| Diğer ~160 dosya | ⏭️ Atla | — | Sistem telemetrisi: cache, audio, auth, Bluetooth, OAuth, push, DRM |

---

### 5. DB Tablo Yapısı — Export Verisi

#### Mevcut Tablolar (Export ile Kullanılanlar)

```
play_events          → Streaming History şarkı olayları
playlists            → Playlist metadata (created_at alanı PlaylistCreated.json'dan gelir)
playlist_tracks      → Playlist şarkı listesi
export_jobs          → Her ZIP yükleme iş kaydı (status, pipeline_step, tip)
```

#### Yeni Tablolar (Account Data + Technical Log için)

```sql
-- Aktif beğeni event geçmişi
-- AddedToCollection + RemovedFromCollection → net aktif liked songs
liked_songs_events (
  id              UUID PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  spotify_uri     TEXT NOT NULL,          -- spotify:track:{id}
  event_type      TEXT NOT NULL,          -- 'liked' | 'unliked'
  occurred_at     TIMESTAMPTZ NOT NULL,
  import_job_id   UUID REFERENCES export_jobs(id)
)
-- Not: "aktif liked songs" = liked - unliked (event replay). Ham geçmiş saklanır,
-- görünümde net aktif liste hesaplanır.

-- Playlist'e şarkı ekleme event'leri
playlist_track_events (
  id              UUID PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  track_uri       TEXT NOT NULL,
  playlist_uri    TEXT NOT NULL,
  added_at        TIMESTAMPTZ NOT NULL,
  platform        TEXT,                   -- 'android' | 'desktop' | 'web'
  import_job_id   UUID REFERENCES export_jobs(id)
)

-- Araçta dinleme seansları
car_sessions (
  id               UUID PRIMARY KEY,
  user_id          UUID REFERENCES users(id),
  connected_at     TIMESTAMPTZ NOT NULL,
  disconnected_at  TIMESTAMPTZ,
  duration_seconds INTEGER,               -- hesaplanmış: disconnect - connect
  import_job_id    UUID REFERENCES export_jobs(id)
)

-- Export kaynaklı tüm sinyal verileri (esnek JSONB yapısı)
user_export_signals (
  id              UUID PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  signal_source   TEXT NOT NULL,
  -- 'wrapped_2025' | 'sound_capsule' | 'inferences' | 'daylist_aggregate'
  -- | 'on_repeat' | 'shuffle_behavior' | 'home_section_categories'
  signal_data     JSONB NOT NULL,
  imported_at     TIMESTAMPTZ DEFAULT NOW(),
  export_job_id   UUID REFERENCES export_jobs(id)
)
-- Aynı signal_source için yeni import eskiyi override eder (upsert on user_id+signal_source)
```

#### export_jobs Tablosu Genişlemesi

```sql
-- Mevcut tabloya eklenmesi gereken alanlar:
ALTER TABLE export_jobs ADD COLUMN export_type TEXT;
-- 'streaming_history' | 'account_data' | 'technical_log'
-- Worker ZIP içeriğini analiz edip bu alanı otomatik doldurur.
```

---

### 6. Worker Pipeline — Akıllı ZIP Tespiti (Yol C)

Kullanıcı herhangi bir ZIP atar. Worker ZIP içindeki dosya isimlerini tarayarak tipi otomatik tespit eder.

#### Tespit Mantığı

```python
def detect_zip_type(zip_namelist: list[str]) -> str:
    basenames = {n.rsplit("/", 1)[-1] for n in zip_namelist}

    # Extended Streaming History sinyali: Streaming_History_Audio_YYYY*.json
    # NOT: Account Data ZIP'inde de StreamingHistory_music_*.json var — bu sinyali KULLANMA!
    if any(b.startswith("Streaming_History_Audio") for b in basenames):
        return "extended_streaming_history"

    # Account Data sinyali: Inferences.json veya YourLibrary.json veya Wrapped2025.json
    # NOT: Account Data'da StreamingHistory_music_*.json bulunabilir ama bu yine account_data'dır.
    account_signals = {"Inferences.json", "YourLibrary.json", "Wrapped2025.json",
                       "Playlist1.json", "YourSoundCapsule.json"}
    if basenames & account_signals:
        return "account_data"

    # Technical Log sinyali: AddedToCollection.json veya DaylistGenerated.json
    techlog_signals = {"AddedToCollection.json", "DaylistGenerated.json",
                       "CarDetectionEvent.json", "ShuffleSequenceEvent.json"}
    if basenames & techlog_signals:
        return "technical_log"

    return "unknown"
```

#### Whitelist — Her Zip Tipi İçin İşlenecek Dosyalar

```
extended_streaming_history → Streaming_History_Audio_*.json
                             Streaming_History_Video_*.json → ⏭️ ATLA (Rosso müzik odaklı)
                             (içerik sinyali doğrulaması: ts + ms_played alanı var mı)

account_data       → Inferences.json, YourLibrary.json, Playlist1.json,
                     Wrapped2025.json, YourSoundCapsule.json,
                     StreamingHistory_music_*.json (varsa)
                     Hard-discard: Identifiers.json, Identity.json,
                                   UserAttributes.json, AdsIdentitySecondPartyIdentifiers.json

technical_log      → AddedToCollection.json, RemovedFromCollection.json,
                     AddedToPlaylist.json, AddToPlaylist.json,
                     PlaylistCreated.json, DaylistGenerated.json,
                     OnRepeatContents.json, ShuffleSequenceEvent*.json,
                     CarDetectionEvent.json, HomeSectionResponse.json
                     Hard-discard: DeviceIdentifier.json
```

**Kural:** Whitelist dışındaki her dosya sessizce atlanır, log'a "skipped: {filename}" yazılır.

#### Pipeline Adımları

```
ZIP Upload (Supabase Storage)
    ↓
pgmq mesajı → Worker alır
    ↓
detect_zip_type() → export_type belirlenir, export_jobs güncellenir
    ↓
Tip bazlı parser seçilir:
  streaming_history → process_streaming_export()   [mevcut]
  account_data      → process_account_data()        [yeni]
  technical_log     → process_technical_log()       [yeni]
    ↓
Hard-discard güvenlik kapısı (içerik okunmadan silinir)
    ↓
Whitelist dosyaları parse edilir → DB'ye yazılır
    ↓
export_jobs: status=completed, pipeline_step=done
    ↓
(streaming_history için) isrc_backfill kuyruğa alınır
```

---

### 7. KVKK / GDPR Uyumluluk Notları

1. **Hard-discard:** `Identifiers.json`, `UserAttributes.json`, `DeviceIdentifier.json`, `AdsIdentitySecondPartyIdentifiers.json` — içerik parse edilmeden silinir, log'a yalnızca "discarded: {filename}" yazılır.
2. **Arama geçmişi:** `SearchQueries.json` bireysel log olarak saklanmaz. Aggregate analiz yapılacaksa yalnızca toplu metrikler (toplam arama sayısı) yazılır.
3. **İşlenen ZIP silinir:** Her pipeline sonunda ZIP, Supabase Storage'dan kaldırılır — ham kişisel veri tutulmaz.
4. **`Inferences.json` reklam etiketleri:** Yalnızca müzik kategorileri kullanılır; demografik/davranışsal reklam etiketleri (öğrenci, araba kullanıcısı vb.) filtrelenir.
5. **Kullanıcı bilgilendirmesi:** Import UI'da hangi verilerin işlendiği, hangilerinin atıldığı özet olarak gösterilir.

---

### 8. Veri Kalitesi ve Sınırlamalar

| Kısıt | Etki | Geçici Çözüm |
|---|---|---|
| `StreamingHistory` yalnızca son ~1 yıl | Eski dinleme verisi yok | Kullanıcı birden fazla ZIP yükleyebilir (farklı dönemler) |
| `Wrapped2025.json` URI'ları obfuscate | Sanatçı ISRC eşleşmesi gerekiyor | Spotify API `/artists/{id}` çağrısı |
| `CarDetectionEvent` zaman çözünürlüğü | Kısa seans tespiti yanlış olabilir | Min 60s seans eşiği uygula |
| Dev Mode limiti (25 kullanıcı) | API kullanımı kısıtlı | Extended Access başvurusu (ilk 10 gerçek kullanıcı) |
| Technical Log ~4-5 gün gecikmeli | Import sonrası özellikler kilide alınır | UI'da bekleme bildirimi + özellik kilidi sistemi |

---

## Rosso — ZIP Verisi & Faz Sistemi · Karar GEREKÇELERİ

_Eski dosya: `reference/spotify-veri-ve-zip.md`_

> ☆ **REFERANS — otorite DEĞİL** (Belge Yaşam Döngüsü — `docs/README.md`).
> Kararlar 2026-07-29'da tamamlandı ve plana dönüştürüldü; bu belge artık
> *"neden böyle karar verildi"* sorusunun arşividir.
>
> ★ **Güncel takip / yapılacak iş listesi:**
> `../plans/02-zip-verisi-urune-baglama.md`
> — çelişki olursa **plan kazanır.**
>
> **Ölçüm:** Sahip kullanıcı verisi + Spotify ZIP örnekleri (§1.5 — tahminle değil)
>
> **İlgili dökümanlar:**
> - `docs/decisions/inferences-katalog.md` — A12 detay
> - `docs/decisions/spotify-veri-ve-zip.md` — A13 detay

---

### 0. Özet — tüm kararlar tek tablo

| ID | Özellik | Durum | Faz kilidi | Plan paketi |
| -- | ------- | ----- | ---------- | ----------- |
| A1 | Playlist: oluşturma + eklenme tarihi + sıralama | ✅ | Faz 3 | P1 Playlists |
| A2 | Beğenilen Şarkılar oto-playlist (~3000, virtualize) | ✅ | Faz 3 | P1 |
| A3 | Beğeni → taste skoru | ✅ | Faz 3 | P2 Taste |
| A4 | Gözden Kaçırdıkların + Tozlu Raflar (2 sekme) | ✅ | Faz 3 | P1 |
| A5 | Beğen / kaldır (Spotify yazma, §1.6) | ✅ | Faz 1+ | P1 |
| A6 | Araba → Recap/Journey tek satır | ✅ | Faz 3 | P3 Journey |
| A7 | YourLibrary albüm + sanatçı parser | ✅ | Faz 3 | P4 Worker |
| A8 | Playlist büyüme grafiği (kümülatif alan) | ✅ | Faz 3 | P1 |
| A9 | Shuffle → kimlik/zevk metriği | ✅ | Faz 2+ | P2 |
| A10 | SoundCapsule → doğrulama sinyali | ✅ | Faz 3 | P4 |
| A11 | Daylist → öneri isimleri + kimlik kıyası | ✅ | Faz 3 | P2/P5 |
| A12 | Inferences → eşleşme/öneri + genre kalibrasyonu | ✅ | Faz 3 | P5 Motor |
| A13 | Recap v2 (Wrapped referansı) | ✅ | Faz 2+ | P6 Recap |
| — | B1 playlist çalma sayısı | ⛔ | — | — |
| — | B4 HomeSection maruz kalma | ⛔ | — | — |
| — | B9 OnRepeat ayrı UI | ⛔ | — | — |
| — | B10 Arama sorguları | ⛔ | — | — |

---

### 1. Kapsam & ilkeler

#### Ne bu spec?

Sahibin Spotify ZIP export'larından çıkan özellik fikirlerinin **nihai karar
dökümü**. Uygulama kodu değil — plana dökülecek tasarım kararları.

#### İki iş paketi

1. **ZIP özellikleri** (A1–A13) — playlist, beğeni, recap, motor, worker
2. **Faz sistemi & bilgilendirme paneli** (§8) — ayrı spec; henüz uygulanmadı

#### Genel ilkeler

- Veri yoksa özellik yok (§1.5) — olmayan metriği uydurma
- Spotify verisi kullanıcıya "Spotify böyle dedi" diye gösterilmez (A12, A13)
- Faz kilidi: özellik, veri hazır olmadan UI'da görünmez; boş kart yok
- Rate-limit (§1.6): Spotify yazma işlemleri kuyruk + 250ms geçit

---

### 2. Faz kilidi matrisi

| Faz | Koşul | Açılan yetenekler |
| --- | ----- | ----------------- |
| **0** | Kayıt + profil | Hoş geldin paneli |
| **1** | Spotify OAuth | Canlı API, beğen yazma (A5) |
| **2** | Streaming History ZIP işlendi | `/gecmis`, `/recap`, `/taste`, journey, shuffle (A9), recap temel (A13 kısmen) |
| **3** | Account Data **+** Technical Log ZIP (ikisi birlikte) | A1–A4, A6–A8, A10–A12, playlist timeline, araba, inferences |

**Faz 3 kuralı:** Tek ZIP ile Faz 3 açılmaz → `partialPhase3` bandı.

---

### 3. Kararlar — Playlists & Beğeni

#### A1. Playlist detay: tarih + sıralama

- Playlist **oluşturma tarihi** gösterilir
- Her şarkıda **playlist'e eklenme tarihi** (`playlist_track_events.added_at`, %100 dolu)
- Sırala: eklenme tarihine göre
- **Faz 3 kilidi**

#### A2. Beğenilen Şarkılar oto-playlist

- Spotify'daki gibi ~3.000 şarkılı otomatik liste
- `liked_songs_events`: 2.995 kayıt, hepsi zaman damgalı
- **Sanallaştırma zorunlu** + DB-taraflı sıralı RPC (REST limit kırılması)
- **Faz 3 kilidi**

#### A4. Gözden Kaçırdıkların + Tozlu Raflar

İki sekme, her satırda beğen/kaldır (A5):

| Sekme | Filtre | Ölçüm |
| ----- | ------ | ----- |
| Gözden Kaçırdıkların | Beğenilmemiş, 20+ dinleme | 1.271 şarkı |
| Tozlu Raflar | Beğenmiş, ≤2 çalma | 326 şarkı |
| Tozlu Raflar (nostalji) | Beğenmiş, 1 yıldır dinlememiş | 1.500 şarkı |

#### A5. Beğen / beğeniden kaldır

- Spotify Web API yazma; §1.6 kuyruk + hata deseni
- Faz 1'den itibaren (OAuth gerekir)

#### A8. Playlist büyüme grafiği

- Kümülatif alan grafiği (`added_at` → aylık büyüme)
- **Faz 3 kilidi**

---

### 4. Kararlar — Taste, Journey, Kimlik

#### A3. Beğeni → taste skoru

Beğenilmiş olması taste/beğenme skoruna pozitif sinyal (ağırlık uygulama planında).

#### A6. Araba seansı

Ayrı ekran değil — Recap & Journey'de tek satır: *"Bu yıl/ay arabada X saat"*
(`car_sessions`: 114 seans, ~18,4 saat). **Faz 3.**

#### A9. Shuffle → kimlik metriği

`play_events.shuffle` oranı → recap/journey/taste kimlik metriği + eşleşme motoru.
Veri kartı değil; bilinçli sıralı çalma vs akışa bırakma. (%4,2 bu kullanıcıda.)

#### A11. Daylist → öneri isimleri

- Playlist öneri adı havuzu ("metal monday morning" tarzı)
- Taste/kimlik metinleriyle kıyas — algoritma geliştirme
- Ayrı UI yok; **Faz 3** (Technical Log)

---

### 5. Kararlar — Worker & Arka Plan

#### A7. YourLibrary parser düzeltmesi

Bugün yalnız `tracks` okunuyor → `albums` + `artists` de yakalanacak.
Albüm kaydetmek şarkı beğenmekten güçlü niyet sinyali. Worker + migration; **Faz 3.**

#### A10. SoundCapsule

Arka plan doğrulama: *"Spotify haftanı böyle özetledi"* — ayrı özellik değil.
**Faz 3** (Account Data).

#### A12. Inferences → motor yakıtı

**UI yok.** Üç katman (`inferences-katalog.md`):

| Katman | İçerik | Adet |
| ------ | ------ | ---- |
| Eşleşme/öneri | Normalize ilgi + davranış etiketleri | ~31 |
| Genre kalibrasyonu | 17 tür vs Rosso genre (iç) | 17 |
| Öğrenci sinyali | Eşleşme yaşam evresi | 1 |
| ⛔ At | 3P reklam, hash, test, tautoloji | ~120 |

**Faz 3** (Account Data).

---

### 6. Kararlar — Recap v2 (A13 · Wrapped2025 referansı)

> Detay: `docs/decisions/spotify-veri-ve-zip.md`
> Kaynak: `Wrapped2025.json` — kalibrasyon hedefi, veri kaynağı `play_events`

#### A13.1 Duygu profili — ⭐ kritik

Spotify'ın 4 pusulası: **party · love · sad · angry** (ör. %32,7 / %25,8 / %18 / %11).

| Kullanım | Açıklama |
| -------- | -------- |
| Kalibrasyon | Wrapped 2025 değerleriyle Rosso algoritmasını test et |
| Recap UI | Yıllık + aylık: *"bu dönem dinlemenin %X'i party…"* |
| Kimlik | Mood/enerji/kimlik kartlarına yönerge |

#### A13.2 Yıllık keşif toplamı

Yıllık recap: *"Bu yıl X yeni sanatçı / şarkı / albüm keşfettin"*.
Mevcut Discovery kartı (ay bazlı) korunur; toplam **eklenir**.

#### A13.3 Top sanatçı/şarkı vurgusu

#1 sanatçı ve #1 şarkı görsel olarak öne çıkar; **dinleme saati** yazılır.

#### A13.4 Sanatçı yıllık akış grafikleri

Top 5 kartının ardından — her sanatçı için yıl boyu dinleme eğrisi:

- Smooth akış (12 keskin sütun değil)
- Dikey liste, yatay grafik; karşılaştırmalı tasarım mümkün
- **Yıllık recap only**

#### A13.5 Takıntı AHA kartı

Yıllık recap — artist / album / track streak'lerinden **en ilgi çekici** seçilir.
Örnek: *"5 yıldır bu şarkıyı dinliyorsun"* veya *"249 gün X sanatçı"*.

#### A13.6 Top albümler

**Yıllık recap only** — aylıkta yok.

#### A13.7 Tür çeşitliliği

Manifesto: *"Bu yıl toplam X tür dinledin"* (ör. 233).

#### A13.8 Dinleme dönemi metaforu

Spotify `listeningAge` kopyalanmaz. Rosso dili: *"Sen 2010'ların insanısın"* /
*"Erken 2000'ler insanısın"* — cheesy "DNA" yok.

Şart: Spotify'ın 41 demesinin algoritmasını çöz → her dönem için uygulanabilir hale getir.

#### A13.9 Motor girdileri (UI opsiyonel)

| Sinyal | Kullanım |
| ------ | -------- |
| `avgTrackPopularityScore` | Mainstream vs niş kimlik |
| `percentListenedExplicit` | Aynı eksen — eşleşme/öneri |
| `multilinguistRankingScore` | Eşleşme/öneri motoru |

#### A13 ⛔ Atlananlar (Sahip kararı)

- Dinleme günü sayısı (301/365) — UI'ya eklenmez
- Fan yüzdeliği, fan leaderboard — çöp
- Kulüp metaforu (`SOFT_HEARTS_CLUB`) — taste vibe kartları karşılığı var
- `absoluteChaosRankingScore` ayrı kart — tür çeşitliliği satırı yeter

---

### 7. Vazgeçilenler

| ID | Fikir | Neden |
| -- | ----- | ----- |
| B1 | "Bu playlist'ten X kez çaldın" | `play_events`'te playlist context yok |
| B4 | HomeSection maruz kalma | Ham kodlar gürültülü; seçim verisi yok |
| B9 | OnRepeat ayrı UI | Taste "şu an" zaten yapıyor; arka plan kıyası yeter |
| B10 | Arama sorguları | Gerek yok |

---

### 8. Faz Sistemi & Bilgilendirme Paneli (ayrı iş paketi)

> ⚠ Henüz **uygulanmadı**. Rosso saf Spotify (plan 07) — YT/Apple yok.
> Bu bölüm ZIP kararlarından bağımsız; `docs/plans/` altında ayrı plan olacak.

#### Fazlar

| Faz | Koşul |
| --- | ----- |
| 0 | Kayıt + profil |
| 1 | Spotify OAuth |
| 2 | Streaming History ZIP işlendi |
| 3 | Account Data + Technical Log ZIP (ikisi birlikte) |

#### Panel gereksinimleri (özet)

- Faz geçişinde carousel panel (desktop overlay / mobil sheet)
- `user_phase_announcements` tablosu; snooze 24s; `content_version`
- `PhaseState` tek kaynak (sunucu); yetenek bayrakları (`capabilities`)
- Ara durum bantları: `processing`, `partialPhase3`, `failed`
- Metinler: `src/content/phases.ts`
- Erişilebilirlik: focus trap, `prefers-reduced-motion`, Esc/overlay kapatma
- Panelde yalnız **var olan route'lara** link

#### Faz 3 panel içeriği (güncel kararlarla)

- Beğeni yolculuğu (A4), playlist timeline (A1), araba (A6)
- Daylist isim havuzu (A11) — arka plan, panelde detay yok
- Inferences/Wrapped kullanıcıya gösterilmez (A12, A13)
- Technical Log ufuk notu: veri yok ≠ olay yok

#### Teslim edilecekler

1. Faz hesaplama katmanı + tipler
2. `user_phase_announcements` migration
3. Panel bileşeni (overlay, carousel, mobil sheet, a11y)
4. `src/content/phases.ts`
5. Tetikleme kancası + snooze/dismiss
6. "Faz durumu" girişi (header/ayarlar)
7. Ara durum bantları

---

### 9. Uygulama paketleri → `docs/plans/`

Kararlar tamamlandı. Plana bölünecek paketler:

#### P1 — Playlists & Beğeni (Faz 3)

- [ ] A1 Playlist tarih + sıralama
- [ ] A2 Beğenilen Şarkılar (virtualize + RPC)
- [ ] A4 Gözden Kaçırdıkların + Tozlu Raflar
- [ ] A5 Beğen/kaldır (Faz 1'den)
- [ ] A8 Büyüme grafiği

#### P2 — Taste & Kimlik

- [ ] A3 Beğeni → taste skoru
- [ ] A9 Shuffle kimlik metriği
- [ ] A11 Daylist isim havuzu + kıyas
- [ ] A13.9 Popularity/explicit motor girdileri

#### P3 — Journey & Bağlam

- [ ] A6 Araba tek satır (Recap + Journey)

#### P4 — Worker & ZIP Parser

- [ ] A7 YourLibrary albums + artists
- [ ] A10 SoundCapsule arka plan sinyali
- [ ] A12 Inferences normalize + `user_export_signals`

#### P5 — Eşleşme & Öneri Motoru

- [ ] A12 ~31 etiket entegrasyonu
- [ ] A13.9 Multilinguist skoru
- [ ] A9 + A13.1 duygu profili motor girdisi

#### P6 — Recap v2

- [ ] A13.1 Duygu profili kartı (yıllık + aylık)
- [ ] A13.2 Yıllık keşif toplamı
- [ ] A13.3 Top #1 vurgusu + saat
- [ ] A13.4 Sanatçı akış grafikleri (yıllık)
- [ ] A13.5 Takıntı AHA kartı (yıllık)
- [ ] A13.6 Top albümler (yıllık)
- [ ] A13.7 Tür çeşitliliği manifesto
- [ ] A13.8 Dinleme dönemi metaforu
- [ ] Wrapped kalibrasyon scripti (owner hesabı)

#### P7 — Faz Sistemi & Panel (§8)

- [ ] Faz hesaplama + panel + bantlar (ayrı plan dosyası)

---

### 10. Referans dökümanlar

| Dosya | İçerik |
| ----- | ------ |
| `docs/decisions/inferences-katalog.md` | A12 — 233 inference, temizlik kuralları |
| `docs/decisions/spotify-veri-ve-zip.md` | A13 — Wrapped blok analizi, gap tablosu |
| `docs/platform-dev-docs/spotify zip/` | Ham ZIP örnekleri |
| `docs/vision/kuzey-yildizi.md` | Ürün süzgeci |
| `src/lib/recap/read.ts` | Mevcut recap kart payload'ları |

---

*Son güncelleme: 2026-07-29 · Tüm kararlar kapandı (A1–A13). Açık madde yok.*

---

## Export Sistemi — Referans Notu

_Eski dosya: `reference/spotify-veri-ve-zip.md`_

> **Amaç:** Bu doküman, Rosso'nun Spotify ZIP export sistemini — Next.js upload
> katmanını ve Python worker servisini — tek bir yerden belgeler.
> Her export sistemi değişikliğinde bu dosya güncellenir.
> Claude Code ve diğer agentlar için bağlam dosyasıdır.
>
> **Son güncelleme:** 2026-07-28 (ZIP-sonrası anında recap+taste tetikleme).
> Önceki: 2026-07-19 (FAZ EXPORT-V2 kapanışı — karne + export_type +
> gerçek-veri doğrulaması)

---

### Upload Mimarisi (2026-06-30 itibarıyla)

#### Akış

```
Browser
  │
  ├─ POST /api/export/upload  {fileName, fileSize, fileType}
  │    └─ export_jobs kaydı aç (status: queued)
  │    └─ createSignedUploadUrl → {jobId, signedUrl, path, token}
  │
  ├─ supabase.storage.uploadToSignedUrl(path, token, file)
  │    └─ ZIP doğrudan Supabase Storage'a gider (Vercel'den GEÇMEZ)
  │
  └─ POST /api/export/queue  {jobId}
       └─ export_jobs.status = 'queued' → Railway cron tarafından işlenir
```

#### Neden bu mimari?

Vercel App Router route'larında **4.5 MB body limiti** var. ZIP dosyaları
bunu aşıyor. Çözüm: browser ZIP'i Supabase Storage'a **signed URL** üzerinden
direkt yükler, Vercel'den geçmez.

#### Kritik: pgmq KALDIRILDI (2026-06-30)

Kuyruk artık `export_jobs.status = 'queued'` DB alanıdır. pgmq / `export_queue_send`
RPC'si yoktur. Worker 2 dk'da bir tabloyu poll eder: `status='queued'` olan ilk
işi alır, işler, `completed`/`failed` yapar.

#### ZIP-sonrası ANINDA recap+taste tetikleme (2026-07-28)

Bir ZIP `completed` olduğunda `cron/export.py`, o kullanıcının recap+taste'ini
HEMEN üretir (`post_import_refresh.refresh_after_import`). Böylece yeni kullanıcı
(ör. Yankı, 3. organik) ZIP yükleyip **hemen dolu dashboard** görür — günlük
`recap_refresh`/`taste_refresh` cron'unu beklemez. İzole: tetikleme hatası
export'u BOZMAZ (export zaten bitti, veri DB'de; gece cron yedek katman).
Tek-kullanıcı fonksiyonları: `refresh_user_taste(p_user_id)` RPC + Python
`refresh_user_recaps(client, user_id)`. (Genre vektörü `log(0)` bug'ı bu tetikleme
sırasında açığa çıktı → migration 0142 ile düzeltildi.)

---

### Worker Nerede Çalışıyor (2026-06-30 itibarıyla — Cron-Tabanlı Mimari)

Python worker servisi Railway'de **3 ayrı servis** olarak çalışıyor:

| Servis | Komut | Frekans | Görev |
|--------|-------|---------|-------|
| `health-web` | `uvicorn app.health:app` | 7/24 sürekli | `GET /health` 200 döner |
| `export-cron` | `python -m app.cron.export` | Her 2 dk | 1 queued export işler |
| `enrichment-cron` | `python -m app.cron.enrichment` | Her 15 dk | 50 track'e genre yazar |

**Mimari ilkesi:** Sonsuz loop yok. Her cron iş yapıp **çıkar**. Bellekte kritik state
tutulmaz — kota durumu `api_cooldowns` tablosunda yaşar. Stale job recovery export cron
başında otomatik çalışır (`processing` + 15 dk → `queued`'a döner).

**Railway servis bilgisi:**
- Proje: `project-rosso`
- Builder: Dockerfile (Root Directory: `/worker`)
- Branch: `feature/phase-5` (auto-deploy aktif)
- Kurulum detayı: `worker/RAILWAY.md`

**Bunun anlamı:** `worker/` altında kod değişikliği yapıp `git push`
yapıldığında Railway otomatik olarak yeni image build edip deploy ediyor.
Lokal test hâlâ mümkün ve faydalı (hızlı iterasyon için), ama production
davranışı her zaman Railway loglarından doğrulanmalı.

---

### Genişletilmiş Export Mimarisi — 3 ZIP Tipi (2026-06-28)

#### Neden 3 ZIP?

Spotify GDPR export talebi açıldığında 3 ayrı ZIP gelir, farklı gecikmelerde:

| ZIP Tipi | Gelme Süresi | İçerik |
|---|---|---|
| `streaming_history` | ~1 gün | StreamingHistory_music_*.json |
| `account_data` | ~4-5 gün | Library, Playlist, Wrapped, SoundCapsule, Inferences |
| `technical_log` | ~4-5 gün | AddedToCollection, DaylistGenerated, CarDetection vb. |

#### Akıllı Tip Tespiti (Yol C)

Kullanıcı aynı drop zone'a herhangi bir ZIP atar. Worker, ZIP içindeki dosya isimlerini tarayarak tipi otomatik belirler:

```python
def detect_zip_type(namelist):
    basenames = {n.rsplit("/", 1)[-1] for n in namelist}

    if any(b.startswith("StreamingHistory_music") for b in basenames):
        return "streaming_history"

    if basenames & {"Inferences.json", "YourLibrary.json", "Wrapped2025.json"}:
        return "account_data"

    if basenames & {"AddedToCollection.json", "DaylistGenerated.json",
                    "CarDetectionEvent.json"}:
        return "technical_log"

    return "unknown"
```

`export_jobs.export_type` alanına yazılır; tip bazlı parser seçilir.

#### Whitelist — İşlenecek Dosyalar (Tip Bazında)

**streaming_history:**
- `StreamingHistory_music_*.json` (mevcut pipeline)

**account_data:**
- İşle: `Inferences.json`, `YourLibrary.json`, `Playlist1.json`, `Wrapped2025.json`, `YourSoundCapsule.json`
- Hard-discard: `Identifiers.json`, `Identity.json`, `UserAttributes.json`, `AdsIdentitySecondPartyIdentifiers.json`
- Geri kalan: ATLA

**technical_log:**
- İşle: `AddedToCollection.json`, `RemovedFromCollection.json`, `AddedToPlaylist.json`, `AddToPlaylist.json`, `PlaylistCreated.json`, `DaylistGenerated.json`, `OnRepeatContents.json`, `ShuffleSequenceEvent*.json`, `CarDetectionEvent.json`, `HomeSectionResponse.json`
- Hard-discard: `DeviceIdentifier.json`
- Geri kalan (~160 dosya): ATLA

**unknown:** Job `failed` statüsüne geçer, kullanıcıya bildirim gösterilir.

#### Yeni DB Tabloları

```sql
liked_songs_events    -- AddedToCollection + RemovedFromCollection
  (id, user_id, spotify_uri, event_type: 'liked'|'unliked', occurred_at, import_job_id)

playlist_track_events -- AddedToPlaylist + AddToPlaylist
  (id, user_id, track_uri, playlist_uri, added_at, platform, import_job_id)

car_sessions          -- CarDetectionEvent (connect/disconnect çifti)
  (id, user_id, connected_at, disconnected_at, duration_seconds, import_job_id)

user_export_signals   -- Wrapped2025, SoundCapsule, Inferences, Daylist, OnRepeat vb.
  (id, user_id, signal_source, signal_data JSONB, imported_at, export_job_id)
  -- Upsert: aynı user_id + signal_source için yeni import eskiyi override eder
```

```sql
-- export_jobs tablosuna ekleme:
ALTER TABLE export_jobs ADD COLUMN export_type TEXT;
-- 'streaming_history' | 'account_data' | 'technical_log' | 'unknown'
```

#### Güvenlik Kapısı

Hard-discard dosyaları içerik okunmadan silinir. Log'a yalnızca `"discarded: {filename}"` yazılır. Bu dosyaların listesi worker kodunda sabit (env/config ile değiştirilemez).

#### İçe Aktarım Karnesi + export_type (2026-07-19, FAZ EXPORT-V2 kapanışı)

`run_one_export` artık her job'da şunları döndürür ve `cron/export.py` bunları
`export_jobs`'a yazar:

| Kolon | Anlam |
|---|---|
| `export_type` | `detect_zip_type` sonucu (`streaming_history`/`account_data`/`technical_log`/`mixed`; reddedilen `unknown` da failed job'a yazılır) |
| `matched_events` | DB'ye gerçekten yazılan kayıt sayısı — play_events + podcast_events + yan-veri tabloları (liked/playlist-event/car-session/signal) |
| `skipped_events` | Okunup YAZILMAYAN event sayısı (geçersiz/duplicate/track eşleşmeyen) + yan-veri parse hataları |
| `total_events`/`processed_events` | Streaming'de play event sayısı (eski davranış); saf yan-veri ZIP'lerinde yazılan kayıt toplamı — UI başarılı hesap-verisi işini "0 olay" diye göstermesin |
| `genre_pending` | Artık yalnız gerçekten yeni track yazıldıysa `true` — yan-veri ZIP'i tür kuyruğuna girmez |

ZIP Storage'dan silindikten sonra "ZIP'te ne vardı?" sorusunun kanıtı bu
kolonlardır (FAZ RECAP-DAKIKA'nın son açık maddesi bununla kapandı).

#### Gerçek-veri doğrulaması + basit-format kararı (2026-07-19)

Parser'lar Sahibin GERÇEK Account Data + Technical Log dosyalarıyla kuru
çalıştırıldı (DB'siz): Account 2.660 beğeni + 5.653 playlist olayı + 3 sinyal,
Techlog 202 beğeni + 1.965 playlist olayı + 114 araba seansı + 5 sinyal —
**sıfır hata**; tüm `on_conflict` hedefleri canlı DB unique index'leriyle birebir.

**Bilinçli tasarım kararı:** Gerçek Account Data ZIP'i içinde `StreamingHistory_music_*`
dosyaları da gelir ama bunlar **basit formattadır** (`artistName/endTime/msPlayed/trackName`
— `spotify_track_uri` YOK). URI'siz kayıt track kataloğuna hiçbir zaman
eşleşemez; asıl dinleme kaynağı Extended Streaming History ZIP'idir. Bu yüzden
`detect_zip_type` içerik-kanıt eşiği bu dosyaları streaming saymaz → ZIP
`account_data` olarak işlenir, basit-format geçmiş bilinçli olarak yok sayılır
(çöp "eşleşmedi" kayıtları üretmek yerine). Spotify günün birinde account
ZIP'ine extended format koyarsa tespit otomatik `mixed`'e döner ve iki akış da
işlenir — ek kod gerekmez.

#### Özellik Kilidi

Account Data ve Technical Log ZIP'leri geç geldiği için UI'da özellik kilidi sistemi devrededir. Kaynak: `src/lib/phase/read.ts` (`ROUTE_CAPABILITY`, `isRouteUnlocked`, `shouldShowPhasePanel`) — ayrı bir harita dosyası yok, kilit mantığı doğrudan bu modülde.

#### Ürüne bağlanmış olan yüzeyler (2026-08-12 ölçümü)

FAZ EXPORT-ENTEGRASYON planında uzun süre "hangi ekranda kullanılacağı
bağlayıcı karara bağlanmadı" notu vardı — ölçüldü, bu artık **doğru değil**,
veri zaten iki koldan tüketiliyor:

- **KVKK "verilerimi indir" API'si:** `/api/account/export-data` →
  `src/lib/account/data-export.ts` (`DIRECT_TABLES`: `liked_songs_events`,
  `playlist_track_events`, `car_sessions`, `user_export_signals`,
  `podcast_events`) — GDPR Art. 20 / KVKK m.11 veri taşınabilirliği paketi.
- **Ürün ekranları:** `car_sessions` → recap Manifesto kartı
  (`manifesto-card.tsx`); `liked_songs_events`/`playlist_track_events` →
  `/playlists/liked` ve `/playlists/[id]` sayfaları.

Kalan gerçek boşluk varsa (ör. `technical_log` verisinin hiç UI'ye
çıkmaması) yeni bir ölçümle ayrıca doğrulanmalı — bu not "tamamen bitti"
demiyor, yalnız "sıfırdan başlanacak" varsayımının yanlış olduğunu belgeliyor.

---

### ZIP Doğrulama ve Dayanıklı Parser (2026-06-25)

#### Felsefe

ZIP'in dosya adı veya alt klasör yapısı ne olursa olsun, **içerik formatı
geçerliyse işlenir; geçerli değilse sessizce atlanır, sistem patlamaz.**

#### Nasıl çalışıyor?

`classify_zip_entry(name)` → dosya adına göre hızlı sınıflandırma:
- `Streaming_History_*` veya `StreamingHistory_*` → `"streaming"` (doğrudan işle)
- Adı bilinmeyen `.json` → `"unknown_json"` (içerik taramasına gönder)
- `identity.json` → `"identity"` (işlenmez, güvenlik)
- Diğer → `"ignore"`

`_iter_streaming_events(zf)`:
- `"streaming"` dosyalar → direkt parse
- `"unknown_json"` dosyalar → ilk JSON item okunur; `ts`, `ms_played`,
  `master_metadata_track_name`, `spotify_track_uri` vb. alanlardan
  **herhangi biri** varsa streaming kabul edilip işlenir
- Bozuk veya parse edilemeyen dosyalar `try/except` ile atlanır

#### Ne zaman güncellenir?

Spotify yeni bir export format veya alan ekleyince `_STREAMING_SIGNAL_KEYS`
setine yeni alanlar eklenir. Minimum 1 alan eşleşmesi yeterli — set genişletmek
güvenli (false-positive riski düşük, false-negative riski sıfıra yakın).

---

### Geçmişte Çözülen Sorunlar (Bağlam İçin)

Bu bölüm "ne oldu, neden oldu" bağlamı için — agentlar yeni bir worker
sorunuyla karşılaştığında burada benzer bir desen olup olmadığını
kontrol edebilir.

#### 1. Export timeout → Spotify lookup export'tan kaldırıldı (2026-06-30)
Büyük ZIP (~11K track) yüklenince cron SIGKILL'le ölüyordu. Kök neden:
`run_one_export` içinde her track için Spotify API çağrısı (11K × 1.5sn ≈
4.5 saat). Çözüm: lookup export'tan çıkarıldı; `spotify_artist_ids = None`
doğrudan yazılır. Genre enrichment Deezer + Last.fm'e geçildi (Spotify
23 saatlik 429 kotası). **Stale-job recovery** export cron başına eklendi
(15 dk `processing` → `queued`'a döner).

#### 2. `insert_tracks_batch` RPC — kolon referansı belirsizliği (42702) (2026-06-30)
`RETURNS TABLE(spotify_id TEXT, ...)` OUT-değişkeni fonksiyon gövdesindeki
`spotify_id` kolon referanslarını gölgeliyordu. Migration 0016 `#variable_conflict use_column`
pragma'sıyla çözüldü.

#### 3. Last.fm env var isim uyuşmazlığı (2026-06-30)
`.env.local` / Railway'de `LAST_FM_API_KEY`, config `LASTFM_API_KEY` okuyordu.
Sessizce boş kalıyordu. `config.py` artık her iki ismi de deniyor.

#### 4. Railway başlangıçta yanlış build edildi (tarihsel)
Root Directory boş bırakılmıştı; Railway Next.js olarak build etti.
`/worker` set edilince düzeldi. Yeni Railway servisi kurulurken ilk kontrol.

---

### Şu An Bilinen Sınırlamalar

- **Worker tek instance.** Railway'de şu an bir replica. Birden fazla kullanıcı
  aynı anda ZIP yüklerse sıraya girerler. Mevcut kullanıcı sayısında sorun yok.

- **Genre enrichment devam ediyor.** 15 dk'da 50 track işleniyor. ~11K track için
  ~2.3 gün bekleniyor. Kota duvarı yok.

- **`.env` ile Railway env değişkenleri arasında tutarlılık.** Yeni değişken
  eklenince her iki yerde güncellenmesi şart. `LAST_FM_API_KEY` örneği bunu gösterdi.

---

### Worker'a Dokunurken Genel Dikkat Noktaları

- **Cron'lar iş yapıp çıkar.** Sonsuz loop yok. Her `python -m app.cron.*` tek bir
  batch işler ve çıkar. Loop mantığı Railway'de (her N dakika tetikler).

- **Kota durumu DB'de.** `api_cooldowns` tablosuna bak. 429 gelirse `blocked_until`
  yazılır; bir sonraki cron cooldown'ı görünce API'ye dokunmaz. Sleep yok.

- **`pipeline_runs` tablosu detaylı log.** Railway stdout kısa (1-3 satır).
  Ayrıntı için `pipeline_runs` sorgula: `outcome`, `processed`, `error`, `details`.

- **Railway log "error" severity yanıltıcı.** stdout/stderr karışımı — içeriğe bak,
  etikete değil.

---

### İlgili Dokümanlar

| Dosya | İçerik |
|---|---|
| `docs/reference/spotify-veri-ve-zip.md` | Tüm ZIP dosyaları, seçim kararları, API açıklamaları, DB yapısı |
| `docs/reference/veri-ozellik-kilit-haritasi.md` | Hangi veri → hangi özelliği açar, özellik kilidi tabloları |
| `docs/reference/2026-06-28-spotify-export-veri-rehberi.md` | Tam dosya dizini ve damgalar (Bölüm 5) |

---

### Bu Dosyanın Kullanım Amacı

Bu doküman bir görev listesi değil, bir hafıza notu. Worker ile ilgili
yeni bir konuşma başladığında veya yeni bir agent worker koduna
dokunacağında, "bugün buraya nasıl gelindi" sorusuna hızlı cevap vermek
için var. Yeni bulgular veya çözülen noktalar oldukça bu dosyanın
güncellenmesi, ileride aynı hataların tekrar keşfedilmesini önleyebilir.

---

## ISRC — Geçmişten Bugüne Tam Bağlam

_Eski dosya: `reference/spotify-veri-ve-zip.md`_

> Sahip (2026-07-20): *"ISRC işi ile ilgili bilgi topla, geçmişten bugüne
> neler yaşadık, tüm bağlamı bir özetle."*
>
> Kaynak: `logs/` (17 gün), `CLAUDE.md` «Ölçüme güven», worker kodu, **canlı ölçüm**.
> Bu belge referanstır — otorite değil. Karar verildiğinde `docs/plans/`'a
> plan yazılacak.

---

### 1. ISRC nedir, neden istedik

**ISRC** = her ses kaydının uluslararası tekil kimliği (ör. `TRABC2400123`).
Spotify'da, Apple'da, Deezer'da **aynı** kayıt aynı ISRC'yi taşır.

Rosso için değeri: **platformlar arası kesin eşleşme.** Kullanıcının
Spotify'daki şarkısıyla YouTube Music'teki aynı şarkıyı isim benzerliğiyle
değil, kimlikle eşleştirmek.

Bugünkü eşleşme hiyerarşisi (`worker/app/matching/matcher.py`):

```
1. URI/platform_id  → kesin
2. ISRC             → kesin  ← burası neredeyse hiç çalışmıyor
3. Fuzzy (isim+sanatçı) → tahmini, hatalı eşleşme riski
```

---

### 0. ✅ SONUÇ — iş kapandı (2026-07-21 ölçümü)

> Aşağıdaki bölümler **tarihsel kayıttır.** Bu belge "ISRC neden zordu"yu
> saklar; güncel gerçek burada:

| Alan | 07-20 sabahı | **07-21 06:18 UTC** |
|---|---|---|
| `isrc` | 333 / 28.781 = %1,16 | **24.917 / 28.783 = %86,6** ✅ |
| `duration_ms` | 110 = %0,4 | **24.588 = %85,4** ✅ |

Deezer-öncelikli `isrc_backfill` cron'u (5 dk) kuyruğu **~9 saatte** bitirdi:
70 `success` tur, ardından 201 ardışık `empty`. Kuyrukta bekleyen: **0**.
Ceza yok, elle müdahale yok — Sahibin dört şartı da tuttu.

**Kalan iki kalıntı:** 3.752 track Deezer'da bulunamayıp damgalandı (bir daha
denenmez — katman-2 kararı bekliyor) · 114 track `spotify_id` NULL olduğu için
cron ölçütüne hiç girmiyor (07-10…07-12 yetim satırları).

---

### 2. Canlı durum (2026-07-20 ölçümü — tarihsel)

| Alan | Dolu | Oran |
|---|---|---|
| `spotify_id` | 28.667 / 28.781 | **%99,6** ✅ |
| `genres` | 26.269 / 28.781 | **%91,3** ✅ |
| **`isrc`** | **333 / 28.781** | **%1,16** 🔴 |
| `duration_ms` | 110 / 28.781 | %0,4 🔴 |

⚠ **Oran geriliyor.** 2026-07-12'de %2,5 (292/11.691) idi. ISRC sayısı
292→333 arttı ama katalog 11.691→28.781'e büyüdü. Yani **dolum hızı
katalog büyüme hızının çok gerisinde** — cron durduğu için fiilen sıfır.

---

### 3. Kronoloji — neler yaşadık

#### Haziran: ISRC mimarinin merkezindeydi

- **06-18:** Worker'a ISRC/spotify_id önbelleği eklendi (`_MISS` sentinel)
- **06-19:** Playlist taşıma `migratePlaylist()` → **ISRC öncelikli** çözüm,
  `sync/diff.py` ISRC anahtarlı diff
- **06-20:** FAZ G.2 planlandı — "tracks ISRC lookup + kısmi eşleştirme"
- **06-22:** `search_track()` Spotify aramasından ISRC + metadata çekiyor

Bu dönemde ISRC **varsayılan strateji**ydi. Sorun: doluluk hiç artmadı.

#### 07-11: NotebookLM raporu — ilk yanılma

Rapor iddia etti: *"`external_ids.isrc` Dev Mode'da da dönüyor, 50'lik
batch uç çalışıyor → 11.668 track = 234 istek."*

Kulağa mükemmel geliyordu. **Ama ölçülmedi, koda geçildi.**

Aynı gün ayrı bir ölçüm: `recently_played` ucunda **5/5 şarkıda
`external_ids=None`** — yani ISRC oradan hiç gelmiyor.

#### 07-12: İki canlı ders aynı gün

**Ders 1 — batch uç yalanı (`CLAUDE.md` «Ölçüme güven»):**
```
GET /v1/tracks?ids=a,b,c   → 403 Forbidden   (raporun iddiası)
GET /v1/tracks/{id}        → 200 OK          (gerçek)
```
Dev Mode'da toplu uç kapalıydı. Cron ilk turda patladı.

**Ders 2 — 403'ü çözerken daha büyük sorun (`CLAUDE.md` «Ölçüme güven»):**
Tekil uca geçtim → **50 kat fazla istek** → cron 50 isteği arka arkaya attı
→ **Spotify uygulamayı 6,4 SAAT cezalandırdı.** Görseller ve zenginleştirme
de durdu.

Daha kötüsü: `catalog_backfill` **cooldown'ı hiç kullanmıyordu** —
429 yiyor, DB'ye yazmıyor, 10 dk sonra yine deniyor. Cezayı kendi kendine
besliyordu.

**Sonuç:** Sahip katalog cron'unu **aylığa** çekti (= fiilen durdurdu) ve
kararını verdi: *"ISRC işi zaten çok sıkıntılıydı, geçmişte de çok denedik
ama bir türlü olmadı. Ceza yemeyecek, yavaş da olsa en güvenli, en optimize,
en kapsamlı ve en kendi kendine işleyen hâlde yapılandırmak için **Fable 5**
kullanacağız."*

#### 07-13: Yan temizlik

Duplicate index silindi (`tracks_isrc_idx` ≡ `idx_tracks_isrc`,
migration 0078).

#### 07-20 (bugün): Sahip unuttuğunu fark etti

> *"Ah evet ISRC mimarisi, bak bu işi unutmuşum **ve sen de bana
> hatırlatmamışsın.**"*

Ders: hafızaya "hatırlat" yazmak yetmiyor; bekleyen işi gündeme getirmek
benim işim.

---

### 4. ⚠ Kod tabanında duran çelişki

`worker/app/pipeline/catalog_backfill.py` **kendi içinde tutarsız:**

- **Dosya başlığı (satır 11-12):** *"`external_ids.isrc` Development Mode'da
  DA dönüyor ve **batch endpoint** (`GET /v1/tracks?ids=`, 50'lik) çalışıyor
  → 11.668 track = 234 istek."* ← NotebookLM'in **yanlış** iddiası
- **Kod (satır 116-145):** tekil uçtan çekiyor, yorumda *"🔴 CANLI BULGU:
  toplu uç 403"* yazıyor ← **doğru** olan

Yani düzeltme yapılmış ama **eski iddia başlıkta kalmış.** Bu tam da
`artist_count` regresyonunun sınıfı: belge bir şey söylüyor, kod başka.
Yeni mimari kurulurken bu başlık temizlenmeli.

---

### 5. Bugün ISRC olmadan ne kaybediyoruz

**Kaybetmiyoruz sayılır — sistem ayakta:**
- Eşleşme önbelleği `tracks.id` üzerine kuruldu (FAZ YT-2), ISRC'siz çalışıyor
- `spotify_id` %99,6 dolu → platform içi eşleşme sağlam
- Tür zenginleştirme Deezer/Last.fm üzerinden %91,3'e ulaştı

**Kaybettiğimiz:**
- **Platformlar arası kesin eşleşme** → fuzzy'ye düşüyoruz (hatalı eşleşme
  riski: aynı isimli farklı kayıtlar, remix/live sürümler)
- `duration_ms` **%0,4** — neredeyse hiç yok. Bu ISRC turuyla birlikte
  gelecekti (aynı uçtan dönüyor).
- Albüm adı, çıkış yılı gibi zenginleştirmeler
- **Playlist taşıma** kalitesi — kod ISRC'yi önce arıyor, bulamayınca
  bulanık aramaya düşüyor

---

### 6. Fable 5 turunda ölçülecekler (Sahibin isteği)

> *"ISRC bence hâlâ değerli. ISRC kullanarak bir şarkının/albümün/artistin
> **nelerine ulaşabiliyoruz**, **hangi kaynaklardan neler geliyor** — bunu
> da denemek lazım."*

Yani ISRC'yi bir **anahtar** olarak kullanıp hangi servisten ne geldiğini
**ölçerek** çıkar: Deezer, MusicBrainz, Last.fm, Apple, Spotify.

Fikir zaten vardı: ISRC ile Deezer'da kesin arama — kanıt testi bekliyor.

---

### 7. Tasarım şartları (Sahibin sözleri, bağlayıcı)

- **Ceza yemeyecek** ← en önemlisi
- Yavaş olabilir
- En güvenli · en optimize · en kapsamlı
- **Kendi kendine işleyen** (elle müdahale gerekmeyecek)

#### Kod tarafı zaten korumalı (2026-07-12, commit 01e7c9c)

Cron bugün açılsa bile:
- İstekler arası **250ms gecikme**
- **Devre kesici** bağlı (bloklu isek token bile alınmıyor)
- 429'da cooldown **DB'ye yazılıyor**

Yani bekleme "kod hazır değil" diye değil, **mimari kararı verilmediği**
için sürüyor.

---

### 8. Açık sorular (plan yazılmadan önce)

1. **ISRC'yi nereden alacağız?** Spotify tekil uç tek kaynak mı, yoksa
   MusicBrainz/Deezer gibi ücretsiz ve limitsiz kaynaklar öncelikli mi?
2. **28.448 eksik track için kaç istek?** 250ms geçitle tekil uçtan
   ~2 saat kesintisiz istek demek. Kabul edilebilir mi, yoksa günlük
   kotalı kademeli dolum mu?
3. **Öncelik sırası:** tüm katalog mu, yoksa önce **çok dinlenen** track'ler
   mi? (Playlist taşımada asıl fark yaratan onlar.)
4. **`duration_ms` aynı turda mı?** Aynı uçtan geliyor, ayrı tur israf olur.
5. Dev Mode kısıtı kalkabilir mi? (Spotify'a extended quota başvurusu —
   toplu uç açılırsa istek sayısı 50 kat düşer.)

---

### 9. İlgili kayıtlar

- CLAUDE.md **§1.5** (kaynağa değil ölçüme güven) — ISRC batch vakası oradan
- CLAUDE.md **§1.6** (rate-limit: platformu asla dürtme) — 6,4 saat cezası
- `worker/app/pipeline/catalog_backfill.py` — ⚠ başlığı yanlış, kodu doğru
- `worker/app/matching/matcher.py` — ISRC eşleşme hiyerarşisindeki yeri
- Railway: "Katalog Dolgu Cron'u" (`0458c728-…`), aylık, son çalışma
  2026-07-12 (`blocked`)

---

## Veri Envanteri — İki Yeni ZIP'in Ürün Entegrasyonu Kararına Hazırlık

_Eski dosya: `decisions/veri-envanteri-iki-yeni-zip-entegrasyonu.md`_

> **Amaç:** Sahip bu iki yeni ZIP'ten (Account Data + Technical Log) gelen
> verinin üründe **nerede, nasıl** kullanılacağına Claude ile tartışarak karar
> verecek. Bu doküman o kararın önündeki tüm zemini kurar: *elimizde ne var,
> nerede kullanıyoruz, yeni ne geldi, DB'de nasıl duruyor.* Tahmin yok —
> sayılar 2026-07-27'de canlı DB'den ölçüldü (§1.5).
>
> **Statü:** Karar öncesi envanter. Karar verilince bu dosya `archive/`'a taşınır,
> uygulama planı `docs/plans/`'a girer.
>
> ⚠ **2026-07-28 GÜNCELLEME (plan 07):** Rosso saf Spotify oldu — YT Music + Apple
> Music + **playlist taşıma** kaldırıldı. Bu belgede "playlist taşıma/üretimi" geçen
> yerlerde artık YALNIZ **Spotify playlist OLUŞTURMA** var (taşıma yok). Envanterin
> asıl konusu (iki yeni ZIP verisi → hangi ekran) bundan etkilenmez.

---

### 0. Tek Bakışta Ana Mesaj

Rosso'nun elindeki veri üç kaynaktan geliyor: **(A)** Extended Streaming History
ZIP'i (dinleme geçmişi — ürünün bel kemiği, her yeri besliyor), **(B)** Spotify
Web API (canlı zenginleştirme — kapak, süre, ISRC) + Deezer/Last.fm (genre),
**(C)** iki yeni ZIP: Account Data + Technical Log.

**Kritik bulgu:** (A) ve (B) üründe yoğun kullanılıyor. Ama **(C)'nin doldurduğu
4 tablonun tamamı bugün hiçbir kullanıcı ekranında OKUNMUYOR** — veri sağlıklı
şekilde toplanıp DB'de duruyor (3.005 beğeni, 7.614 playlist olayı, 114 araba
seansı, 7 sinyal) ama yalnız *yazılıyor*, hiç *gösterilmiyor*. Kararın konusu
tam olarak bu: **bu atıl veriyi hangi ürün yüzeyine, nasıl bağlayacağız?**

---

### 1. Elimizde Ne Var? (Kaynak Kaynak, Ölçülmüş)

#### Kaynak A — Extended Streaming History ZIP'i (dinleme geçmişi)

Ürünün temel yakıtı. Kullanıcının tüm dinleme geçmişi buradan gelir.

| Tablo | Ne tutar | Canlı doluluk (2026-07-27) |
|---|---|---|
| `play_events` | Her dinleme olayı (track, zaman, süre, platform) | **255.495 satır**, 32 kullanıcı |
| `podcast_events` | Podcast dinleme olayları | 776 satır |
| `tracks` | Çalınan parçaların kataloğu (kimlik + zenginleştirme) | **28.793 track** |

`play_events` bir organik kullanıcıda tek başına **124.849 satıra** ulaşıyor —
bu, "distinct/tüm satır" sorgularında REST'in ~1000 satır sessiz kırpmasının
(§1.65) gerçek bir risk olduğu ölçek. (KVKK export'unda bu yüzden sayfalama
kullandık.)

#### Kaynak B — Canlı API Zenginleştirmesi (`tracks` tablosu kolonları)

`tracks` kataloğu ham ZIP'ten gelen isim/URI ile başlar, sonra API'lerle
zenginleşir:

| Kolon | Kaynak | Doluluk | Nerede üretiliyor |
|---|---|---|---|
| `spotify_id` | ZIP (URI'den) | 28.679 / 28.793 (%99,6) | export parser |
| `genres` | **Deezer + Last.fm** (Spotify değil) | 26.280 (%91,3) | `enrichment` cron |
| `isrc` | Deezer/Spotify | 25.361 (%88,1) | `isrc_backfill` cron |
| `duration_ms` | Deezer/Spotify | 25.030 (%86,9) | `isrc_backfill` cron |
| `image_url` (kapak) | **Spotify Web API** | 1.309 (%4,5) | `cover_backfill` cron (yeni, dolduruyor) |

⚠ **Genre neden Deezer/Last.fm, Spotify değil?** Spotify Dev Mode'da genre
uçları kısıtlı + 23 saatlik 429 kotası (rate-limit dersi §1.6). Genre DNA'sı
çok-kaynaklı hiyerarşik kuruluyor. Kapak ise Spotify'dan geliyor çünkü orada
zengin — ama tekil uç + 250ms geçit ile (§1.6).

#### Kaynak B (devam) — Türetilmiş kullanıcı kimliği

Yukarıdaki ham+zengin veriden hesaplanan üst katman:

| Tablo | Ne tutar | Doluluk |
|---|---|---|
| `recaps` | Yıllık/aylık recap kartları (JSONB payload) | 163 |
| `user_taste_profile` | Taste kimliği (6 eksen) | 32 (her kullanıcı) |
| `user_genre_vectors` | Genre DNA vektörü | — |
| `playlists` (+ `playlist_tracks`) | Kullanıcı + üretilen playlist'ler | 177 |
| `journey_arc` / `journey_year_milestones` | Journey anlatısı | — |

---

### 2. Bu Verileri Nerede / Nasıl Kullanıyoruz?

| Veri | Ürün yüzeyi | Nasıl |
|---|---|---|
| `play_events` | **Her yer.** Dashboard, `/gecmis` (Dinleme Geçmişi), Recap, Taste, `/mood` | Dinleme sayıları, top şarkı/sanatçı, saat/gün dağılımları, dönem grupları |
| `tracks.genres` | Taste (genre DNA), Recap (yıl türü), `/mood` öneri, eşleşme skoru | Genre contrast ana skor; sosyal eşleşmenin birincil boyutu |
| `tracks.image_url` | `/gecmis` kapak grid, playlist kartları, Recap görselleri | Kapaklı görsel dil (stats.fm ilhamı) |
| `tracks.isrc`/`duration_ms` | Playlist taşıma (eşleştirme), süre bazlı istatistik | ISRC = platformlar arası kesin eşleştirme anahtarı |
| `recaps` | `/recap`, `/recap/[period]` story ekranları | Donmuş JSONB payload (görseller dahil) |
| `user_taste_profile` | `/taste`, sosyal profil, eşleşme | 6 ayrık eksen, TR≠EN ayrı havuz |
| `playlists` | `/playlists`, taşıma, `/mood` | Kullanıcı + Rosso'nun ürettiği playlist'ler |

**Özet:** Kaynak A ve B, ürünün **görünen her katmanını** besliyor.

---

### 3. İki Yeni ZIP — Hangi Veriler Geliyor?

Spotify GDPR export talebinde 3 ZIP farklı gecikmelerle gelir. `streaming_history`
zaten Kaynak A. İki YENİ olan:

#### 3a. Account Data ZIP (~4-5 günde gelir)

İşlenen dosyalar → hangi tabloya:

| ZIP dosyası | Ne içerir | Nereye yazılır |
|---|---|---|
| `YourLibrary.json` (beğeniler) | Beğenilen şarkılar (kütüphane) | `liked_songs_events` (event_type='liked') |
| `Playlist1.json` | Kullanıcının playlist'leri + içerikleri | `playlist_track_events` + `playlists` |
| `Wrapped2025.json` | Spotify'ın yıllık özeti | `user_export_signals` (source='wrapped_2025') |
| `YourSoundCapsule.json` | Aylık ruh hâli/tür kapsülü | `user_export_signals` (source='sound_capsule') |
| `Inferences.json` | Spotify'ın kullanıcı hakkındaki **çıkarımları** (reklam ilgi alanları, demografik tahminler) | `user_export_signals` (source='inferences') |

**Hard-discard (içerik okunmadan silinir):** `Identifiers.json`, `Identity.json`,
`UserAttributes.json`, reklam kimlik dosyaları — güvenlik gereği.

#### 3b. Technical Log ZIP (~4-5 günde gelir, ~160 dosya, çoğu atlanır)

| ZIP dosyası | Ne içerir | Nereye yazılır |
|---|---|---|
| `AddedToCollection.json` / `RemovedFromCollection.json` | Beğeni ekleme/çıkarma **zaman damgalı** | `liked_songs_events` (liked/unliked + occurred_at) |
| `AddedToPlaylist.json` / `AddToPlaylist.json` | Playlist'e ekleme olayları (zamanlı) | `playlist_track_events` |
| `PlaylistCreated.json` | Playlist oluşturma anları | `user_export_signals` (playlist_created) |
| `CarDetectionEvent.json` | Arabaya bağlanma/çıkma çiftleri | `car_sessions` (connected/disconnected + süre) |
| `DaylistGenerated.json` | Günün saatine göre üretilen daylist'ler | `user_export_signals` (daylist_aggregate) |
| `OnRepeatContents.json` | Sürekli tekrar dinlenenler | `user_export_signals` (on_repeat) |
| `HomeSectionResponse.json` | Ana ekranda gösterilen kategoriler | `user_export_signals` (home_section_categories) |
| `ShuffleSequenceEvent*.json` | Karıştırma davranışı | (işlenir, sinyal) |

**Hard-discard:** `DeviceIdentifier.json`. Geri kalan ~160 dosya: atlanır.

#### Ne kadar zengin? (Sahibin gerçek ZIP'i, canlı DB — 2026-07-27)

| Tablo | Satır | Kaynak |
|---|---|---|
| `liked_songs_events` | **3.005** | Account (kütüphane) + Technical Log (zamanlı) + YT Music |
| `playlist_track_events` | **7.614** | Account + Technical Log |
| `car_sessions` | **114** | Technical Log (CarDetection) |
| `user_export_signals` | **7** (7 farklı kaynak) | Wrapped, SoundCapsule, Inferences, Daylist, OnRepeat, PlaylistCreated, HomeSection |

---

### 4. DB'de Bu Verileri Nasıl Tutuyoruz?

#### Tasarım ilkesi: olay tabloları vs. sinyal tablosu

İki yeni ZIP verisi **iki desende** tutuluyor:

**(1) Yapılandırılmış olay tabloları** — sık, sayılabilir, zaman serisi olan
veriler kendi tablosunda, tiplenmiş kolonlarla:

```
liked_songs_events (id, user_id, spotify_uri, event_type 'liked'|'unliked',
                    occurred_at, platform, external_id, import_job_id)
playlist_track_events (id, user_id, track_uri, playlist_uri, added_at,
                       platform, import_job_id)
car_sessions (id, user_id, connected_at, disconnected_at, duration_seconds,
              import_job_id)
```

**(2) Esnek sinyal tablosu** — her biri farklı şekilli, seyrek, "bir kere gelir"
veriler tek bir JSONB tablosunda:

```
user_export_signals (id, user_id, signal_source, signal_data JSONB,
                     imported_at, export_job_id)
  -- Upsert: aynı (user_id, signal_source) yeni import eskiyi override eder.
```

**Neden bu ayrım?** Beğeni/playlist/araba olayları sayı ve sorgu gerektirir →
tiplenmiş kolon + index mantıklı. Wrapped/SoundCapsule/Inferences ise her biri
kendine özgü şekilli, yılda bir gelen belge → şemayı her biri için ayrı tablo
yapmak yerine JSONB'de esnek tutmak doğru (şema drift'i olmaz).

#### Kanıt / izlenebilirlik

Her satırda `import_job_id`/`export_job_id` var → hangi ZIP'ten geldiği izlenir.
ZIP Storage'dan silinse bile `export_jobs` karnesi (`matched_events`,
`skipped_events`, `export_type`) "ZIP'te ne vardı" sorusunu cevaplar.

#### ⚠ Bu tabloların bugünkü durumu: YAZILIYOR ama OKUNMUYOR

Kod taraması (2026-07-27): `liked_songs_events`, `playlist_track_events`,
`car_sessions`, `user_export_signals` — **`src/` (frontend/ürün) içinde hiçbir
okuma yok.** Yalnız worker parser'ları yazıyor (+ yeni KVKK data-export okuyor).
Bu, kararın çıkış noktası.

---

### 5. Karar İçin Açık Sorular (tartışılacak)

Bu envanter kararı vermez; zemini kurar. Sahip + Claude'un tartışacağı sorular:

1. **Beğeni geçmişi (`liked_songs_events`, 3.005 olay)** — zaman damgalı beğeni/
   çıkarma akışı elimizde. Bu "beğeni yolculuğu" nereye? Taste'e bir "en çok
   beğendiğin dönem" mi, Recap'e bir kart mı, `/gecmis`'e ayrı sekme mi?

2. **Playlist olayları (`playlist_track_events`, 7.614)** — hangi şarkıyı ne
   zaman hangi playlist'e ekledin. Journey'e "playlist kürasyon anları" mı?

3. **Araba seansları (`car_sessions`, 114)** — "araba müziği" bir mood/bağlam
   mı? `/mood`'a "Araba" modu mu (zaten Gece Sürüşü var)?

4. **Sinyaller (`user_export_signals`)** — özellikle `inferences` (Spotify'ın
   senin hakkındaki çıkarımları) güçlü bir ayna olabilir: "Spotify seni böyle
   görüyor, Rosso ise şöyle." Wrapped/SoundCapsule ile Rosso Recap'i
   karşılaştırmak? Bu, felsefedeki "unuttuğun hâlini hatırla" ile örtüşür mü?

5. **Öncelik + özellik kilidi** — bu ZIP'ler geç geldiği için (4-5 gün) UI'da
   kilit sistemi var. Hangi özellik hangi ZIP'e bağlanacak, kilit metni ne?

---

### İlgili Dokümanlar

| Dosya | İçerik |
|---|---|
| `docs/reference/spotify-veri-ve-zip.md` | ZIP upload + worker + 3 ZIP tipi + parser mimarisi |
| `docs/reference/veri-ozellik-kilit-haritasi.md` | Hangi veri → hangi özelliği açar |
| `docs/reference/spotify-veri-ve-zip.md` | Tüm ZIP dosyaları + seçim kararları |
| `docs/vision/kuzey-yildizi.md` | "Hatırlama" ekseni — Journey imza zemini |

---

## Spotify Wrapped2025 — Recap Geliştirme Rehberi

_Eski dosya: `decisions/spotify-veri-ve-zip.md`_

> Kaynak: `Wrapped2025.json` (Account Data ZIP) · Sahip örneği · 2025 yılı
> Karar spec: `docs/plans/02-zip-verisi-urune-baglama.md` → A13
> Ham dosya: `docs/platform-dev-docs/spotify zip/Spotify Account Data/Wrapped2025.json`

---

### Bu dosya ne için? Jarvis bu dosya ne için ben söyliyim gerisi boş asıl önemli olan benim söylediğim:

Bu dosyanın amacı spotify vrapped'in benim için 2025 yılında rossonun söylemediği ne söylediği, ve nasıl söylemiş olduğunu tespit edip bunun algoritmasını rossodaki veriler üstünden çıkartmak. Böylece her kulalnıcıya her yıl ve ay için yani seçili dönem için benzer şekilde bir iki bilgi daha verebilmek. Yani kendi sistemimize bir yakıt olması bu veri dosyasının. Başka birşey değil algoritmayı beslemek yani. Gerisini de buna göre değerlendir.

Spotify Wrapped **kullanıcıya gösterilmez**. Rosso Recap modülünü geliştirmek için
referans: Spotify hangi metrikleri seçmiş, Rosso'da ne var / ne eksik?

**İlke:** Wrapped kopyası değil; seçim mantığını öğren, Rosso dilinde uygula.

---

### B6 kararı — ✅ TAMAMLANDI (2026-07-29)

Sahip tüm blokları inceledi. Özet:


| Karar           | Ne                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Recap'e ekle  | Duygu profili, yıllık keşif, top vurgusu, sanatçı akış grafikleri, takıntı AHA, top albümler, tür çeşitliliği, dinleme dönemi metaforu |
| ✅ Motor girdisi | Popularity, explicit %, multilinguist skoru                                                                                            |
| ⛔ Atla          | Dinleme günü sayısı (301/365), fan yüzdeliği, fan leaderboard, kulüp metaforu                                                          |
| ✓ Zaten var     | Manifesto, streak, top listeler (isimli), soundscape, year matrix                                                                      |


Detay kararlar → `../plans/02-zip-verisi-urune-baglama.md` **§ A13**.

---



### Rosso Recap bugün (10 kart)


| #   | Kart              | Ne anlatıyor                          |
| --- | ----------------- | ------------------------------------- |
| 1   | Kapak             | Dönem + görsel                        |
| 2   | Manifesto         | Dakika · şarkı · sanatçı · baskın tür |
| 3–4 | Top sanatçı/şarkı | İsimli, görsel                        |
| 5   | Keşif arşivi      | En çok keşif yapılan **ay**           |
| 6   | Streak            | En uzun ardışık dinleme serisi        |
| 7   | Peak gün          | En yoğun gün + 3 şarkı                |
| 8   | Soundscape        | Saatlik dağılım                       |
| 9   | Yıl matrisi       | Yıllık poster                         |
| 10  | Plaket            | Kapanış                               |


---



### Sahip kararları — blok blok



#### 1. Yıllık ölçek


| Alan                      | Değer     | Karar                                                  |
| ------------------------- | --------- | ------------------------------------------------------ |
| Toplam dakika/saat        | ~408 saat | ✅ Manifesto yeterli                                    |
| Dinleme günü (301/365)    | —         | ⛔ Gerek yok                                            |
| Streak                    | 122 gün   | ✅ Mevcut streak kartı                                  |
| #1 sanatçı %              | %6,9      | ⛔ Gerek yok                                            |
| `avgTrackPopularityScore` | 0,57      | ✅ **Motor girdisi** — mainstream vs niş kimlik sinyali |
| `percentListenedExplicit` | %18       | ✅ **Motor girdisi** — aynı eksende                     |




#### 2. Top listeler


| Alan                         | Karar                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Top 5 sanatçı/şarkı (isimli) | ✅ Rosso üstün — koru                                                                  |
| `topNPercentileFan`          | ⛔ Çöp                                                                                 |
| Top sanatçı/şarkı vurgusu    | ✅ **#1 daha öne çıksın** — dinleme saati yazılsın, diğer 4'ten görsel olarak ayrışsın |




#### 3. Keşif


| Alan                         | Karar                                                                 |
| ---------------------------- | --------------------------------------------------------------------- |
| `numArtistsDiscovered` (114) | ✅ **Yıllık recap:** "bu yıl X yeni sanatçı / şarkı / albüm keşfettin" |
| Ay bazlı keşif kartı         | ✅ Koru — yıllık toplam **ek** olarak                                  |




#### 4. Duygu profili — ⭐ öncelikli


| Duygu | Sahip % |
| ----- | --------- |
| Party | %32,7     |
| Love  | %25,8     |
| Sad   | %18,0     |
| Angry | %11,1     |


**Karar:** Çok önemli veri katmanı. Spotify'ın 4 pusulası:

1. **Kalibrasyon:** Rosso algoritmasını Wrapped 2025 değerleriyle test et (2025 özelinde başla)
2. **Recap UI:** Yıllık ve aylık recap'te "bu dönem dinlemenin %X'i party, %Y love…" göster
3. **Kimlik yönergesi:** Mevcut mood/enerji/kimlik kartlarına girdi

Kaynak: `play_events` + audio features — Wrapped JSON hedef tanımlar, kaynak değil.

#### 5. Dinleme dönemi metaforu


| Alan                   | Değer               |
| ---------------------- | ------------------- |
| Spotify `listeningAge` | 41 (2000'ler early) |


**Karar:** Birebir kopyalama yok. Rosso dili: *"Sen 2010'ların insanısın"* /
*"Erken 2000'ler insanısın"* — "bu devrin adamı değilim" tonu, cheesy "DNA" yok.

**Şart:** Spotify'ın 2025'te neden 41 dediğini tersine mühendislik → her dönem için
uygulanabilir algoritma (`play_events` yıllık dağılımı).

#### 6. Sanatçı yıllık akış grafikleri — ⭐

**Karar:** Top 5 sanatçı kartının **ardından** — her sanatçı için yıl boyunca
dinleme eğrisi:

- Top 5 şablonuyla uyumlu; istatistik yerine **görsel + isim + grafik**
- 5 kart dikey liste; yatay grafik alanı
- **Smooth akış** — 12 keskin sütun değil, yumuşak yükseliş/alçalış
- İsteğe bağlı: 5 sanatçı tek grafikte farklı renklerle karşılaştırmalı

Veri: `play_events` aylık aggregation. Wrapped `topArtistRace` referans/kalibrasyon.

#### 7. Takıntı AHA kartı — ⭐

**Karar:** Yıllık recap'e özel yeni kart (veya streak genişletmesi):

- Artist / album / track için ayrı streak aranır
- **En ilgi çekici** olan gösterilir (en uzun ardışık değil her zaman en iyi:
"249 gün X sanatçı" > "34 gün üst üste" gibi)
- Örnek: "5 yıldır bu şarkıyı dinliyorsun"

Wrapped `insights` (TRACK/ARTIST_X_DAY_STREAK) kalibrasyon referansı.

#### 8. Albümler

**Karar:** Top albümler **yıllık recap'te** olmalı. Aylık recap'te gerek yok.

#### 9. Tür çeşitliliği

**Karar:** Manifesto'ya ekle — *"Bu yıl toplam X tür dinledin"* (ör. 233).
`absoluteChaosRankingScore` ayrı kart değil; bu satır yeter.

#### 10–12. Çöp


| Blok                                | Karar                                               |
| ----------------------------------- | --------------------------------------------------- |
| Kulüp metaforu (`SOFT_HEARTS_CLUB`) | ⛔ Rosso'da taste vibe/kimlik kartları karşılığı var |
| Fan leaderboard (#37.008 TR)        | ⛔ Çöp — felsefeye aykırı                            |
| `multilinguistRankingScore`         | ✅ **Eşleşme/öneri motoru** girdisi                  |


---



### Gap tablosu (güncel)


| Metrik                      | Rosso | Karar                     | Öncelik    |
| --------------------------- | ----- | ------------------------- | ---------- |
| Toplam dakika               | ✅     | Koru                      | —          |
| Top listeler (isimli)       | ✅     | #1 vurgula + saat         | Yüksek     |
| Streak                      | ✅     | Koru                      | —          |
| Keşif (ay)                  | ✅     | + yıllık toplam           | Yüksek     |
| **Duygu profili 4'lü**      | ❌     | Recap + kalibrasyon       | **Kritik** |
| **Sanatçı akış grafikleri** | ❌     | Yıllık recap yeni kartlar | **Yüksek** |
| **Takıntı AHA**             | ❌     | Yıllık recap              | **Yüksek** |
| Top albümler                | ❌     | Yıllık only               | Orta       |
| Tür çeşitliliği             | ❌     | Manifesto satırı          | Orta       |
| Dinleme dönemi metaforu     | ❌     | Recap/Journey             | Orta       |
| Popularity + explicit       | ❌     | Motor girdisi             | Orta       |
| Multilinguist               | ❌     | Motor girdisi             | Orta       |
| Dinleme günü 301/365        | —     | ⛔ Atla                    | —          |
| Fan leaderboard / kulüp     | —     | ⛔ Atla                    | —          |


---



### Kullanım şartları


| Kural               | Açıklama                                                  |
| ------------------- | --------------------------------------------------------- |
| Kaynak değil, hedef | Metrikler `play_events`'ten üretilir; Wrapped kalibrasyon |
| Spotify UI yok      | Kullanıcı Wrapped görmez                                  |
| Faz kilidi          | Account Data ZIP (`Wrapped20XX.json`)                     |
| Cron                | Yeni kartlar `recap_refresh` payload'ına (`read.ts`)      |
| Yıllık vs aylık     | Albüm, takıntı AHA, sanatçı akış → yalnız yıllık          |


---



### Ham veri özeti (Sahip, 2025)

```
Toplam dinleme:     ~408 saat (24.490 dk)
Streak:             122 gün
Benzersiz sanatçı:  719 · şarkı: 1.256
Keşfedilen sanatçı: 114
Tür çeşitliliği:    233
Duygu:              party %32,7 · love %25,8 · sad %18,0 · angry %11,1
Explicit:           %18,0 · Popularity: 0,57
Dinleme yaşı (Sp):  41 (2000'ler early) — Rosso metaforu farklı olacak
Multilinguist:      6,45
```
