# Rosso Mobil — API sözleşmesi (PLAN 4.2)

Son doğrulama: 2026-10-31 (web `9a3b4244`; rotalar koddan okundu, RPC yetkileri canlıda `has_function_privilege` ile ölçüldü).
Kararlar: `mimari.md` M3–M8. Bu belge mobil kodun tek sözleşmesidir; rota değişirse aynı commit'te güncellenir.

## Kimlik
- Mobil, Supabase e-posta/şifre ile girer (`@supabase/supabase-js`, oturum SecureStore'da). Davet kapısı (0359) veritabanında, mobilde ayrıca kontrol yok.
- Web rotalarına her istekte `Authorization: Bearer <session.access_token>`. Token'ı yenilemek mobilin işi (`autoRefreshToken: true`); süresi geçmiş token → 401.
- Sunucu tarafı (`web/src/lib/supabase/server.ts`): oturum çerezi YOKSA ve başlık JWT biçimindeyse (`eyJ….….…`) `createClient()` anon anahtar + bu token'la istemci kurar; RLS kullanıcıya göre çalışır, `auth.getUser()` token'ı doğrular. Çerez varsa web oturumu kazanır. Cron/worker'ın `Bearer <sır>` başlığı JWT biçiminde olmadığı için kullanıcı sayılmaz. Testler: `server.test.ts`.
- CORS gerekmez (yerel uygulama, tarayıcı değil). Tarayıcı `Authorization`'ı kendiliğinden göndermediği için CSRF yüzeyi açılmaz.

## Okumalar — doğrudan Supabase (M4)
Hepsi `authenticated` rolüyle, RLS ya da `auth.uid()` kapısıyla. Web'in okuduğu paketlerin aynısı:
- Tablolar: `user_stats_pkg`, `user_taste_pkg`, `user_top_strips`, `mood_pkg`, `recaps`, `journey_*`, `playlists`, `platform_connections` (sütun yetkisi: token sütunları hariç; `is_active`, `platform`, `last_synced_at` vb.), `export_jobs` (kendi işleri).
- RPC (canlıda `authenticated` EXECUTE var, `anon` yok): `mood_playlist`, `get_mood_workspace`, `liked_songs_page`, `history_top_tracks` (ve diğer `history_top_*`), `playlist_growth_series`.
- Büyük tabloyu REST ile sayfalama (1000 satır sınırı) YASAK: web'deki RPC'yi kullan.

## Yazmalar — doğrudan RPC
Web bunları sunucu eylemiyle çağırıyor; mobil aynı RPC'yi kendi oturumuyla çağırır (canlıda `authenticated` EXECUTE var):
| RPC | İş |
| --- | --- |
| `set_mood_track_feedback` | mood şarkı etiketi (uygun / uygun değil) |
| `set_mood_hidden_tracks` | mood listesinde gizlenenler |
| `set_mood_weekly_sync` | haftalık Spotify senkronu aç/kapa |
| `mark_mood_exported` | yalnız web akışının iç adımı; mobil çağırmaz (`mood/create-playlist` kendisi damgalar) |
Parametre adları: `web/src/app/(dashboard)/playlists/mood/[key]/actions.ts`.

## Yazmalar — web rotaları (Bearer)
Taban: `EXPO_PUBLIC_WEB_URL`. Hepsi JSON 401 döner, yönlendirmez. "Pahalı" = örnek başına 5 istek / 60 sn (bellek içi, sunucusuz örnek başına).
| Rota | Yöntem | İstek | Başarı | Not |
| --- | --- | --- | --- | --- |
| `/api/mood/create-playlist` | POST | `{ moodKey, platforms?: ['spotify'] }` | 200 `{ result }` | pahalı; şarkıları sunucu seçer, gizlenenleri atar; 404 şarkı yok |
| `/api/mood/remove-track` | POST | `{ moodKey, spotifyTrackId }` (22 karakter) | 200 `{ success, spotifySynced, warning? }` | 20/60 sn; Spotify hatası 200 + `warning` |
| `/api/mood/year-export` | POST | `{ year }` | 200 `{ result }` | pahalı; 404 yıl arşivde yok |
| `/api/export/upload` | POST | `{ fileName, fileSize, fileType }` | 200 `{ jobId, signedUrl, path, token }` | ZIP'i mobil `signedUrl`'e doğrudan PUT eder (Storage `spotify-exports`, 2 saat geçerli); en çok 200 MB; 3 aktif iş, saatte 10 |
| `/api/export/queue` | POST | `{ jobId }` | 202 `{ jobId }` | yükleme bittikten sonra; 409 dosya henüz yok; 413/415 boyut/biçim |
| `/api/export/delete` | DELETE | `{ jobId }` | 200 `{ ok: true }` | dinleme olaylarına dokunmaz |
| `/api/auth/token-status` | GET | — | 200 `{ spotify: {connected, expiresAt, needsRefresh, expired, exportImported} \| null, export: {hasCompleted, latestJob} }` | bağlantı ve ZIP durumu |
| `/api/spotify/sync` | POST | — | 200 senkron sonucu | pahalı; GET de senkron başlatır, mobil yalnız POST kullanır |
| `/api/quick-start` | GET | — | 200 hızlı başlangıç durumu | `no-store` |
| `/api/settings/preferences` | GET, PATCH | PATCH `{ include_incognito?, collaborative_sync?, locale?: 'en'\|'tr'\|null }` | GET `{ preferences }`, PATCH `{ updated: true }` | |
| `/api/playlists/add-track` | POST | `{ playlistId, trackId }` (uuid) | 200 `{ ok, rossoAdded, alreadyPresent, spotifyAdded, note? }` | sahiplik kontrolü sunucuda |
| `/api/automations/playlist-rule` | GET, POST, DELETE | POST `{ rule_type, track_count: 20\|50\|100, target_platforms: ['spotify'], enabled?, sort_by? }`; DELETE `?id=` | GET `{ rules, recentRuns }` | |
| `/api/account/export-data` | POST | — | 200 JSON dosyası (indirme) | KVKK dışa aktarım |
| `/api/account/delete` | POST | `{ password, confirm: 'DELETE MY ACCOUNT' }` | 200 `{ deleted, soft_deleted, purge_after_days: 30 }` | şifreyle yeniden doğrular; 403 yanlış şifre |
v1'de mobil kullanmaz: `/api/playlists/generate` (web'in liste oluşturucusu), beğeni değiştirme (sunucu eylemi, M10 dışında), `/api/spotify/connect|callback|byoc` (tarayıcı akışı).

## Spotify bağlantısı (M7)
Mobil `expo-web-browser` ile `${WEB_URL}/data` açar. O tarayıcıda web oturumu yoksa kullanıcı web'e bir kez giriş yapar (Android'de Custom Tabs, Chrome'un çerezlerini paylaşır). Sihirbaz bitince mobil `/api/auth/token-status` ile durumu yeniler. Mobil hiçbir Spotify sırrı ya da token'ı taşımaz.

## ZIP (M8)
`expo-document-picker` → `/api/export/upload` → `signedUrl`'e PUT (`expo-file-system` yükleme, `Content-Type: application/zip`) → `/api/export/queue` → durum `export_jobs` tablosundan ya da `/api/auth/token-status`'tan okunur.

## Hata biçimi
Gövde `{ error: string }`; 401 oturum, 404 bulunamadı, 409 sıra, 413 boyut, 415 biçim, 422 doğrulama, 429 hız (`Retry-After` olabilir), 5xx sunucu. Mobil 401'de oturumu yeniler, bir kez yeniden dener, olmazsa girişe döner.
