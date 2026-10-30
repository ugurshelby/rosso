# Mobile Katmanı — Tasarım Spesifikasyonu (Android öncelikli)

> **Otorite:** `apple-design` (fizik, hareket, malzeme, cila) + `spotify-design-language` (müzikal ergonomi, veri yoğunluğu) + Android platform davranışı (Material 3: geri hareketi, kenardan kenara, sistem çubukları). Görünüm her zaman Rosso: koyu tema kalıcı, Deep Violet, hikâye dili.
> **Karar:** L3, 2026-10-22/23. Mimari: [`../../mobile/mimari.md`](../../mobile/mimari.md). Plan: kök `PLAN.md` Faz 4.
> **Hedef cihaz:** Sahibin Android telefonu. iOS aynı koddan derlenebilir ama bizim test ve dağıtım hedefimiz değildir (portfolyöde kendi kurulum notu).

## §1 His ve rol

Rosso mobil, cebe giren bir **müzik hafızası**dır: açtığında anında son hâlini gösterir, parmağa yapışık hareket eder, hiçbir yerde beklemez. Web'in kopyası değildir; aynı hikâyeyi telefonun fiziğiyle anlatır.

Üç vaat (her ekranın kabul ölçütü):
1. **Anında:** önbellekteki son veri ilk karede çizilir, yenisi arkadan gelir. Boş beyaz ekran ve tam ekran yükleme göstergesi YOK.
2. **Akışkan:** her hareket kesilebilir, parmak hızını devralır, yay ile oturur. Sabit süreli, kilitleyen geçiş YOK.
3. **Sessiz arayüz, konuşan müzik:** krom geri çekilir; renk kapaklardan ve tür renginden gelir.

## §2 Navigasyon mimarisi

