# PROJECT ROSSO — DESIGN SYSTEM (design.md)

> **AGENT DIRECTIVE — YARDIMCI REFERANS:**
>
> Bu doküman, Project Rosso'nun **Rosso'ya özgü** tasarım dili bütünlüğünü özetler.
> **Birincil tasarım otoritesi** `docs/design/` klasörüdür:
>
> | Kaynak | Rol | Ne zaman okunur |
> |---|---|---|
> | `docs/design/foundations/web.md` | Web UX ilkeleri, grid, tipografi | Her web UI değişikliği öncesi |
> | `docs/design/foundations/mobile.md` | Mobile UX, touch ergonomisi | Her mobil değişiklik öncesi |
> | `docs/design/styles/` | Stil detayları (10 stil rehberi) | Spesifik stil seçiminde |
> | `docs/design/tokens/colour-palettes.md` | Token haritası, palet listesi | Renk/token kararında |
> | `docs/design/references/60-30-10-renk-kurali.md` | 60:30:10 + Samurai Jack örnekleri | Renk oranı / squint denetimi |
> | `docs/design/design-techniques/` | Progressive blur + loading states | Görsel-üstü metin / bekleme UX kararında |
> | `docs/design/typography/` | Font eşleşmeleri + cinematic referans | Yeni font/eşleşme kararında |
>
> Not (2026-07-16): `references/images/` klasörü kaldırıldı (görseller silindi).
> `design.md/` klasörü `systems/` + `foundations/` içeriğinin KOPYASIDIR (bkz.
> `docs/design/README.md` "AYNI" tablosu) — tek özgün değeri, Master Design
> System belgesindeki iki-katmanlı token mimarisi (primitive → semantic) ilkesidir;
> Rosso token'ları bu ilkeyle uyumludur (`--rosso-500` primitive, `--color-accent` semantic).
>
> **Bu dosya (`docs/design/rosso-design-system.md`):** Rosso kimliğini, token kanonik değerlerini, Bento
> düzen kararlarını ve projeye özgü istisnaları özetler. `docs/design/` ile çelişirse
> `docs/design/` klasöründeki kaynak doküman önce gelir. Tasarım skill'leri aktifken
> bu dosya **katı kural seti değil, ilham ve bağlam kaynağı**dır.
>
> **Deprecated:** Eski `.claude/design-rules.md` artık referans alınmaz.
> Giriş noktası: `docs/design.md` → bu dosyaya yönlendirir.
>
> **Konsept tek cümlede:** Rosso, bir üst düzey Hi-Fi donanımı / veri laboratuvarı
> ciddiyetinde hissettiren, ama özünde bir **saf Spotify müzik platformu**
> ergonomisinde olduğunu her ekranda belli eden, koyu ve premium bir arayüzdür.
> Hedef: ilk 50 ms'de "lüks" algısı (Halo Etkisi), sıfıra yakın bilişsel yük ve
> erişilebilir, tutarlı bir dil. **Generic "AI slop" arayüzlerden kesinlikle kaçın.**

---

## 0. ÇELİŞKİ ÇÖZÜMÜ & ÖNCELİK SIRASI

### Kullanıcı UI Notlarının Önceliği

> **Kritik kural:** Kullanıcının doğrudan verdiği UI notları bu dosyadaki her kuraldan
> **daha otoritedir**. UI not → codebase'e işlenir → ardından bu dosya notlara göre
> güncellenir. "design.md ne diyor?" sorusu değil, "kullanıcı ne dedi?" sorusu geçerlidir.
>
> Commit `7c86f1b`'deki 6 UI notu bu prensiple işlenmiş ve design.md'ye kanonikleştirilmiştir.

Bu doküman içindeki kurallar arasında bir gerilim hissedersen, aşağıdaki ilkeler
nihai hakemdir. Bunlar projenin "ruhu"dur; tek tek kurallar bunlara hizmet eder:

1. **Netlik > süsleme.** Bir efekt bilgiyi netleştirmiyorsa, kaldırılır.
2. **Tutarlılık > tekil yaratıcılık.** Aynı işi yapan iki bileşen aynı görünür.
3. **Erişilebilirlik pazarlık konusu değildir** (Bölüm 7). Hiçbir estetik karar
   kontrast/dokunmatik hedef minimumlarını ihlal edemez.
4. **8pt ritim her zaman geçerlidir** (Bölüm 4). "Asimetri" ve "organik akış",
   8pt iskeletinden sapmak değil; o ritim *içinde* kompozisyon kurmaktır.

> Önemli ayrım: Eski dokümanlardaki **"Anti-Grid / organik akış"** ifadesi,
> 8pt grid'i terk etmek anlamına **gelmez**. Görünmez **boşluk ritmi** her zaman
> 8pt'dir; "anti-grid" yalnızca *kompozisyonun* tekdüze, eşit kartlı tablolardan
> kaçınıp asimetrik Bento düzenleri kullanması demektir. (Bkz. Bölüm 4.)

---

## 1. VIBE & KONSEPT: MODERN ENDÜSTRİYEL SOFİSTİKE + MÜZİK RUHU

Rosso iki kişiliği aynı anda taşır ve bunları çatıştırmaz:

*   **Veri laboratuvarı / Hi-Fi tarafı:** Otoriter, sakin, koyu. Sayılar ve
    metrikler tabular (monospace) ve net. Yüzeyler ağır ve fiziksel.
*   **Müzik platformu tarafı:** Kapak görselleri (cover art) merkezde, track
    satırları tanıdık Spotify ergonomisiyle sunulur — Rosso saf Spotify'dır,
    başka platform kaynağı görsel olarak temsil edilmez.

### 1.5 ALTI UI KATMANI (2026-09-15 güncellendi — kanonik ayrışma)

Rosso tek marka, ama **altı ayrı yüzey kişiliği** taşır (aşağıdaki tablo web
içindeki 5 yüzeyi listeler; 6.'sı ayrı repo olan `mobile/` — bkz.
[`../katmanlar/mobil-design.md`](../katmanlar/mobil-design.md)). Her katman
aynı 60:30:10 ve 8pt disiplinine uyar; ayrışma **ton + tipografi imzasıyla**
kurulur:

