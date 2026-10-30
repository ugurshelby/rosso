# Rosso Mobil — Mimari Kararlar (L3, 2026-10-22)

> Vizyon (Sahip, 2026-10-22/23): **Android öncelikli** mobil uygulama, olağanüstü UI/UX; her geliştirici kendi Spotify dev app'i + ZIP + kendi veritabanıyla kurabilsin. iOS aynı koddan derlenir ama bizim hedefimiz değil.
> Tasarım (bağlayıcı): [`../design/katmanlar/mobile-design.md`](../design/katmanlar/mobile-design.md).
> Kaynaklar: [`kaynaklar.md`](kaynaklar.md). Uygulama sırası: kök [`PLAN.md`](../../PLAN.md) Faz 4.

## Kararlar

| # | Karar | Neden | Reddedilen |
|---|---|---|---|
| M1 | **Expo (React Native) + Expo Router + TypeScript strict**, en güncel kararlı SDK, dev build (Expo Go değil) | Tek kod iki platform; ekip zaten React/TS; EAS ile makinesiz build | Flutter (yeni dil), iki yerel uygulama (iki kat iş), PWA (iOS'ta arka plan/kurulum zayıf) |
| M2 | Mobil **tek kod tabanı**: `rosso-portfolyo/mobile/` (herkese açık monorepo). Sahip kendi telefonuna aynı koddan, kendi env'iyle build alır | Aynı mobil kod iki yerde yaşarsa eşitleme sonsuz iş olur. Mobilde kişiye özel bir şey yok | Ayrı özel repo + eşitleme. **Sahip onayı bekliyor (yeni klasör herkese açık repoda)** |
| M3 | Her kurulum kendi arka ucunu derleme anında alır: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_URL` (`app.config.ts`) | BYOC ilkesi: uygulamada kimsenin sunucusu gömülü değil | Çalışma anında "sunucu adresi gir" ekranı (v2'de eklenebilir) |
| M4 | Okumalar doğrudan **Supabase (RLS)**: paketler (`user_*_pkg`, `journey_*`, `recaps`, `mood_pkg`, `playlists`). Yazma/eylem web API'si üzerinden | Web zaten paketleri okuyor; RLS her kullanıcıyı kendi verisine kilitliyor | Mobil için ayrı API katmanı |
| M5 | Web API'leri mobil için **Bearer JWT** kabul eder (Supabase access token), çerez yerine | Mobilde çerez oturumu yok | Ayrı mobil uçları |
| M6 | Kimlik: Supabase e-posta/şifre + derin bağlantı (`rosso://`); davet kapısı (0359) aynen geçerli | Tek kayıt yolu | Spotify ile giriş (BYOC'de her kurulum ayrı app, karmaşık) |
| M7 | Spotify bağlantısı v1'de **web'in BYOC sihirbazında** (uygulama içi tarayıcı); token'lar sunucuda kalır | Mobil hiçbir sır taşımaz; Spotify'ın HTTPS yönlendirme kuralı web'de zaten sağlanıyor | Mobilde PKCE (v2'de değerlendirilir) |
| M8 | ZIP: `expo-document-picker` → web'in mevcut yükleme hattı (`/api/export/upload` → `/queue` → worker) | Tek ZIP hattı; worker değişmez | Mobilde ayrıştırma |
| M9 | Tasarım: web token'ları (renk, tipografi, boşluk) ortak pakete çıkar; iOS'ta HIG, Android'de Material 3 davranışları, görünüm Rosso | Marka tek, his platforma yerli | Web bileşenlerini birebir taşımak |
| M10 | Kapsam v1: giriş, Ana sayfa, Recap, Journey, Taste, Mood listeleri (Spotify'a gönderme dahil), Playlistler, ZIP yükleme, Ayarlar. AI yok (portfolyöde web AI'ı isteğe bağlı kalır, mobil AI çağırmaz) | Web'in kanıtlanmış yüzeyleri | Sosyal, keşif, mesaj (kalıcı yasak) |
| M11 | **iOS bizim hedefimiz değil** (Sahip, 2026-10-23): ücretli Apple hesabı yok, iOS build/test/dağıtım yapmayız. Kod Expo olduğu için iOS'ta derlenebilir kalır; kendi Mac'i veya ücretli hesabı olan geliştirici kendisi derler. Diğerleri için web'in ana ekrana eklenen sürümü (PWA, PLAN 2.3) | Sıfır maliyet; emek Android'e | İmzasız IPA + SideStore (bakımı ağır, ara sıra bozulur) |
| M12 | Bağımlılıklar (başka kütüphane eklemek L3 kararı): `expo-router`, `react-native-reanimated` 4 + `react-native-worklets`, `react-native-gesture-handler`, `@shopify/flash-list`, `expo-image`, `expo-haptics`, `expo-blur`, `expo-linear-gradient`, `expo-font`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `expo-document-picker`, `expo-file-system`, `expo-web-browser`, `expo-linking`, `react-native-safe-area-context`, `react-native-screens`, `@supabase/supabase-js`, `@tanstack/react-query` + persister. Test: `jest-expo`, `@testing-library/react-native`, Maestro (E2E). Sheet ve sekme çubuğu kendi bileşenimiz | Hız ve hareket kontrolü bizde; sürüm uyumsuzluğu riski az | Hazır sheet/UI kitleri (Reanimated 4 uyumu belirsiz, Rosso kimliği zor) |
| M13 | Önce önbellek: react-query kalıcı önbellek (AsyncStorage), ilk kare önbellekten, arkadan yenileme; ekran odaklanınca ve uygulama öne gelince yenile | "Anında" vaadi (spec §1) ve çevrimdışı açılış | Her açılışta ağ bekleyen ekranlar |
| M14 | (2026-10-31, L3) **Expo SDK 58** (58.0.21, 2026-09-29'dan beri kararlı; RN 0.88, React 19.3, TS 6). M12'ye eklenenler: `expo-network` (çevrimdışı şeridi, react-query çevrimiçi durumu), `expo-splash-screen` (yerel açılış ekranı; kök `splash` alanı SDK 58'de yalnız web için), `expo-constants`, `expo-system-ui`, `@expo-google-fonts/{geist,geist-mono,bodoni-moda}` (fontlar `expo-font` eklentisiyle derlemeye gömülü, çalışma anında yükleme yok), `react-dom` (expo-router web bağımlılığının eş sürümü), `@tanstack/query-async-storage-persister`. Oturum SecureStore'da parçalı (`guvenliDepo`), AsyncStorage'a token yazılmaz | Güncel kararlı SDK; ek kütüphane yok, hepsi Expo'nun kendi paketleri | SDK 57'de kalmak (SDK 58 30 yama aldı) |

## Açık riskler

- Spotify Development Mode: uygulama başına 5 kullanıcı + geliştirici Premium (2026-02). Her kurulumun kendi app'i olduğu için sorun değil; README'de açıkça yazılmalı.
- Android'de blur pahalı: spec §3 yedeği (yarı saydam yüzey) ölçüme göre devreye girer.
- Reanimated 4 / Expo SDK uyumu: SDK 56'da Reanimated bellek sorunu vardı (57'de çözüldü); iskelet kurulurken sürüm üçlüsü (Expo, RN, Reanimated) resmi uyum tablosundan seçilir.
- Web API'lerinin çerezle çalışanlarının Bearer desteği (M5) bir güvenlik değişikliğidir: L3 tasarlar, testle kilitlenir.
