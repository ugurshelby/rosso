# Rosso Mobil — Kaynaklar ve Referanslar

> Derlendi: 2026-10-22 (Opus). Sürüm numaraları hızlı eskir: her fazın başında resmi sayfadan **yeniden doğrula**.
> Karar belgesi: [`mimari.md`](mimari.md). Plan: kök [`PLAN.md`](../../PLAN.md) Faz 4.

## 1. Çekirdek: Expo + React Native (iOS + Android tek kod)

| Konu | Kaynak | Not |
|---|---|---|
| SDK sürümleri | [Expo changelog](https://expo.dev/changelog) · [SDK 56 notları](https://expo.dev/changelog/sdk-56) | SDK 56 (RN 0.85, React 19.2, Hermes v1 varsayılan). SDK 56'da Reanimated/worklets bellek sorunu var, 57'de çözüldü; 58 beta. **Başlangıçta en güncel kararlı SDK** seçilir. |
| SDK yükseltme | [Upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) | Her SDK sıçramasında bu sayfa. |
| Development build | [Dev builds](https://docs.expo.dev/develop/development-builds/introduction/) | Expo Go değil, dev build: yerel modüller (secure store, document picker) için şart. |
| Yönlendirme | [Expo Router](https://docs.expo.dev/router/introduction/) | Dosya tabanlı rota + derin bağlantı. SDK 56'dan beri React Navigation'a bağımlı değil (codemod var). |
| Bulut build | [EAS Build](https://docs.expo.dev/build/introduction/) · [EAS Submit](https://docs.expo.dev/submit/introduction/) · [EAS Update](https://docs.expo.dev/eas-update/introduction/) | Android APK/AAB ve iOS build makinesiz. EAS Update yalnız JS taşır; `runtimeVersion` uyuşmazsa yeni binary gerekir. |
| Yerel arayüz | [Expo UI (SwiftUI/Compose) — kararlı](https://expo.dev/blog/expo-ui-stable-sdk-56) | Gerektiğinde gerçek yerel bileşen (ör. iOS menü, Android sheet). |
| Widget | [iOS widget + Live Activities](https://expo.dev/blog/ios-widgets-and-live-activities-in-expo) | İleri faz: "bugünün şarkısı" widget'ı. |
| React Native | [reactnative.dev](https://reactnative.dev/docs/getting-started) | Yeni mimari varsayılan. |

## 2. Veri ve kimlik: kullanıcının kendi Supabase'i

| Konu | Kaynak | Not |
|---|---|---|
| Expo + Supabase | [Expo React Native kullanıcı uygulaması](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) · [RN auth yazısı](https://supabase.com/blog/react-native-authentication) | Oturum AsyncStorage'da; şifreleme anahtarı SecureStore'da (boyut sınırı yüzünden bölünmüş desen). |
| Derin bağlantı | [Native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) | `rosso://**` yönlendirmesi Supabase Auth URL ayarlarına eklenir; e-posta doğrulama derin bağlantı ister. |
| Güvenli depo | [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) | Anahtar/oturum parçası. Anon key gizli değildir ama yine de koddan değil config'den gelir. |
| ZIP seçme/yükleme | [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/document-picker/) · [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) | SDK 56'da yükleme/indirme görev API'si ve ilerleme bildirimi var: büyük Spotify ZIP'i için. |

## 3. Spotify (BYOC — herkes kendi geliştirici uygulaması)

| Konu | Kaynak | Not |
|---|---|---|
| Yönlendirme kuralları | [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri) | HTTPS zorunlu; yalnız loopback (`http://127.0.0.1:PORT`) için HTTP. `localhost` yasak. |
| Güvenlik değişikliği | [2025-02 güvenlik gereksinimleri](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify) | Implicit grant kalktı; açık (public) istemci PKCE kullanır. |
| Erişim politikası | [2026-02 geliştirici erişimi güncellemesi](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security) | Development Mode: **uygulama başına 5 kullanıcı, geliştiricinin Premium olması şart.** Extended Quota şirket + 250 bin MAU ister. Rosso'nun BYOC modeli bu yüzden doğru: herkes kendi app'i. |
| Mobil karar | — | v1'de Spotify bağlantısı **web'in BYOC sihirbazında** yapılır (uygulama içi tarayıcı). Token'lar sunucuda (`platform_connections`) kalır; mobil Spotify sırrı taşımaz. |

## 4. Tasarım ve hareket

| Konu | Kaynak | Not |
|---|---|---|
| iOS | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/) | Gezinme, sheet, haptik, Dynamic Type. |
| Android | [Material 3](https://m3.material.io/) | Geri hareketi, edge-to-edge, tipografi ölçeği. |
| Rosso dili | `docs/design/rosso-kimligi/`, `docs/vision/uygulamali-vizyon.md`, skill'ler `apple-design`, `spotify-design-language` | Koyu tema kalıcı, Deep Violet; hikâye dili. |
| Animasyon | [Reanimated](https://docs.swmansion.com/react-native-reanimated/) · [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) | Yay (spring) tabanlı, kesilebilir hareket. |
| Uzun liste | [FlashList](https://shopify.github.io/flash-list/) | Geçmiş, playlist parçaları. |
| Görsel | [expo-image](https://docs.expo.dev/versions/latest/sdk/image/) | Önbellekli kapaklar. |

## 5. Dağıtım (kendi telefonuna ve geliştiricilere)

| Yol | Koşul |
|---|---|
| Android | EAS ile APK (yan yükleme) ya da AAB (Play). Ücretsiz katman yeter. Play yayını için [hedef API kuralı](https://developer.android.com/google/play/requirements/target-sdk). |
| iOS, ücretsiz | Xcode "Personal Team": **kurulum ~7 günde düşer**, en çok 3 cihaz, TestFlight yok ([Apple forum, DTS yanıtı](https://developer.apple.com/forums/thread/761325)). |
| iOS, kalıcı | Apple Developer Program (yıllık ücretli) → TestFlight / App Store. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/). **Sahip kararı (para).** |

## 6. Kendi arşivimiz (yalnız ders için, kod taşınmaz)

- `_arsiv/mobil-son/` (gitignore'lu): Expo 54 / RN 0.81 dönemi sosyal sürüm. Yararlı: `eas.json`, `EAS-ENV.md`, `APK-NASIL-ALINIR.md` (EAS hesabı `ugurshelby`, 2026-08-06 başarılı APK). Sosyal ekranlar ve eski API çağrıları **alınmaz**.
- Web'de mobil için yazılmış API rotaları duruyor; Faz 4.2'de envanteri çıkarılır.