> Tipografi imzaları 2026-07-18'de yeniden yapılandı — otorite:
> [`tipografi.md`](tipografi.md). Aşağıdaki tablo özet.

| Katman | Kapsam | Tipografi imzası | Renk kimliği |
|---|---|---|---|
| **Marketing** | landing, pricing, blog, help | Archivo Black display + italik-Geist tek imza kelime (`.leadEmphasis`) | Gümüş spot + rose/violet/wine dekoratif — "Sinematik Gece" (`landing-design.md` §3), Dashboard'dan kasıtlı ayrı |
| **Dashboard** (çapa) | dashboard, taste, playlists, data, settings | Geist UI + **Bebas Neue** sayısal display + Geist Mono teknik | Deep Violet accent (`--accent: #7C5CFF`), nötr Hi-Fi |
| **Sosyal** | keşfet, mesajlar, profil | **Barlow Semi Condensed** isim/başlık + Geist iskelet | Dashboard paleti |
| **Story Recap** (anlatı) | story deck'ler (aylık/yıllık) | **Archivo Black** poster display + mono etiket | Görsel-ağır kartlar |
| **Journey** (imza) | journey/* | **Bodoni Moda Italic** + **Barlow SC 900** ("Recoleta + Berthold" kontrastı) | Dönem paletleri |
| **Admin** (operasyon) | `admin/` (bağımsız repo, Vercel) | Sans + mono eyebrow | **Ops-teal accent (#56B6C2)** + mavi-tonlu soğuk charcoal + gerçek semantik renkler — `admin-theme.css` |

**Kurallar:**
1. Journey serifi (Bodoni Moda) başka katmana **sızmaz** — veri yüzeylerinde
   grotesk kalır; Bebas sosyal/anlatı yüzeylerine sızmaz (typography.md §3).
2. Admin, ürün amber'ini **hiç kullanmaz** — "yanlışlıkla üründe miyim?"
   karışıklığı sıfır olmalı. Ters yönde de geçerli: ops-teal üründe kullanılmaz.
3. Yeni bir sayfa hangi katmana aitse o katmanın imzasını alır; katman
   belirsizse Dashboard (çapa) varsayılır.

İki ilke bu kişilikleri birleştirir:

*   **Bilişsel Akıcılık (Cognitive Fluency):** Lüks, sıkıştırmayla değil, stratejik
    negatif boşlukla elde edilir. Kalabalık menülerden kaçın. **Ama** bu, "her ekran
    bomboş" demek değildir — bkz. Bölüm 4'teki **iki yoğunluk modu** (Canvas vs Index).
*   **Tactile Maximalism (Dokunsal Yüzeyler):** Etkileşimli elemanlar hafif fiziksel
    derinliğe sahiptir. Butonlar basıldığında gerçekten "basılıyormuş" hisseder
    (skeuomorfik press). "Liquid Glass" yüzeyler, arkadaki koyu rengi hafifçe kıran,
    çok ince beyaz/gümüş iç kenarlıklı (inner border) yarı-şeffaf katmanlardır.

---

## 2. RENK SİSTEMİ (Dark-First) & DESIGN TOKENS

Rosso **dark-first**tir. Aydınlık mod ikincildir ve **asla** koyu modun invert'i
değildir (Bölüm 7'ye bakın). Saf siyah (`#000000`) yasaktır; halation (göz
yorgunluğu) yaratır ve ucuz görünür. Onun yerine çok koyu, hafif sıcak kömür
(charcoal) kullanılır.

### 2.1 60-30-10 Dağılımı

> **Pedagojik referans:** `docs/design/references/60-30-10-renk-kurali.md` — Samurai Jack kareleri
> ile oran disiplininin görsel kanıtı ve Rosso sayfa denetim listesi.

*   **%60 — Nötr zemin:** `--bg-base` ve yüzey tonları. Sayfanın “nefes aldığı” katman.
    Kullanıcı burada dinlenir; bilgi taşınmaz.
*   **%30 — İkincil / grafit:** Kartlar, kenarlıklar, nav, birincil/ikincil metin blokları.
    Yapısal hiyerarşi burada kurulur — accent değil.
*   **%10 — Accent:** Birincil aksiyon, aktif durum, **tek** kritik vurgu.
    ⚠ Aktif accent rengi için bu belgeye değil `katmanlar/dashboard-design.md`
    §3'e bakın (kanonik: Deep Violet `--accent: oklch(59.9% 0.230 286.2)` ≈
    `#7C5CFF`, `web/src/app/globals.css:45`). Asla bu orandan fazla kullanma;
    aksi halde "premium" hissi kaybolur.

**Samurai Jack'ten pratik ders (UI'ya çeviri):**

| Karede | Rosso'da |
|---|---|
| Geniş sakin zemin (60%) | `--color-bg`, Canvas modu boşluk |
| Yapı/derinlik katmanı (30%) | `--color-bg-elevated`, Bento kart, track list |
| Seyrek yüksek kontrast (10%) | Tek amber CTA veya aktif nav — çoklu badge değil |
| Squint'te tek odak | Sayfada bir birincil aksiyon metni |

**Denetim sorusu (her ekran):** “Bu viewport'ta amber/parlak kaç ayrı şey bağırıyor?”
Cevap **1** (nadiren 2, biri ikincil) olmalı. 3+ → 60:30:10 bozulmuş, minimalizm spec'teki
squint testi de muhtemelen kırılır.

**Yaygın ihlaller (canlı UI teşhisinden):**

- Aynı sayfada hero CTA + footer CTA + nav CTA üçü de accent dolu
- Her feature kartında tag + ikon + vurgulu border
- Dashboard'da tüm metrik kartları eşit accent ağırlığında
- Settings'te çoklu accent paleti seçici (renk bütçesi dağıtır)

> ⚠ **Güncelliğini yitirmiş referans (2026-08-12 denetiminde bulundu):** Bu
> paragraf eskiden burada Amber'i (`#F59E0B`) "aktif production accent" diye
> tanımlıyordu — kod bunu doğrulamıyor. **Codebase kanonik accent'i Deep
> Violet'tir** (`--accent: oklch(59.9% 0.230 286.2)` ≈ `#7C5CFF`,
> `web/src/app/globals.css:45`), tek kaynak `katmanlar/dashboard-design.md` §3
> ("Palet seçici YOKTUR, tek palet tek dil"). Aşağıdaki §2.2'deki token bloğu
> (Amber/Garnet renk adları, `--radius-md: 12px` vb.) de gerçek `globals.css`
> ile birebir eşleşmiyor — bu bölüm ilham/bağlam kaynağıdır (bkz. dosya başı
> AGENT DIRECTIVE), kanonik değerler için her zaman gerçek kodu ve
> `katmanlar/` anayasalarını esas alın.

### 2.2 Canonical Tokens (CSS Variables)
Tüm renkler CSS değişkeni olarak tanımlanır; bileşenlerde hardcoded hex **yasak**.
Aşağıdaki değerler kanonik başlangıç paletidir (tema dosyasında ayarlanabilir,
ama hiyerarşi/oranlar korunur):

```css
:root {
  /* Zemin & yüzeyler — dark-first */
  --bg-base:        #0A0A0B;  /* sayfa zemini, saf siyah DEĞİL */
  --bg-sunken:      #060607;  /* en alt katman (track list zebra vb.) */
  --surface-1:      #141416;  /* kartlar */
  --surface-2:      #1C1C20;  /* yükseltilmiş kart / popover */
  --glass-fill:     rgba(255,255,255,0.04);  /* Liquid Glass dolgu */
  --glass-border:   rgba(255,255,255,0.08);  /* iç kenarlık (hairline) */

  /* Metin — kırık beyaz, saf beyaz DEĞİL */
  --text-primary:   #F4F4F5;
  --text-secondary: #A1A1AA;
  --text-tertiary:  #71717A;  /* hiyerarşi için ton düşür, grileştirme değil */

  /* Marka: Rosso Garnet (10% accent) — molten/garnet, alarm kırmızısı değil */
  --rosso-700:      #9A2823;
  --rosso-600:      #B8302A;
  --rosso-500:      #D23B2E;  /* birincil accent */
  --rosso-400:      #E25A4D;  /* hover / vurgu */
  --rosso-glow:     rgba(210,59,46,0.35);  /* box-shadow glow */

  /* Enerji / canlı glow: amber (VU-meter / Hi-Fi sıcaklığı) */
  --amber-glow:     #F5A524;
  --amber-glow-soft:rgba(245,165,36,0.30);
  --info-glow:      #3B82F6;  /* data-viz mavi vurgu */

  /* Semantik durumlar — accent kırmızısından AYRI tutulur (Bölüm 7) */
  --success:        #22C55E;
  --warning:        #F5A524;
  --error:          #FF6B57;  /* kasıtlı turuncu-kırmızı: garnet ile karışmaz */

  /* Yarıçap & gölge ölçeği */
  --radius-sm:      8px;
  --radius-md:      12px;   /* BUTON & GENEL UI tokeni — her bileşende bu */
  --radius-lg:      16px;
  --radius-xl:      24px;
  --radius-full:    9999px; /* pill nav, badge */
  --shadow-card:    0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.45);
  --shadow-glow:    0 0 0 1px var(--glass-border), 0 0 24px var(--rosso-glow);
}
```

> **Önemli (7c86f1b):** `--radius-md` artık **tüm butonların** tek border-radius
> tokenidir. Landing CTA, sistem butonu, ikon butonu fark etmez — hepsi
> `--radius-md` kullanır. Tek istisna: pill nav/badge için `--radius-full`.
> Bileşen özelinde farklı radius kullanmak bu kuralı ihlal eder.

### 2.3 Platform Kaynak Rengi (Source Color)
Rosso **saf Spotify** platformudur (YouTube Music / Apple Music entegrasyonları
2026-07-28'de kaldırıldı, geri eklenemez). Spotify marka rengi YALNIZCA küçük
rozet/çip/ikon olarak kullanılır — asla geniş UI yüzeyinde değil (yoksa Rosso
garnet'i ile çakışır):

```css
--src-spotify:     #1DB954;
```

> **Kural:** Spotify yeşili, Rosso'nun garnet accent'iyle aynı anda geniş
> alanda **kullanılmaz**. Yalnızca ~16–20px logolu rozetlerde yaşar (bkz.
> Bölüm 6.4 — Source Attribution). Rosso garnet'i (`--rosso-500`) kasıtlı
> olarak daha koyu/molten seçilmiştir ki bu rozetten ayrışsın.

### 2.4 Glow & Derinlik
Parlaklık efektleri saf renk değil, yumuşak `box-shadow` + `backdrop-blur` ile
verilir. Glow yalnızca **anlamlı** durumlarda: aktif aksiyon, işlenmekte olan
bileşen (Bölüm 5 — shimmer), veya data-viz vurgusu. Kalıcı/amaçsız glow yasaktır.

---

## 3. TİPOGRAFİ — ALTI AİLELİ SİSTEM (2026-07-18)

> **Tek otorite:** [`tipografi.md`](tipografi.md) —
> aileler, modül kimlikleri, yasaklar, değişiklik protokolü orada. Özet:

| Değişken | Font | Rol |
|---|---|---|
| `--font-sans` | **Geist** | Tüm UI: gövde, form, buton, navigasyon, başlık (body varsayılanı) |
| `--font-mono` | **Geist Mono** | YALNIZ teknik: tarih, süre (`3:42`), sayaç, metadata, eyebrow |
| `--font-analytics` | **Bebas Neue** (tek kesim) | Müzik analitik display: dashboard/recap-liste/taste büyük sayılar |
| `--font-social` | **Barlow Semi Condensed** (400-900) | Sosyal katman: keşfet, mesajlar, profil isim/başlıkları |
| `--font-display` | **Archivo Black** (tek kesim) | Story Recap deck'leri + marketing/blog display |
| `--font-journey-serif` (+ `--font-journey-sans` = Barlow 900) | **Bodoni Moda Italic** | YALNIZ Journey — ince serif + kalın sans kontrastı |

*   **Geist Mono + `font-variant-numeric: tabular-nums`:** ISRC kodları, timestamp'ler,
    süreler (`3:42`), sayaçlar, play count, dosya boyutları. Tablo/liste içindeki
    tüm sayılar hizalı (tabular) olmalı ki zıplama olmasın — müzik platformu
    track süreleri için zorunlu.
*   **Satır uzunluğu:** Paragraf genişliği okunabilirlik için **maksimum 75 karakter**
    (`max-w-[65ch]`–`75ch`).
*   **Satır yüksekliği (line-height):** Font boyutuyla ters orantılı. Küçük/gövde
    metin **1.5–1.6**, büyük sayfa başlıkları **1.1–1.2**.
*   **Hiyerarşi:** Geleneksel grileştirme yerine, ikincil metin ve ikonların
    kontrastını arka planla **aynı hue'yu koruyarak** düşür (`--text-secondary`,
    `--text-tertiary`).
*   **Buton tipografisi:** Buton etiketleri body stilini **kopyalamaz**; optik
    olarak tam merkeze oturtulmuş, amaca yönelik, kilitli line-height'lı özel stil
    kullanır (genelde `font-medium`, hafif sıkı letter-spacing).

### Tip Ölçeği (öneri, 8pt'e oturur)
| Rol | Boyut / LH | Not |
|---|---|---|
| Display | 40–48 / 1.1 | Hero, landing |
| H1 (page) | 32 / 1.15 | Sayfa başlığı |
| H2 (section) | 24 / 1.2 | Bento bölüm başlığı |
| H3 (card) | 18 / 1.3 | Kart başlığı |
| Body | 16 / 1.5 | Varsayılan |
| Small | 14 / 1.5 | İkincil |
| Caption/Mono | 12–13 / 1.4 | Metadata, ISRC, timestamp |

---

## 4. BOŞLUK & LAYOUT — 8PT İSKELET + ASİMETRİK BENTO

### 4.1 8-Nokta Grid (görünmez iskelet — her zaman geçerli)
*   Tüm padding, margin, yükseklik, genişlik **8'in katı** olmalıdır (8, 16, 24, 32…).
*   Yalnızca ikon-arası mesafe / ince metin boşlukları gibi mikro ayarlar için
    **4pt yarı-adım** kullanılabilir.
*   CSS'te `box-sizing: border-box` **kesin** kuraldır (Tailwind default; override etme).
*   **Mobil container padding: 16px** (varsayılan), küçük tablette 24px. *Eski
    dokümandaki "20px" 8pt grid'i bozduğu için kullanılmaz.*

### 4.2 Asimetrik Bento Grid 2.0 (kompozisyon)
Özet kartları ve veri görselleştirmeleri için Japon bento kutularından ilham alan,
**farklı boyutlu** kartlardan oluşan asimetrik düzen kullanılır — ama tüm kartlar
8pt ritmine ve boşluklara oturur (bu yüzden "anti-grid" ile 8pt çelişmez):

*   Kartlar arası `gap: 16–24px`.
*   `border-radius: 12–24px` (kartlar arası tutarlı; bir ekranda tek bir radius ailesi).
*   Sütun sayısı masaüstünde **maksimum 4–5** (karmaşayı önler).
*   Farklı boyutlar 8pt span'lerle kurulur (örn. CSS grid `grid-template-columns`
    + `col-span`), keyfi piksellerle değil.

**Kanonik bento pattern (commit 84ad4ed):**
```css
/* Büyük sol (2/3) + sağda dikey iki küçük kart */
.bento {
  display: grid;
  grid-template-columns: 2fr 1fr;
}
.bentoLarge  { grid-row: 1 / 3; }   /* sol kart tüm yüksekliği kaplar */
.bentoSmall  { /* sağ iki küçük kart */ }
```
Mobil ≤ 768px: `grid-template-columns: 1fr` ile tek kolona düşer.

**3 eşit kart yasağı (kanonik):** Marketing landing, dashboard hızlı başlangıç ve
benzeri bölümlerde `grid-template-columns: repeat(3, 1fr)` ile 3 eşit kart satırı
kullanılmaz. Asimetrik `2fr 1fr` veya zig-zag tercih edilir.

### 4.3 İKİ YOĞUNLUK MODU (kritik — müzik platformu uzlaşması)
"Lüks = whitespace" ile "müzik platformu = yoğun listeler" çelişkisi **iki mod** ile çözülür:

*   **Canvas yüzeyleri** (Dashboard, özet kartları, hero, Settings, boş durumlar):
    cömert negatif boşluk, nefes alan Bento kartları. Premium his burada yaşar.
*   **Index yüzeyleri** (track listeleri, playlist tabloları, dinleme geçmişi):
    yoğun **ama ritmik** satır sistemi — tıpkı Spotify'ın track list'i.
    *   Satır yüksekliği **56px** (7×8) veya 48px (6×8) standart.
    *   Satır içi padding 8/12px; hover'da `--surface-1` zebra/elevation.
    *   Premium his burada *yoğunluktan* değil, hizadan (tabular-nums), tutarlı
        satır ritminden ve cover art kalitesinden gelir.

> Karar kuralı: "Bu ekran keşif/özet mi (Canvas) yoksa tarama/seçme mi (Index)?"
> sorusunu sor; yoğunluğu ona göre seç. Bir ekranda ikisini karıştırma —
> Bento kartlar üstte (Canvas), liste altta (Index) gibi ayrılır.

---

## 5. YÜZEYLER, ELEVATION & LIQUID GLASS

Derinlik, gerçek fiziksel katmanlar gibi kurgulanır:

*   **Liquid Glass spec:** yarı-şeffaf dolgu (`--glass-fill`) + `backdrop-blur`
    (12–20px) + çok ince iç kenarlık (`--glass-border`, 1px) + yumuşak gölge.
    Bu, içi boş "ghost" yüzey **değildir** — her zaman bir dolgusu ve kenarı vardır.
*   **Elevation merdiveni:** `--bg-base` → `--surface-1` (kart) → `--surface-2`
    (popover/modal) → glass (overlay). Yükseldikçe blur ve gölge artar.
*   **Skeuomorfik press:** Tıklanabilir yüzeyler basıldığında hafif `scale(0.98)`
    + iç gölge ile "basıldı" hisseder (Bölüm 8 — motion).
*   **Saf siyah / saf beyaz yok:** zeminde charcoal, metinde off-white.

### 5.1 Glassmorphism Navbar Kuralları (kanonik — commit 7c86f1b)

Hem landing hem dashboard navbar'ı **glassmorphism** kullanır. Spec:

```css
backdrop-filter: blur(24px) saturate(1.4);
background: color-mix(in srgb, var(--color-bg-elevated) 72%, transparent);
border: 1px solid rgba(255, 255, 255, 0.07);
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
```

**Landing Navbar (marketing):**
- **Desktop:** Sayfanın üst kısmında sabit, pill-şekilli glassmorphism nav.
- **Fade efekti:** Nav'ın arkasında `position: fixed`, z-index 49, `top→bottom` yönünde
  gradient (`navFade`). Kullanıcı kaydırdıkça içerik fade ile nav'ın altından girer.
- **Mobile:** Nav **alta** taşınır (bottom fixed). `navFade` yönü tersine döner (`bottom→top`).

**Dashboard Sidebar:**
- **Glassmorphism** + sol→sağ yönlü gradient fade: sol kenardan şeffaflık açılır.
- **Genişlik:** Açık `220px` ↔ Kapalı `60px` — CSS `transition: width` ile.
- **Hamburger → X animasyonu:** 3 çizgi CSS transform ile X'e dönüşür (JS animasyon kütüphanesi gerekmez).
- **Durum senkronu:** `SidebarContext` (React Context) — sidebar ile `DashboardShell` margin'i birlikte güncellenir.
- **Collapsed ikonlar:** Yalnız ikon görünür, `title` prop ile tooltip. Label'lar `collapsed` state'de saklanır.

**Dashboard Bottom Nav (mobile):**
- Glassmorphism + `backdrop-filter: blur(20px)` + inner border.
- Items arası `border-left` separator.

### 5.2 Frame & Separator Sistemi (kanonik — commit 7c86f1b)

> **Kural:** Hiçbir UI bileşeni yalnızca "zemin rengi + metin" olarak varolamaz.
> Her nav item, kart, ve interaktif yüzey; inner border, separator veya hafif yüzey
> yükseltmesi ile **çerçevelenmiş** olmalıdır.

Uygulaması:
- Nav item hover/aktif: `box-shadow: inset 0 0 0 1px var(--color-border)`
- Kart/bento bileşenleri: `border: 1px solid var(--color-border)` veya `--shadow-card`
- Bölüm sonu ayraçları: `border-bottom: 1px solid var(--color-border)`
- Track row: hover'da `border-radius` + `background: var(--color-bg-elevated)`

---

## 6. BİLEŞENLER

### 6.0 Büyük Harf (uppercase) Kuralı — YASAK (commit 7c86f1b)

> **Kural:** CSS `text-transform: uppercase` UI etiketlerinde **kesinlikle yasaktır**.
> Büyük/küçük harf kararı içerikten (yazıdan) gelir; CSS'ten dayatılmaz.

**Yasak yerler:** Nav item etiketleri, kart stat label'ları, period/tab seçici etiketleri,
bölüm eyebrow metinleri, buton içi tüm metinler, track satırı metadata metinleri.

**İstisna (marka kimliği — değiştirilemez):**
- `.logoWordmark` / logo marka adı
- Mono eyebrow etiketler (CSS class'ı `.eyebrow` veya `.brand` ile özellikle işaretlenmiş)
- Platform rozeti (SPOTIFY — marka standardı)

Bu istisnaların dışında uppercase görmek **bir bug'dur**, stil tercihi değil.

### 6.1 Buton Hiyerarşisi

**Tüm butonlar `border-radius: var(--radius-md)` kullanır.** İstisna yoktur.
Pill buton yalnızca `--radius-full` ile nav/badge kontekstinde kabul edilir.

| Seviye | Görünüm | Kullanım |
|---|---|---|
| **Primary CTA** | Dolu amber (`--color-accent`), `translateY(-1px)` hover, amber glow, `::after` ring, `:active scale(0.98)` | Sayfadaki tek ana aksiyon |
| **Secondary** | Şeffaf + ince border, hover: amber border + muted bg, `:active scale(0.98)` | İkincil aksiyonlar |
| **Tertiary / text** | Yalnız metin, dolgu yok | SADECE düşük öncelikli inline aksiyon (toast içindeki "Vazgeç" vb.) |

**Primary CTA animasyon spec (kanonik):**
```css
/* hover */
transform: translateY(-1px);
box-shadow: 0 8px 24px rgba(245, 158, 11, 0.35);