- **Alt sekme çubuğu, 5 sekme (web'in sırası):** Ana Sayfa · Listeler · Taste · Recap · Geçmiş. Etiket her zaman görünür; ikon + metin.
- Sekme çubuğu **özel bileşen** (expo-router `Tabs` + kendi `tabBar`): Rosso camı ve Deep Violet aktif göstergesi; `unstable-native-tabs` kullanılmaz (SDK 57'de kararsız, marka kontrolü az).
- **Journey**, Recap sekmesinin başlığından açılır; tam ekran sinematik akış (§9.4). **Ayarlar** ve **Veri/ZIP**, Ana Sayfa'daki avatar düğmesinden açılan yığın (stack) ekranlarıdır.
- **Geri:** Android sistem geri hareketi her yerde çalışır; **predictive back açık** (`android.predictiveBackGestureEnabled: true`). Sheet açıksa önce sheet kapanır.
- **Derin bağlantı:** `rosso://` + Supabase e-posta doğrulama dönüşü; `rosso://recap/<donem>`, `rosso://mood/<anahtar>` paylaşılabilir.
- Wayfinding (Apple §16): her ekran "neredeyim, nereye gidebilirim, nasıl çıkarım" sorusunu cevaplar; büyük başlık (§4) kaydırınca küçük başlığa dönüşür.

## §3 Yüzey, renk ve malzeme

- **Token kaynağı tek:** web `src/app/globals.css` (`--bg`, `--elev-0..3`, `--edge-1..3`, `--text`, `--muted`, `--faint`, `--accent`, `--accent-hover`, durum renkleri). Ortak paket bunları **derleme anında** hex'e çevirir (RN `oklch` okumaz). Mobilde elle hex yazılmaz.
- **Katmanlar (Spotify 3 kademe, Rosso tonunda):** zemin `elev-0` → kart `elev-1` → kontrol/basılı `elev-2` → yükseltilmiş sheet `elev-3`. Gölge yalnız kapaklarda (`0 8 24 rgba(0,0,0,0.5)` karşılığı `elevation`); butonda, çubukta gölge YOK.
- **Cam:** yalnız iki yerde: sekme çubuğu ve kaydırınca beliren üst çubuk. Android'de blur pahalıdır: `expo-blur` ile denenir, **ölçülen kare kaybı varsa** yarı saydam `elev-1` + üst kenarda 1 px ışık çizgisi (`rgba(255,255,255,0.08-0.12)`) yedeğine düşer. Cam üstüne cam YOK.
- **Renk disiplini:** birincil eylem Deep Violet (`--accent`), basılı `--accent-hover`; Spotify yeşili yalnız "Spotify'da aç / Spotify'a gönder" ve resmi Spotify işaretinde. Ekran rengi kapaktan veya `getDominantGenreColor` tür renginden gelir: üst bölgede kapak renginden zemine akan **koyu gradyan** (`expo-linear-gradient`, en çok %35 opaklık).
- Kontrast: gövde ≥ 4.5:1, büyük metin ≥ 3:1 (TalkBack ve güneş altında okuma).

## §4 Tipografi

- Font: **Geist** (UI) + **Geist Mono** (rakam/etiket), uygulamaya gömülü (`expo-font`). Journey anlatısı: **Bodoni Moda Italic**, yalnız Journey'de.
- Ölçek (sp, sistem yazı boyutu ayarına uyar, `maxFontSizeMultiplier` 1.3):

| Rol | Boyut / satır | Ağırlık | Tracking |
|---|---|---|---|
| Büyük başlık (ekran) | 32 / 36 | 700 | -0.6 |
| Bölüm başlığı | 22 / 28 | 700 | -0.3 |
| Varlık adı (kart, liste başlığı) | 17 / 22 | 600 | -0.2 |
| Gövde / şarkı adı | 15 / 20 | 500 | 0 |
| Üst veri (sanatçı, süre) | 13 / 18 | 400 | 0 |
| Etiket / indeks (mono) | 11 / 14 | 500 | +0.6 |

- Rakamlar `tabular-nums` (süre, sayaç, sıra). Büyük harf yalnız mono etiketlerde.

## §5 Ölçü, boşluk ve şekil

- **4 pt ızgara** (`4, 8, 12, 16, 20, 24, 32, 40, 48`). Kenar boşluğu 16; bölümler arası 32.
- **Dokunma hedefi ≥ 48 dp** (görünür ikon daha küçük olsa bile `hitSlop`).
- Şekil doktrini: buton/hap/arama **tam pil**; kart **8**; kapak **6** (liste satırında **4**); sanatçı **daire**; sheet üst köşeleri **24**. Ara değer YOK.
- Kenardan kenara: içerik sistem çubuklarının altına uzanır; `react-native-safe-area-context` ile üst/alt boşluk, alt sekme çubuğu gezinme çubuğunun üstünde.

## §6 Hareket (Reanimated 4)

Kural: **her etkileşim yay**, her animasyon **mevcut değerden** başlar, parmak hızını devralır, kesilebilir (Apple §1-§6). Yalnız `transform` ve `opacity` (UI iş parçacığında).

| Durum | Yay (Reanimated) | Not |
|---|---|---|
| Varsayılan geçiş (açıl/kapan, sekme göstergesi) | `damping 1.0` karşılığı, response ~0.35 s (`withSpring`, `dampingRatio: 1, duration: 350`) | Sıçrama yok |
| Sheet / çekmece bırakma | `dampingRatio 0.85`, response 0.3 s, **bırakma hızı** verilir | Momentum projeksiyonu ile hedef (Apple §6, `d = 0.998`) |
| Fırlatılan kart / sayfa | `dampingRatio 0.8` | Yalnız jest momentumla bittiyse |
| Basma geri bildirimi | parmak inince `scale 0.97` ~80 ms, kalkınca yayla 1 | Dokunur dokunmaz (onPressIn) |
| Liste öğesi belirmesi | yalnız ilk açılışta, opacity + 8 dp yukarıdan, öğe başı 30 ms gecikme, en çok 8 öğe | Kaydırmada animasyon YOK |

- **Paylaşılan geçiş:** kapak → detay ekranında kapak yerinden büyüyerek başlığa oturur (Reanimated shared element; kararsızsa kapak konumundan ölçekleme ile taklit). Dönüşte aynı yoldan geri.
- **Sınırda lastik bant** (Apple §9): sheet ve yatay şeritlerde sert durma yok.
- **Azaltılmış hareket** (`AccessibilityInfo.isReduceMotionEnabled`): yaylar yerine 150 ms opaklık geçişi; paralaks ve sıçrama kapanır.

## §7 Jestler

- Hepsi `react-native-gesture-handler`; jest ve animasyon UI iş parçacığında (JS'e dönmeden).
- **Şarkı satırı:** dokun → Spotify'da aç (uygulama yüklüyse doğrudan); **sola kaydır** → mood listesinden çıkar (ilk 10 dp eşikten sonra 1:1 iz, eşik geçince hafif titreşim, geri alınabilir "Geri al" çubuğu 5 sn); uzun bas → bağlam sheet'i (Spotify'da aç, listeden çıkar, uygunluk etiketi).
- **Sheet:** tutamaçtan veya içerik en üstteyken aşağı çek → kapanır; hız eşiği + projeksiyonla karar (konum değil hız yönü, Apple Quick Ref).
- **Yenile:** Ana Sayfa ve Geçmiş'te aşağı çek-yenile; diğer ekranlar arka planda kendiliğinden tazelenir.
- Çift dokunma yok (tek dokunma gecikmesin).

## §8 Dokunsal geri bildirim (`expo-haptics`)

Yalnız anlamlı anlarda (Apple §13 fayda kuralı): kaydırma eşiği geçildi (selection), listeye/Spotify'a gönderme başarılı (success), hata (error), sheet bir tutma noktasına oturdu (light). Sekme değiştirme ve her dokunuşta titreşim YOK. Görsel, ses ve titreşim aynı karede.

## §9 Ekranlar

### 9.1 Ana Sayfa
Büyük başlık "Bugün" + avatar. Üstte **son dinlenen** şeridi (yatay kapak rayı, 140 dp kapak). Sonra: bu haftanın serisi, şu anki mood önerisi (tek büyük kart, tür rengi gradyanı), ayın en çokları (5'li liste). Veri yoksa: Quick Start kartı (ZIP yükle / Spotify'ı bağla), demo persona önizlemesiyle (web'deki kilit mantığı).

### 9.2 Listeler
Üstte hap filtreleri (Mood · Otomatik · Kaydedilen). **Mood:** 2 sütunlu kapak ızgarası; her kartta Spotify'a gönderildiyse küçük durum işareti. **Durum her açılışta kaynağıyla doğrulanır** (Spotify'da silinmişse "Spotify'dan kaldırılmış" + "Yeniden gönder"). Detay: büyük kapak + başlık, "Spotify'a gönder" (yeşil, tek yer), şarkı listesi (§9.6 satır).

### 9.3 Taste
Kimlik plakası (vibe kartı görseli tam genişlik, kimlik kelimesi büyük), altında Şu An / Değişmeyenler iki bölüm; tür DNA'sı yatay çubuklar; kronotip ısı haritası 7×24 küçük hücre (dokununca saat detayı sheet'i). Analiz jargonu YOK (uygulamali-vizyon.md).

### 9.4 Recap ve Journey (anlatı katmanı — `recap-journey-design.md` geçerli)
- **Recap listesi:** dönem kartları (yıl büyük, aylar küçük), Dashboard dili.
- **Recap hikâyesi:** tam ekran, **yatay sayfalı hikâye**; üstte ilerleme çizgileri, sağ yarıya dokun ileri / sol yarıya geri, basılı tut duraklat, aşağı çek kapat. Kartlar web'deki story destesinin mobil eşi.
- **Journey:** tam ekran **dikey** akış, yıl başına bir bölüm; Bodoni Moda Italic yalnız burada; kapak takımyıldızı ve yılın üçlüsü (şarkı · sanatçı · albüm). Algoritmik yorum cümlesi YOK.

### 9.5 Geçmiş
Yoğun şarkı listesi (FlashList), günlere göre yapışkan başlık; üstte dönem hapları (Bugün · 7 gün · 30 gün · Yıl).

### 9.6 Şarkı satırı (Spotify ergonomisi)
Yükseklik 64 dp: 48 dp kapak (yarıçap 4) · başlık (15/500, tek satır, kesilir) + sanatçı (13/400 `--muted`) · sağda süre ya da sayaç (mono). Çalınan/öne çıkan satırda başlık `--accent-hover`. Basılı: `elev-2` zemin.

### 9.7 Ayarlar ve Veri
Liste düzeni (gruplu bölümler). Veri: ZIP yükleme (`expo-document-picker`, ilerleme çubuğu yükleme görevinden gerçek yüzde, sahte yükleme YOK), içe aktarma durumu (worker aşamaları), Spotify bağlantısı (web BYOC sihirbazını uygulama içi tarayıcıda açar). Bu bölüm **Spotify katmanı** kuralıyla (birebir Spotify hissi) çizilir.

## §10 Durumlar

- **Yükleniyor:** önbellek varsa önbellek; yoksa içerik biçiminde sabit yer tutucu blokları (`elev-1`, nabız animasyonu en çok %6 opaklık farkı, azaltılmış harekette sabit). Döner gösterge yalnız buton içinde.
- **Boş:** neden boş + tek eylem (ör. "ZIP yükle").
- **Hata:** satır içi, ne oldu + "Tekrar dene"; ağ yoksa üstte ince "Çevrimdışı — son hâl gösteriliyor" şeridi.
- **Çevrimdışı:** son paketler kalıcı önbellekte (react-query + AsyncStorage persister); okuma ekranlarının hepsi çevrimdışı açılır.

## §11 Performans bütçesi (Sahibin telefonunda ölçülür, ilk build'de taban kaydedilir)

| Ölçü | Hedef |
|---|---|
| Soğuk açılış → önbellekten ilk içerik | ≤ 1.5 sn (ilk kurulumda ≤ 2.5 sn) |
| Sekme değişimi | ≤ 100 ms, kare kaybı yok |
| Liste kaydırma (Geçmiş, 500+ satır) | 60 Hz'de düşen kare yok; 120 Hz'de ≤ %1 |
| Basma geri bildirimi | ≤ 1 kare |
| Görsel | ekrandaki boyuta en yakın varyant (web `sizedUrl` mantığı), `expo-image` bellek + disk önbelleği, bulanık yer tutucu |
| JS iş parçacığı | jest ve animasyon sırasında JS'e iş yok (worklet) |
| APK boyutu | taban ölçülür; +%10 artış gerekçesiz kabul edilmez |

Ölçüm: Android "Profile GPU rendering", Reanimated/RN Perf Monitor, Maestro akışlarında süre. Ölçülmeden "akıcı" denmez.

## §12 Erişilebilirlik

TalkBack etiketleri her ikon düğmede; odak sırası görsel sırayla aynı; sistem yazı boyutu 1.3×'e kadar düzen bozulmaz; azaltılmış hareket (§6); renk tek başına anlam taşımaz (durum işareti + metin).

## §13 Denetim (her ekran bitince, `rosso-frontend` ile)

- [ ] Önbellekten anında çizim; tam ekran yükleme göstergesi yok
- [ ] Her etkileşim yay, mevcut değerden, kesilebilir; bırakma hızı devralınıyor
- [ ] Basma geri bildirimi onPressIn'de
- [ ] Token dışı renk/boyut yok; 4 pt ızgara; şekil doktrini (pil / 8 / 6 / 4 / daire)
- [ ] Spotify yeşili yalnız Spotify eylem/işaretinde; birincil eylem Deep Violet
- [ ] Kenardan kenara + güvenli alanlar; predictive back çalışıyor
- [ ] Dokunma hedefleri ≥ 48 dp; TalkBack etiketleri; 1.3× yazı boyutunda düzen sağlam
- [ ] Azaltılmış hareket yolu var
- [ ] Yükleniyor / boş / hata / çevrimdışı tasarlandı
- [ ] §11 bütçesi telefonda ölçüldü ve kayda geçti
- [ ] Analiz jargonu yok; hikâye dili (TR/EN)
