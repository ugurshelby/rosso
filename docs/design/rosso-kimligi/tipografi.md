# Rosso Tipografi Sistemi — Tek Otorite

> **Bu doküman projedeki TEK tipografi referansıdır.** Font eklemek, çıkarmak
> veya bir yüzeyin font kararını değiştirmek isteyen herkes (insan veya agent)
> önce burayı okur, değişikliği önce buraya işler.
>
> Kod otoritesi: `web/src/app/layout.tsx` (yükleme) + `web/src/app/globals.css` (token).
> Karar sahibi: Sahip (2026-07-18). Uygulama: FAZ TYPO.
>
> İlgili: [`cinematic-fonts-reference.md`](#havuz-b--sinematik--display-font-koleksiyonu) ·
> [`best-font-pairings.md`](#havuz-a--font-eslesmeleri-display--govde-ikilileri) ·
> `font-onizleme.html` (bağımsız deneme sayfası)

---

## 1. Felsefe — İki Karakter, Tek Marka

Rosso iki farklı karakter taşır:

1. **Veri odaklı müzik platformu** — istatistik, analitik, arşiv. Soğukkanlı,
   yoğun, hassas. (stats.fm damarı)
2. **Sosyal + hikâye anlatımı** — keşfet, mesajlar, story recap, journey.
   Sıcak, insani, sinematik.

Bu iki dünyanın tipografik dili **ayrışır** ama ürün tek marka gibi hisseder.
Ayrışmayı sağlayan şey display fontlarıdır; birliği sağlayan şey her yüzeyde
aynı olan UI iskeletidir (Geist + Geist Mono).

```
                    ┌─ İSKELET (her yerde aynı) ─────────────┐
                    │  Geist        → tüm UI metni            │
                    │  Geist Mono   → tüm teknik veri          │
                    └──────────────────────────────────────────┘
   ┌────────────────┬────────────────┬───────────────┬──────────────────┐
   │ MÜZİK ANALİTİK │ SOSYAL         │ STORY RECAP   │ JOURNEY          │
   │ Bebas Neue     │ Barlow         │ Archivo Black │ Bodoni Moda It.  │
   │                │ Semi Condensed │ (+ marketing) │ + Barlow SC 900  │
   └────────────────┴────────────────┴───────────────┴──────────────────┘
```

---

## 2. Font Aileleri ve Token'lar

| Font | CSS token | Tailwind | Ağırlıklar | Rol |
|---|---|---|---|---|
| **Geist** | `--font-geist-sans` → `--font-sans` | `font-sans` | değişken | Ana UI fontu |
| **Geist Mono** | `--font-geist-mono` → `--font-mono` | `font-mono` | değişken | Teknik veri |
| **Bebas Neue** | `--font-analytics` | `font-analytics` | 400 (tek kesim) | Müzik analitik display |
| **Barlow Semi Condensed** | `--font-social` | `font-social` | 400·500·600·700·900 | Sosyal katman + Journey kalın sans |
| **Archivo Black** | `--font-display` | `font-display` | 400 (tek kesim, ≈Black) | Story Recap + marketing display |
| **Bodoni Moda** | `--font-journey-serif` | `font-journey-serif` | değişken, **yalnız italic** | Journey serif'i |

Ek alias: `--font-journey-sans: var(--font-social)` — Journey'nin kalın sans'ı
Barlow ailesinden gelir (900), ayrı dosya yüklenmez.

**Teknik güvenlik ağı:** `globals.css` `body`'de `font-synthesis-weight: none`
— tek kesimli fontlar (Bebas, Archivo Black) sahte-kalınlaştırılamaz. Tek
kesimli display fontlarını CSS'te **`font-weight: 400`** ile çağır.

**Yükleme disiplini** (`layout.tsx`): tüm fontlar `next/font/google` üzerinden,
`latin` + `latin-ext` (Türkçe ğ/ş/İ) subset'iyle. Bodoni Moda `preload: false`
— yalnız Journey'de görünür, dashboard LCP bütçesini yemez.

---

## 3. Aile Aile Kararlar

### 3.1 Geist — UI İskeleti

**Neden:** Nötr, modern, ekran için çizilmiş bir grotesk; Vercel ekosistemiyle
sorunsuz. Kişiliği düşük — bu bir kusur değil görevidir: display fontlarının
nefes alacağı sessiz zemin.

**Kullanım:** Genel arayüz, dashboard gövdesi, formlar, butonlar, gövde
metinleri, ayarlar, navigasyon, başlık dahil tüm "sistem" metinleri.
`body` varsayılanı budur; **font belirtmeyen her şey Geist'tir.**

**Kullanma:** Hero/display rolünde (orada katmanın display fontu konuşur).

### 3.2 Geist Mono — Teknik Ses

**Neden:** Sayı hizası (tabular), "hassas cihaz" hissi. Müzik platformunun
Hi-Fi karakterinin mikro-dozu.

**Kullanım:** Tarihler, süreler (`3:42`), sayaçlar, ISRC/metadata, eyebrow
etiketleri, küçük UPPERCASE etiketler, grafik eksen yazıları.
Daima `font-variant-numeric: tabular-nums` ile.

**Kullanma:** Paragraf/gövde metni, cümle kuran her şey. Mono bir *baharattır*.

### 3.3 Bebas Neue — Müzik Analitik Display'i

**Neden:** Condensed, uppercase, dikey enerjisi yüksek — "veri yoğun müzik
platformu" hissini tek başına kurar. Sayılarda posterimsi bir güç verir.

**Kullanım (yalnız müzik/analitik tarafı):**
- Dashboard büyük sayısal başlıklar (stat bar, zirve saat, CTA hero sayısı)
- Dinleme istatistikleri, analitik kartlar, platform istatistikleri
- **Recap sayfası (liste/arşiv ekranı)** — başlık, yıl başlıkları, kart display'leri
- Taste / Vibe kartı kimlik adı, profildeki müzik istatistiği sayıları
  (keşif skoru, streak, aylık dinleme)
- Katalog detayındaki kişisel istatistik değerleri

**Kullanma:** Story Recap deck'leri, Journey, Keşfet, Mesajlar, sosyal akış,
gövde metni, buton etiketi, uzun başlık cümleleri (caps-only — cümle okutmaz).

**Uygulama notları:** `font-weight: 400` (tek kesim) · letter-spacing hafif
pozitif (0.01–0.06em; asla negatif tracking) · condensed olduğu için eşdeğer
görsel ağırlık üzere puntoyu bir kademe büyüt · `tabular-nums` sayılarda açık.

### 3.4 Barlow Semi Condensed — Sosyal Ses

**Neden:** Yarı-condensed, yuvarlak ama disiplinli; modern sosyal medya
dinamizmi verir, uzun metinde de okunur. Bebas'ın sert plakat sesine karşı
insani bir orta ton.

**Kullanım (sosyal katman):**
- Keşfet (başlık, eşleşme kartı isimleri)
- Mesajlar (sayfa/başlık seviyesi)
- Sosyal profil alanları: profil adı, herkese açık profil adı, sabitlenen
  playlist adı, avatar baş harfleri
- Kullanıcı biyografileri ve topluluk içerikleri büyüdükçe bu aileden devam et

**Kullanma:** Dashboard istatistikleri (orası Bebas/Geist), teknik veri.

**Uygulama notları:** İsim/başlık 600–700 · display vurgusu 900 ·
letter-spacing nötr/−0.01em. Gövde uzarsa 400/500 kullanılabilir.

### 3.5 Archivo Black — Story Recap Display'i

**Neden:** Tek kesimlik, çok siyah, çok kendinden emin bir grotesk —
Spotify Wrapped dilindeki "poster başlık" rolünün doğrudan karşılığı.
Story kartlarının tam-ekran, paylaşılabilir estetiğini taşır.

**Kullanım:**
- **Aylık Recap story deck** (`story-deck.module.css`)
- **Yıllık Recap story deck** (`yearly/yearly-cards.module.css`)
- Story ekranlarındaki dev sayılar, kapak başlıkları, kapanış cümleleri
- ROSSO marka işareti (kart köşe damgası)
- Marketing/blog display başlıkları (landing hero, blog başlıkları,
  status sayfası) — marka vitrini ile paylaşılabilir ürün yüzeyi aynı
  sesle konuşur, tek marka hissi buradan gelir

**Kullanma:** Journey, dashboard analitikleri (orası Bebas), sosyal katman,
gövde metni, buton — *tek kesim olduğu için hiyerarşi kuramaz, yalnız zirvede
konuşur.*

**Uygulama notu:** Tek kesim; eski `font-weight: 700/800/900` bildirimleri
`font-synthesis-weight: none` sayesinde zararsızdır (hep Black kesim render
edilir). Yeni kodda `400` yaz.

### 3.6 Bodoni Moda Italic + Barlow SC 900 — Journey Kimliği

**Neden:** Journey, Rosso'nun imzası — bir rapor değil, kişinin geçmişini
anlatan sinematik bir hikâye. Kimliği: **ince yüksek-kontrast serif italik**
(anlatıcının el yazısı gibi) + **kalın condensed sans** (dönemler, yıllar,
büyük sayılar). Referans his: *"Recoleta + Berthold"* — retro, sinematik,
hafif nostaljik ama teknolojik (bkz. `best-font-pairings.md` §3).

**Kullanım (YALNIZ Journey ekranları):**
- `--font-journey-serif` (Bodoni Moda Italic 700–900): sayfa başlığı, ritüel
  soruları, tamamlanma başlığı, Journey teaser kartı başlığı
- `--font-journey-sans` (Barlow SC 900): yıl rakamları, dev sayılar, tür
  hero'su, dönem başlıkları, milestone soru/butonları

**Kullanma:** Bodoni Moda başka HİÇBİR yüzeyde görünmez — marketing dahil.
Serif sızarsa Journey'nin imza değeri düşer.

**Uygulama notları:** Bodoni daima `font-style: italic` · küçük puntoda
incelir, 1.6rem altına düşürme · fallback zinciri `'Bodoni Moda', Didot,
Georgia, serif`.

---

## 4. Modül Kimlik Kartları

| Modül | Display | İkincil | İskelet | His |
|---|---|---|---|---|
| **Dashboard / Taste / Katalog** | Bebas Neue (sayılar) | — | Geist + Geist Mono | Hi-Fi cihaz, hassas analitik |
| **Recap listesi (arşiv)** | Bebas Neue | — | Geist + Geist Mono | Müzik istatistik arşivi |
| **Story Recap (aylık/yıllık deck)** | Archivo Black | Geist Mono (etiket) | Geist | Wrapped posteri, paylaşılabilir |
| **Journey** | Bodoni Moda Italic | Barlow SC 900 | Geist Mono (etiket) | Retro-sinematik anlatıcı |
| **Sosyal (keşfet/mesajlar/profil)** | Barlow SC 600–700 | Bebas (yalnız müzik istatistiği) | Geist + Geist Mono | Modern, insani, dinamik |
| **Marketing / Blog / Status** | Archivo Black | italik Geist imza kelime | Geist + Geist Mono | Marka vitrini |
| **Settings / Formlar / Onboarding** | — (Geist bold yeter) | — | Geist + Geist Mono | Sessiz sistem |

Sınır durumu kuralı: bir yüzey iki dünyaya da dokunuyorsa (örn. profildeki
dinleme istatistiği), **içerik neyse font odur** — istatistik sayısı Bebas,
kişinin adı Barlow, tarih Geist Mono.

---

## 5. Tipografik Hiyerarşi

Ölçek `globals.css`'te (`--text-xs` … `--text-6xl`, 8pt disiplini). Kat kat:

1. **Display** (yalnız katmanın display fontu): sayfada EN FAZLA bir-iki öğe.
   Bebas/Archivo Black `clamp()` ile 2–6rem bandında, line-height ≤ 1.
2. **Başlık** (Geist 600–700 / sosyal katmanda Barlow 600–700): `--text-xl`
   – `--text-3xl`, `--tracking-tight`.
3. **Gövde** (Geist 400–500): `--text-sm`/`--text-base`, satır 1.5–1.65,
   maksimum ~75 karakter genişlik.
4. **Etiket/eyebrow** (Geist Mono 400–700): `--text-xs`, UPPERCASE,
   letter-spacing 0.1–0.4em, `--color-text-tertiary`.
5. **Buton** (Geist 500–600; Journey CTA'ları Barlow 900): optik merkez,
   kilitli line-height.

Sayı gösteren her şeyde `font-variant-numeric: tabular-nums`.

---

## 6. Pairing Kararları (neden bu ikililer çalışıyor)

- **Bebas + Geist Mono:** ikisi de "ölçüm cihazı" ailesinden — dev sayı +
  mikro etiket, stats.fm/HUD hissi. Dashboard'un imza ikilisi.
- **Archivo Black + Geist Mono etiket:** poster başlık + teknik köşe damgası;
  story kartlarının Swiss/brutalist dengesi.
- **Bodoni Italic + Barlow 900:** ince serif × kalın sans — `best-font-pairings.md`
  §3'teki "Recoleta + Berthold" örüntüsünün ürünleşmiş hali. Yalnız Journey.
- **Barlow + Geist:** yarı-condensed karakter + nötr iskelet; sosyal kartlarda
  isim öne çıkar, arayüz geride kalır.

Ortak örüntü (`best-font-pairings.md` "Genel Örüntü"): eşit ağırlıkta iki ses
asla yan yana gelmez — biri kimlik, biri iskelet.

---

## 7. Kullanılmayan / Reddedilen Fontlar

| Font | Karar | Gerekçe |
|---|---|---|
| **Bodoni Moda (italic dışı / Journey dışı)** | ❌ Yasak | Serif imzası yalnız Journey'nin; sızarsa ayrışma ölür |
| **Caprasimo** | ❌ Hiçbir yerde | Oyuncu/yumuşak display karakteri Rosso'nun iki dünyasına da ait değil (önizlemede denendi, elendi) |
| **Corinthia** | ⏸ Şimdilik yok | Script/kaligrafik — mevcut ürün yüzeyinde yeri yok; ileride editoryal kampanya / sanatsal landing için değerlendirilebilir |
| **Archivo (çok ağırlıklı aile)** | 🗑 Kaldırıldı (2026-07-18) | 5 ağırlık yükleniyordu; display rolünü tek kesimlik Archivo Black devraldı |
| **Hanken Grotesk** | 🗑 Kaldırıldı (2026-07-18) | `--font-body` olarak yükleniyordu ama src'de sıfır gerçek kullanım vardı |
| **Fraunces** | 🗑 Kaldırıldı (2026-07-18) | "Anlatı serifi" rolü Journey'de Bodoni Moda'ya, recap listesinde Bebas'a devredildi |
| **Instrument Serif** | 🗑 Daha önce kaldırıldı (2026-07-17) | Çok ince/narin kaldı |
| **Bangers / Montserrat / JetBrains Mono** | 🗑 Kaldırıldı (2026-07-18 gece, B2.1) | Ölü galeri bileşenleri / sıfır kullanım |
| **Inter** | ❌ Kullanma | Tasarım skill'lerinde "banned" — Geist zaten bu rolü dolduruyor |

## 8. Gelecek İçin Alternatif Havuzu

Bir katmanın sesi eskirse önce bunlara bak (yeni aile eklemek = performans
maliyeti; önce mevcut altı ailenin sınırlarını zorla):

- **Analitik display alternatifi:** Anton, Oswald (Bebas'tan daha yumuşak),
  Archivo Expanded (marka ailesinde kalır)
- **Sosyal alternatifi:** Barlow Condensed (daha sıkı), IBM Plex Sans Condensed
- **Journey serif alternatifi:** Playfair Display Italic, Fraunces Italic
  (geri dönüş adayı), `cinematic-fonts-reference.md`'deki ticari kesimler
  (Romens Dawn, Perfectly Nineties — bütçe çıkarsa)
- **Editoryal/kampanya (Corinthia'nın rakipleri):** Tempting, Citadel Script
  (bkz. `best-font-pairings.md` §2/§6)

## 9. Değişiklik Protokolü

1. Yeni font ihtiyacı → önce §8 havuzuna ve mevcut ailelerin kullanılmayan
   ağırlıklarına bak.
2. Değişiklik kararı → önce bu dokümanı güncelle, sonra `layout.tsx` +
   `globals.css`, sonra modül CSS'leri.
3. Her display fontu için "Kullanma" listesi yaz — sızma tek kural ihlalidir.
4. Yükleme eklerken: subset `latin` + `latin-ext`; kritik-olmayan yüzey fontu
   `preload: false`; tek kesimli fontta `font-weight: 400`.
5. Doğrulama: `npm run build` + gerçek sayfada Türkçe karakter kontrolü
   (İ/ı/ş/ğ — özellikle Bebas gibi caps-only kesimlerde).


---

# EK — SEÇENEK HAVUZU (bağlayıcı DEĞİL)

> Yukarısı Rosso'nun **kararı**: hangi font nerede kullanılır, bağlayıcıdır.
> Aşağısı **havuz**: yeni bir font/eşleşme gerektiğinde buradan seçilir.
> 2026-07-20'de ayrı iki dosyadan buraya taşındı (Sahip: *"ikisi seçenek
> sunmak için, biri Rosso'nun tipografisi için — bunlar bile zaten
> birleştirilebilir"*). Orijinaller `archive/tasarim/`'de.

## Havuz A — Font eşleşmeleri (display + gövde ikilileri)

> Altı font ikilisinin görsel karakteri ve kullanım context'i. `typography/cinematic-fonts-reference.md` tekil display fontları ele alıyordu; bu döküman **ikili eşleşmelere** (display + destek/gövde fontu) odaklanıyor — bir başlık fontunu neyle eşleştireceğine karar verirken referans alınacak.

---

## 1. Open Sauce + Peace Sans
**Karakter:** İki yuvarlak-köşeli, kalın geometrik grotesk'in üst üste bindirilmesi — "Open Sauce" ince/orta ağırlık, "Peace Sans" aşırı kalın ve şişkin (bubble-like) formda. İkisi de aynı yuvarlak-köşe ailesinden olduğu için çelişmiyor, sadece ağırlık kontrastı yaratıyor.
**His:** Sıcak, oyuncu ama modern; kurumsal değil — bir teknoloji/lifestyle markasının "insan dostu" tarafını gösteriyor.
**Kullanım:** Uygulama içi onboarding başlıkları, topluluk/sosyal ürün hero'ları. FinPilot'un sıcak yönü veya Rosso'nun samimi/topluluk hissi gereken bölümlerinde düşünülebilir.

## 2. Inter + Tempting
**Karakter:** Nötr, işlevsel bir sans-serif (Inter) ile akışkan, el yazısı tarzı bir script/cursive (Tempting) eşleşmesi. Zıtlık büyük: biri tamamen "arka planda kalan" bir UI fontu, diğeri imza/dekoratif bir vurgu.
**His:** Doğal, ferah, "yaşam tarzı" — script kelime bir duygu/marka imzası gibi öne çıkıyor, geri kalan her şey Inter'in sessizliğinde kalıyor.
**Kullanım:** Bir kelimeyi/ismi vurgulamak için (örn. "Rosso**'nun** sesi" gibi bir cümlede tek kelimeyi script yapmak). Not: `tasarim-skilleri-rehberi.md`'deki birçok skill Inter'i "banned" ilan ediyor — bu eşleşme Inter'in **nötr/destekleyici** rolde kullanıldığı nadir meşru bağlamlardan biri, çünkü öne çıkan asıl karakter script font.

## 3. Recoletta + Berthold
**Karakter:** İnce, zarif bir serif (Recoletta) ile aşırı kalın, yuvarlak bir display sans (Berthold) — tam bir ağırlık ve stil kontrastı. Serif küçük/üstte "etiket" gibi, sans büyük/altta "gövde" gibi konumlanmış.
**His:** Retro-teknolojik, biraz nostaljik-dijital (CRT ekran görselinin de gösterdiği gibi) — 80'ler bilgisayar estetiğiyle günümüz editorial zarafetinin karışımı.
**Kullanım:** Bir ürünün "geçmiş-gelecek" gerilimini anlatan marka hikayelerinde; `cinematic-fonts-reference.md`'deki Romens Dawn / Perfectly Nineties gibi retro-serif fontlarla aynı ruh ailesi — Obsession'ın vintage otomotiv markalarında kullanılabilir.

## 4. Proxima Nova (Condensed) + Sailors
**Karakter:** İnce/orta ağırlıkta condensed bir grotesk (Proxima Nova) ile aşırı kalın, geniş bir display sans (Sailors) — küçük etiket + büyük gövde ilişkisi burada da tekrarlanıyor, ama Recoletta/Berthold'dan farklı olarak ikisi de sans-serif ailesinden, bu yüzden daha "temiz/teknik" bir his veriyor.
**His:** Sağlam, güvenilir, biraz atletik/outdoor — dağ/doğa görselleriyle eşleşmesi tesadüf değil, bu font ikilisi "dayanıklılık" hissi taşıyor.
**Kullanım:** Outdoor/spor/dayanıklılık temalı ürünler; Running Tracker uygulamasının hero/istatistik başlıklarında düşünülebilir.

## 5. Avant Garde Gothic + Cooper BT
**Karakter:** Geometrik, geniş harflere sahip bir grotesk (Avant Garde) ile yuvarlak, kalın bir serif/slab (Cooper BT). Cooper'ın yuvarlak serif detayları Avant Garde'ın keskin geometrisiyle yumuşak bir kontrast oluşturuyor.
**His:** 70'ler retro-modernizm — sıcak ama düzenli, nostaljik ama kaotik değil.
**Kullanım:** Editorial/dergi tarzı içerik başlıklarında; Rosso'nun müzik-kültürü anlatan sayfalarında (70'ler/80'ler müzik nostaljisi teması varsa) doğal bir uyum.

## 6. Citadel Script + Helvetica Now
**Karakter:** Zarif, ince bir script (Citadel) ile tarihin en nötr/işlevsel grotesk'i (Helvetica Now) — en aşırı zıtlık bu ikilide. Script küçük/üstte imza gibi, Helvetica büyük/altta yapısal iskelet gibi duruyor.
**His:** Atletik-lüks — bir spor markasının imza logotype'ı ile kurumsal/işlevsel gövde metninin bir arada var olması. Kayak/kış sporu görseliyle eşleşmesi, "performans + zarafet" mesajını güçlendiriyor.
**Kullanım:** Spor/performans ürünlerinde marka imzası + fonksiyonel UI metni ayrımı; bir spor markası editorial'inde veya Obsession'ın performans-odaklı otomotiv markalarında (Ferrari, Porsche gibi "hız + zarafet" anlatan markalarda) kullanılabilir.

---

## Genel Örüntü: Bu Eşleşmelerin Ortak Mantığı

Altı eşleşmenin **beşinde** aynı yapı tekrarlanıyor: **küçük/ince bir üst eleman (etiket, imza, script) + büyük/kalın bir alt eleman (gövde başlık).** Bu, tesadüfi bir tercih değil — `universal-design-principles.md`'deki Hiyerarşi ilkesiyle (tek odak noktası) doğrudan örtüşüyor: üst eleman bağlam/kimlik veriyor, alt eleman asıl mesajı taşıyor, ikisi asla eşit görsel ağırlıkta olmuyor.

## Hızlı Referans Tablosu

| Eşleşme | Kontrast tipi | En uygun ton |
|---|---|---|
| Open Sauce + Peace Sans | Aynı aile, ağırlık kontrastı | Sıcak, oyuncu, topluluk |
| Inter + Tempting | Nötr sans + script | Doğal, imza vurgusu |
| Recoletta + Berthold | İnce serif + kalın bubble sans | Retro-teknolojik, nostaljik-dijital |
| Proxima Nova + Sailors | Condensed + geniş sans | Sağlam, atletik, güvenilir |
| Avant Garde + Cooper BT | Geometrik sans + yuvarlak slab | 70'ler retro-modernizm |
| Citadel Script + Helvetica Now | Script + nötr grotesk | Atletik-lüks, performans + zarafet |

## Diğer Dökümanlarla İlişki
- `typography/cinematic-fonts-reference.md`'deki tekil display fontları (Romens Dawn, Perfectly Nineties) burada Recoletta/Cooper BT gibi fontlarla aynı "retro-editorial" ailesinde — ikisi birlikte kullanılabilir.
- `tasarim-skilleri-rehberi.md`'deki bazı skiller Inter'i banned ilan ediyor; Inter + Tempting eşleşmesi bu kuralın istisnası olarak not düşüldü (Inter burada nötr destekleyici, öne çıkan script).
- Eşleşme seçerken `60-30-10-renk-kurali.md` mantığıyla paralel düşün: üst eleman (script/etiket) genelde %10 vurgu rolünde, alt eleman (kalın başlık) %30-60 arası ana içerik rolünde.


---

## Havuz B — Sinematik / display font koleksiyonu

> OSHEA'nın "Cinematic Fonts" carousel'inden seçilmiş, editorial/premium projelerde (Obsession, Apex, EVEREST, Mercedes-Benz portfolio) kullanılabilecek display font'ların görsel karakteri ve kullanım context'i.

---

## 1. Brunson
**Kategori:** Extra bold grotesk / sans serif
**Görsel his:** Aşırı kalın, keskin köşeli, agresif ve "loud". Harfler neredeyse birbirine yapışacak kadar sıkı kerning ile diziliyor — bu da tek bir kütle/blok hissi yaratıyor. Rough (pürüzlü kenarlı) ve Regular (keskin kenarlı) iki varyantı var.
**Context / Nerede kullanılır:**
- Dev başlıklar, hero section title'ları
- Film/albüm kapağı tarzı editorial girişler
- Poster estetiğinde landing page'ler
- Apex F1 veya Obsession gibi "brutalist + cinematic" projelerde bölüm başlıkları
**Not:** Çok yoğun bir font olduğu için 1-2 kelimelik kısa başlıklarda en güçlü etkiyi verir; paragraf/gövde metninde kullanılmaz.

---

## 2. Perfectly Nineties
**Kategori:** Nostaljik serif (80'ler-90'lar editorial serif)
**Görsel his:** İnce-kalın kontrastı yüksek, zarif ama karakterli bir serif. "Vintage magazine" hissi veriyor — retro ama günümüze uyarlanmış, sofistike bir sıcaklık taşıyor. Regular + Italic karışımı özellikle güçlü (aynı kelimede regular/italic geçişi mümkün).
**Context / Nerede kullanılır:**
- Editorial/lifestyle projelerde başlıklar (moda, kitap, müzik — Rosso'nun editorial sayfaları için uygun olabilir)
- "Premium ama soğuk değil, sıcak-nostaljik" bir marka sesi istenen yerlerde
- Bir cümle içinde regular/italic karışımıyla vurgu yaratmak (örn. bir kelimeyi italic yaparak duygusal ton eklemek)
**Not:** Display'de tracking'i biraz sıkılaştırmak (-10/-20) daha "authentic" görünüyor; gövde metninde varsayılan spacing zaten okunaklı.

---

## 3. Agharti
**Kategori:** Extra condensed bold grotesk
**Görsel his:** Aşırı dar (condensed) ve kalın — dikey, sıkışmış, endüstriyel bir güç hissi. Küçük harfler büyük harf yüksekliğine kadar çıkıyor, bu da metnin her zaman "dolu" bir blok gibi durmasını sağlıyor.
**Context / Nerede kullanılır:**
- Dar alanlara sığdırılması gereken güçlü başlıklar (mobil hero, dar sidebar başlıkları)
- Logo tipografisi, marka mühürleri
- Modern, teknik/motorsport temalı projelerde (Apex F1 gibi) sayı/istatistik başlıklarıyla iyi eşleşir
- Yüksek yoğunluklu, "sıkışmış güç" hissi istenen kısa etiketler (badge, tag başlıkları)
**Not:** Çok geniş bir aile (49 stil: extra condensed'den extra wide'a) — proje ihtiyacına göre condensed veya wide varyant seçilebilir.

---

## 4. Romens Dawn (Italic)
**Kategori:** Retro serif duo (regular + italic)
**Görsel his:** Akıcı, yumuşak, "cinematic" bir zarafet — italic versiyonu özellikle sinematik jenerik yazıları (film kredileri, dergi kapağı) hatırlatıyor. Yuvarlak ve akışkan formlar, vintage ama abartısız bir seçkinlik taşıyor.
**Context / Nerede kullanılır:**
- Film jeneriği / kredi tarzı başlıklar
- Lüks otomotiv editorial içerikleri (Obsession projesi — Rolls-Royce, Bugatti gibi markaların "hikaye anlatan" başlıklarında)
- Duygusal, kişisel projelerde (The Origin gibi ritüel/anlatı odaklı ürünlerde başlık tipografisi)
- Davetiye, dergi kapağı, imza tarzı büyük başlıklar
**Not:** Italic varyantı regular'dan çok daha "akışkan" duruyor; başlıkta tek başına italic kullanmak güçlü bir sinematik etki yaratıyor.

---

## 5. Staff Wide
**Kategori:** Bold sans-serif (karışık case: büyük+küçük harf bir arada kullanılabilir)
**Görsel his:** Kalın ama Brunson kadar agresif değil — daha "modern editorial" bir denge. Büyük/küçük harf karışımı (Staff / Wide gibi) daha okunaklı ve günlük dile yakın bir sıcaklık katıyor, salt majüskül kullanımına göre daha az "bağırıyor".
**Context / Nerede kullanılır:**
- Genel amaçlı güçlü başlıklar (hem büyük hem küçük harfle rahat okunur)
- Ürün/feature tanıtım başlıkları (SaaS, fintech dashboard hero'ları — FinPilot gibi projelerde ana başlık için düşünülebilir)
- Sosyal medya / kampanya başlıkları
**Not:** Brunson ile karşılaştırıldığında daha "yumuşak güç" — ikisi arasında seçim yaparken hedeflenen agresiflik seviyesine göre karar verilebilir.

---

## Genel Kullanım Rehberi

| Font | Ton | En güçlü kullanım alanı |
|---|---|---|
| Brunson | Agresif, brutal | Poster/hero başlıkları, kısa kelimeler |
| Perfectly Nineties | Nostaljik, sofistike | Editorial serif başlık + italic vurgu |
| Agharti | Endüstriyel, sıkışmış | Dar alan başlıkları, motorsport/teknik |
| Romens Dawn Italic | Sinematik, akışkan | Film jeneriği hissi, lüks/duygusal başlıklar |
| Staff Wide | Dengeli, modern | Genel amaçlı ürün/dashboard başlıkları |

**Eşleştirme önerisi:** Ağır bir display font (Brunson / Agharti) + gövde metninde nötr bir sans (Inter, IBM Plex Mono gibi mevcut projelerde kullanılan fontlar) kontrastı güçlendirir. Romens Dawn / Perfectly Nineties gibi serif'ler ise zaten kendi içlerinde regular/italic kontrastı taşıdığı için ayrı bir gövde fontuna daha az ihtiyaç duyulur.

**Lisans notu:** Yukarıdaki fontların çoğu "personal use only" demo sürümler olarak dağıtılıyor; ticari bir projede (yayınlanacak ürün, satılacak marka) kullanmadan önce ilgili foundry'den (That That Creative, Jen Wagner Co., FLAWLESSANDCO, The Branded Quotes vb.) ticari lisans satın alınması gerekiyor.