/* ::after ring */
content: '';
position: absolute;
inset: -3px;
border-radius: calc(var(--radius-md) + 3px);
border: 2px solid var(--color-accent);
opacity: 0;
/* hover'da opacity: 0.4 */

/* :active */
transform: scale(0.98);
```

*   Outline-only "ghost" stili **birincil dönüşüm butonlarında asla** kullanılmaz.
*   Tüm butonlar min. 44×44px dokunmatik hedef (Bölüm 7).
*   **Hover davranışı tüm buton tipleride uniform** — yalnızca primary CTA özel animasyon alır.

### 6.2 Formlar & Etkileşim Maliyeti
Etkileşim maliyeti düştükçe dönüşüm artar:

*   **Alanları minimize et.** Sadece zorunlu bilgi. İsteğe bağlı alanları `*` yerine
    açıkça **"İsteğe Bağlı"** etiketle. Ad+Soyad yerine tek **"Tam Ad"** alanı.
*   **Etiket konumu:** her zaman alanın **üstünde** (top-align).
*   **Hata yönetimi:** hatayı sayfanın tepesinde değil, **ilgili alanın altında
    (inline)** göster. Asla suçlayıcı dil kullanma ("Yanlış girdiniz" → "Bu numara
    hatalı görünüyor"). Hatayı renk + **ikon + metin** ile birlikte ver (Bölüm 7).
*   **Dropdown'dan kaçın — kapsamlı kural:**
    *   <5 sabit seçenek (form ayarları): dropdown yerine **radio / segmented control**.
    *   Büyük dinamik listeler (playlist/track/sanatçı seçimi): dropdown değil,
        **arama + virtualized liste** (komut paleti tarzı). Müzik platformunda
        dropdown'a hiç gerek kalmaz.

### 6.3 Müzik Platformu Bileşenleri (Rosso'nun kimliği)
Bunlar Rosso'yu "bir veri uygulaması" değil "bir müzik platformu" yapan parçalardır:

*   **Cover Art:** her zaman `--radius-md`, `--shadow-card`, 1:1 oran, lazy-load.
    Yüklenirken shimmer skeleton (renkli değil nötr). Track satırında 40–48px,
    kartta 56–64px, hero'da daha büyük.
*   **Track Row (Index satırı):** `[cover] [başlık + sanatçı] [albüm] [kaynak rozeti]
    [süre (mono, tabular)]`. Hover'da elevation + play ikonu cover üzerinde belirir.
    `skipped=true` event'leri ince bir "atlandı" işaretiyle gösterilir (silinmez —
    CLAUDE.md veri modeliyle uyumlu).
*   **Now-Playing / Son Çalınan barı:** alt sabit veya sidebar altı; cover +
    başlık + ince ilerleme çizgisi. İsteğe bağlı **equalizer** mikro-animasyonu
    (yalnız "şu an aktif" durumunu anlatır; durunca durur — Bölüm 8).
*   **İstatistik / Data-Viz:** dinleme metrikleri Bento kartlarda; sayılar Geist
    Mono tabular. Grafik vurguları `--amber-glow` / `--info-glow`. Müzik türü/zaman
    dağılımı gibi grafiklerde renk **tek başına** anlam taşımaz; etiket/legend zorunlu.

### 6.3b Tab / Period Selector Paterni (Framer Motion layoutId — kanonik)

Period ve tab seçiciler **statik underline veya border-bottom ile yapılmaz.**
Aktif gösterge olarak Framer Motion `layoutId` ile **animasyonlu kayan pill** kullanılır.

```tsx
import { motion } from 'motion/react'

// Pill container — `position: relative`
<div className={styles.periodStrip}>
  {PERIODS.map(p => (
    <button key={p} className={styles.periodTab} onClick={() => setValue(p)}>
      {p === value && (
        <motion.span
          layoutId="period-indicator"  // benzersiz ID — her selector instance farklı olmalı
          className={styles.periodIndicator}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          aria-hidden
        />
      )}
      <span className={styles.periodTabLabel}>{LABELS[p]}</span>
    </button>
  ))}
</div>
```

**CSS spec:**
```css
.periodIndicator {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.3);
  z-index: 0;
}
.periodTabLabel { position: relative; z-index: 1; }
```

**Spring spec:** `{ type: 'spring', stiffness: 380, damping: 34 }`
Bu değerler Rosso'nun motion kimliğidir — değiştirilemez.

### 6.3c Profile Sphere — Genre→Palette Sistemi (kanonik — commit 7c86f1b)

`LivingAvatar` bileşeni kullanıcının dominant genre'sine göre 2-renk palette seçer.
Bu palette sphere gradient renkleri belirler.

**Mimari:**
- `GENRE_PALETTES: Record<string, Palette>` — 15 genre → `{ from: string, to: string }`
- `resolveGenrePalette(genre: string | null | undefined): Palette` utility
- `genre` prop: `LivingAvatar`'a dominant genre geçilince `mood`'dan önce işlenir
- Pipeline: `getProfileData()` → `dominantGenre` → `HeroCard` → `LivingAvatar genre=`

**Aktif 15 genre → palette mapping:**

| Genre | Palette |
|---|---|
| Electronic | Deep Ocean (mavi→turkuaz) |
| Metal | Crimson Eclipse (koyu kırmızı→gece) |
| Classical | Frozen Mist (buz mavisi→lavanta) |
| Folk | Earth & Stone (toprak→taş gri) |
| Hip-Hop | Monochrome Shadow (koyu gri→siyah) |
| Indie | Minimal Espresso (koyu kahve→krem) |
| Pop | Desert Rose (pembe→kum) |
| R&B | Sweet Cream (krem→pudra) |
| Reggae | Sage & Churn (adaçayı→lime) |
| Jazz | Eclipse Glow (gece→kehribar) |
| Turkish Classical | Amber Haze (amber→altın) |
| Arabesque | Midnight Teal+Gold |
| Turkish Rock | Dusty Rose |
| Rock | Velvet Violet |
| Country | Warm Smoke |

**Animasyon hızları (sphere — kanonik):**
- `orbSpin`: 14s (eski: 22s — %36 hızlı)
- `blobA/B/C`: 4.5s / 5.5s / 6.5s (eski: 7s / 9s / 11s)
- `glowPulse`: 3.2s (eski: 5s)
- `dotPulse`: 1.6s (eski: 2.4s)

Bu hız değerleri tasarımın kimliğidir; optimize ederken yavaşlatılmaz.

### 6.3d Entity Link — track/sanatçı adları her yerde tıklanabilir (2026-07-16)

Görülen **her** track ve sanatçı adı detay sayfasına (`/track/[id]`,
`/artist/[name]`) linklenir — istisna: recap & journey anlatı yüzeyleri
(Sahip kararı: anlatı akışı link gürültüsüyle bölünmez). Desen:

- Global `.entity-link` sınıfı (globals.css): rengi satırından miras alır
  (60:30:10 bütçesine dokunmaz), hover'da accent alt çizgi,
  `:focus-visible` halka.
- `trackId` yoksa link üretilmez (boş linke tıklama yasak) — span kalır.
- Sanatçı linki her zaman `encodeURIComponent(name)` ile.

### 6.4 Source Attribution (Kaynak Rozeti) — çift amaçlı kural
Her track/event/istatistik, verinin Spotify'dan geldiğini küçük logolu bir
**rozetle** gösterir. Bu hem "müzik platformu" kimliğini güçlendirir hem de
Bölüm 9'daki AI **Source Attribution** kuralını karşılar: AI tarafından
üretilmiş/eşleştirilmiş veriler de küçük bir "AI" ikon/etiketiyle işaretlenir
(örn. ISRC eşleşmesi düşük güvenlikliyse).

---

## 7. ERİŞİLEBİLİRLİK (Accessibility-First — pazarlık konusu değil)

*   **Dokunmatik hedef:** Tüm interaktif öğeler **minimum 44×44px** hit alanına
    sahip (görsel daha küçük olabilir ama padding ile 44'e tamamlanır). Aralarında
    en az **8pt** güvenli boşluk; mümkünse merkezleri arası ≥60pt. *(Eski iOS 44 /
    Android 48 ikiliği tek 44px minimuma indirgendi; 48px "konforlu" hedef olarak önerilir.)*
*   **Renk kontrastı:** WCAG 2.1 — gövde metni ≥ **4.5:1**, büyük metin ≥ **3:1**.
    Mümkünse APCA: büyük UI etiketi Lc ~60, gövde ~75, ince/küçük metin ~90.
    Off-white/charcoal paleti bunu karşılar; `--text-tertiary`'yi küçük metinde kullanma.
*   **Sadece renge güvenme:** başarı/hata/uyarı durumları renk + **ikon + metin**.
    Bu yüzden `--error` (turuncu-kırmızı), `--rosso` accent'inden bilinçli ayrıldı.
*   **Focus state:** klavye focus'u her zaman görünür (2px `--rosso-400` halka +
    offset). Outline'ı asla `none` yapma.
*   **Dark mode kuralı:** Aydınlık modu invert ETME. Saf siyah üzerine aşırı doygun
    parlak beyaz koyma (halation); yumuşak gri / off-white / doygunluğu düşük tonlar kullan.

---

## 8. MOTION & ETKİLEŞİM

Animasyon süsleme değil, **bağlam** içindir (Motion Narrative). Hız, easing ve
gölge derinlikleri tasarımın kimliğidir — optimize ederken feda edilmez.

*   **Skeuomorfik press:** tıklamada `scale(0.98)` + iç gölge, ~120ms, `ease-out`.
*   **Shimmer / işlem belirteci:** AI veya veri işleme (ZIP, export, ISRC eşleştirme)
    aktifken **o bileşenin etrafında** Apple Intelligence tarzı hafif renkli parlama
    döner. İşlem bitince **kesinlikle durur** — kalıcı animasyon kullanıcı güvenini zedeler.
*   **Equalizer / müzik mikro-motion:** yalnızca "şu an çalıyor/aktif" durumunu
    anlatır; idle'da statiktir.
*   **Peak-End (zirve-son) mikro-etkileşimleri:** bir task/ZIP işlemi bittiğinde
    tatmin edici, kısa bir kutlama anı (Bölüm 10 — Özet Kartı ile birlikte).
*   **Performans bütçesi:** animasyon/3D (Liquid Glass, mikro etkileşim) yalnız
    **amaçlı geri bildirim** için. `transform`/`opacity` üzerinden çalış (GPU);
    layout-trigger animasyonlardan kaçın. Sayfa performansı tasarımın çekirdek
    parçasıdır — yavaşlatan, anlamsız animasyon yok. `prefers-reduced-motion`'a saygı göster.

### 8.1 Kanonik Spring Spec (Framer Motion / layoutId)

Tab slider, pill indicator ve shared element geçişlerinde Rosso'nun standart spring'i:

```ts
{ type: 'spring', stiffness: 380, damping: 34 }
```

Daha dramatik geçişler için `stiffness` düşürülebilir, ama `damping: 34` alt sınırdır
(salınımsız spring — Rosso'nun "ağır, otoriter" hissini korur).

### 8.1b Gezinme Tepkisi — NavigationProgress + loading.tsx kapsaması (2026-07-16)

**Kural:** Bir iç linke tıklama ANINDA görsel tepki üretir — hiçbir gezinme
"1-2 sn hiçbir şey olmadan bekleme" hissi veremez. İki mekanizma birlikte:

1. **`NavigationProgress`** (root layout, `components/ui/navigation-progress.tsx`):
   tıklama anında üstte 2px amber çizgi; rota değişince tamamlanır. Asla %100
   yalanı göstermez (82%'de yavaşlar — loading doc "Honest Progress" ilkesi).
   `prefers-reduced-motion`: statik çizgi.
2. **Her dinamik sayfada `loading.tsx`** — sayfanın kaba yerleşimini yansıtan
   Skeleton iskeleti (CLS önleme, loading doc §1 "Layout Kimliği Korunmalı").
   Yeni dinamik route açan herkes loading.tsx'ini de ekler; eksik loading.tsx
   bir bug'dur.

Kaynak teknik: `docs/design/design-techniques/loading-states-process-feedback.md`.

### 8.1c Progressive Blur — görsel üstü metin (2026-07-16, kanonik uygulamalar)

Görsel + üstüne metin kompozisyonlarında kontrast **progressive blur + hizalı
gradyan** ile garanti edilir (`backdrop-filter: blur` + `mask-image: linear-gradient`).
Kanonik uygulamalar: `vibe-card-hero` (taste sahnesi), `public-profile-view`
galeri dots scrim'i. Yenisini eklerken: blur başlangıcı ile gradyanın opaklaşma
noktası hizalı olmalı (sert çizgi yasak), metin alt padding'i sıkı tutulur.
Kaynak teknik: `docs/design/design-techniques/progressive-blur-card-design.md`.

### 8.2 Skeleton Shimmer Sistemi (kanonik — commit a745492)

Tüm yükleme placeholder'ları tek global `@keyframes shimmer` ile çalışır. Her bileşen kendi keyframe'ini **yazmaz** — böylece tüm sayfa aynı anda nefes alır.

```css
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.shimmer {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.03) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.03) 75%
  );
  background-size: 200% 100%;
  background-color: var(--color-bg-elevated);
  animation: shimmer 1.6s ease-in-out infinite;
}
```

**Kural:**
- Skeleton zemin rengi: `--color-bg-elevated` (`#1C1C20`) — asla açık gri (`#e0e0e0` vb.)
- Typed bileşenler: `<SkeletonCard />`, `<SkeletonTrackRow />`, `<SkeletonStatBento />`
- `prefers-reduced-motion`: animasyon durur, statik `--color-bg-elevated` kalır

### 8.3 Sayfa Reveal Animasyonları (kanonik — commit 84ad4ed)

**Hero Reveal (marketing landing):**
- `HeroReveal` izole client bileşeni, 6 hero bölümü `delay: 0 → 0.30s` kaskad
- Spring: `{ stiffness: 280, damping: 36 }` — landing için biraz yavaş/ağır
- `initial: { opacity: 0, y: 18 }` → `animate: { opacity: 1, y: 0 }`

**Stagger Reveal (recap / veri sayfaları):**
- `StaggerReveal` + `StaggerItem` izole client bileşenleri
- `staggerChildren: 0.07s`, `delayChildren: 0.04s`
- Item spring: `{ stiffness: 300, damping: 38 }`
- `initial: { opacity: 0, y: 14 }` — daha sıkı (data sayfası ritmi)

Her iki durumda `prefers-reduced-motion` aktifse static render, animasyon sıfırlama.

### 8.4 Perpetual Animasyonlar için Kural

Sonsuz döngü animasyonları (sphere blob, glow pulse, equalizer bar) **izole `'use client'`
yaprak bileşenlerde** ve **`React.memo`** ile sarılmış olarak yaşar. Parent layout
re-render'larından etkilenmemesi zorunludur.

CSS-only perpetual animasyonlar için globals.css'teki `@keyframes` bloğu kullanılır
(`blobA`, `blobB`, `blobC`, `orbSpin`, `glowPulse`, `dotPulse`).
Kanonik hız değerleri için bkz. Bölüm 6.3c.

---

## 9. AGENTIC UX (AI Pattern'leri)

Rosso'da AI/eşleştirme özellikleri kullanıcıda güven oluşturmalıdır:

*   **Tevazu (Deference):** AI önerileri kullanıcının ana içeriğini asla gasp etmez.
    Görsel hiyerarşide bir kademe altta dur (örn. dokununca genişleyen ince özet kutusu).
*   **Süreç belirteçleri:** AI çalışırken shimmer/glow (Bölüm 8); bitince durdur.
*   **Source Attribution:** AI üretimi/eşleştirmesi her zaman küçük ikon/etiketle
    belirtilir (Bölüm 6.4 ile aynı sistem).
*   **Kontrol & İptal:** AI/agent aksiyonları için her zaman net **"Geri Al" (Undo)**
    ve **"Önizleme / Impact Preview"** sun.

---

## 10. FORGIVING UI, STATE & GRACEFUL FALLBACKS

Rosso'nun arayüzü cezalandırıcı değil, affedici ve destekleyicidir:

*   **Summary Card kuralı:** Veri işleme bitince kullanıcı asla boş forma dönmez;
    Bento yapısında, ne kadar verinin başarıyla işlendiğini gösteren şık bir
    **Özet Kartı** sunulur (Peak-End).
*   **5 Saniyelik Undo standardı:** Yıkıcı işlemler (proje/veri silme) anında DB'ye
    işlenmez; kullanıcıya **5 sn'lik Undo** (toast veya inline action) verilir.
    Bu, agentic arayüzlerin güven prensibidir.
*   **Boş / yükleniyor / hata durumları:** her liste ve kartın tanımlı empty, skeleton
    (nötr shimmer) ve error state'i olur. Hiçbir ekran "ham boşluk" göstermez.
*   **Graceful 404:** Yanlış URL'de ham 404 yerine, projenin koyu/premium/Liquid Glass
    stiline uygun, kullanıcıyı Dashboard veya Settings'e yönlendiren özel
    `not-found.tsx` zorunludur.

---

## 11. FRONTEND MİMARİSİ & KODLAMA STANDARTLARI

*   **Stack:** React + Next.js **App Router**, Tailwind CSS, **shadcn/ui** standarttır.
*   **Server/Client ayrımı:** Realtime dinlemeler (Supabase `processed_events`,
    progress UI) ve etkileşimli bileşenler `"use client"`; geri kalan mümkün olduğunca
    Server Component.
*   **Routing:** `/settings/export`, `/settings/platforms` gibi rotalar App Router
    klasör yapısına (`page.tsx`) birebir uygun. Her dal için `loading.tsx` /
    `error.tsx` / `not-found.tsx` düşünülür.
*   **Renk = yalnız CSS değişkeni.** Bileşende hardcoded hex yasak; Bölüm 2 token'ları
    kullanılır.
*   **Component fluidity:** `design-components/`'tan React'e aktarımda sabit
    `width`/`height` dayatmaları kaldırılır, Tailwind responsive esnekliği kullanılır.
    **Ama** animasyon hızları, easing eğrileri ve gölge (blur/radius) derinlikleri
    **birebir korunur** — bunlar tasarımın kimliğidir.
*   **Asla "AI slop" / template hissi veren generic UI üretme.** Her ekran bu
    dokümanın token'larına, ritmine ve iki kişiliğine (Hi-Fi + müzik) sadık kalır.

---

### Hızlı Kontrol Listesi (PR'dan önce)
- [ ] Tüm boşluklar 8pt (mikro için 4pt)? `box-sizing: border-box`?
- [ ] Renkler token'dan mı? Saf siyah/beyaz yok mu?
- [ ] Kontrast ve 44px dokunmatik hedef sağlandı mı? Focus görünür mü?
- [ ] Durum bilgisi renk + ikon + metin mi?
- [ ] Bu ekran Canvas mı Index mi — yoğunluk doğru mu?
- [ ] Primary buton tek mi? Ghost buton birincil aksiyonda kullanılmamış mı?
- [ ] **Tüm butonlar `--radius-md` mi?** Marka istisnası dışında `--radius-full` yok mu?
- [ ] Track/data'da kaynak rozeti + tabular-nums var mı?
- [ ] İşlem bitince shimmer durdu mu? Yıkıcı işlemde 5sn Undo var mı?
- [ ] Animasyonlar amaçlı mı, `prefers-reduced-motion`'a saygılı mı?
- [ ] **`text-transform: uppercase` CSS'e yazılmamış mı?** (Marka istisnası hariç)
- [ ] **Her nav item/kart/bileşen: inner border veya separator var mı?** (Bölüm 5.2)
- [ ] **Tab/period seçici:** border-bottom değil Framer Motion `layoutId` pill mi? (Bölüm 6.3b)
- [ ] **Navbar glassmorphism** spec'e uyuyor mu? (Bölüm 5.1)
