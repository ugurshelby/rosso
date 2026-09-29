# Rosso Renk Paleti Referansı

HEX referans tablosu. **Mimari, OKLCH, uyum modelleri ve WCAG:** [`renk-token-mimari.md`](renk-token-mimari.md).
**Son denetim:** [`renk-denetim-2026-08-10.md`](renk-denetim-2026-08-10.md) · `npm run audit:colors`

**Kaynak dosyalar (canlı değerler):**
- Uygulama paleti → `web/src/app/globals.css` (`:root` — tek palet, seçici yok)
- Mobil karşılığı → `mobile/src/theme/tokens.ts`
- Tür renkleri → `web/src/lib/genre-colors.ts`
- Kapak fallback gradyanı → `web/src/lib/cover-fallback.ts`
- Profil header gradyanları → `web/src/components/profile/ProfileHeader.tsx` (`GENRE_GRADIENTS`)

---

## BÖLÜM 1 — Uygulama Paleti (TEK PALET: Deep Violet)

> ★ Bağlayıcı otorite: `docs/design/katmanlar/dashboard-design.md` §3.
> Burası token listesini tutar; **kuralları** (accent nerede kullanılır, ışık
> yönü, sayı biçimi) design.md söyler.

**Palet seçici YOKTUR** (2026-08-01). Önceki 4 seçilebilir tema — Green Butter,
Amber Dark, Monokrom, Roland & Clay — ve `PaletteProvider` / `PalettePicker` /
`rosso-palette` storage anahtarı kaldırıldı. Eski katalog:
`archive/tasarim/eski-4-palet-katalogu.md`.

**Tek kaynak:** `web/src/app/globals.css` → `:root`. Mobil karşılığı:
`mobile/src/theme/tokens.ts` (aynı değerler).

### Kanonik token'lar

| Token | Değer | Rol |
|---|---|---|
| `--bg` | `#0A0910` | Sayfa zemini |
| `--surface` | `#16141F` | Kart, modal, yükseltilmiş yüzey |
| `--surface-hi` | `#1F1C2C` | Hover yüzeyi |
| `--border` | `#2A2637` | Kenarlık |
| `--text` | `#F4F4F5` | Ana metin |
| `--muted` | `#A5A0B5` | İkincil metin |
| `--faint` | `#8B85A6` | Üçüncül metin, placeholder (surface üstünde AA ✓) |
| `--accent` | `#7C5CFF` | Vurgu — yalnız durum ve aksiyon |
| `--accent-hover` | `#9D84FF` | Hover |
| `--on-accent` | `#0A0910` | Accent zemin üstünde metin (beyaz 4,35:1 — yasak) |
| `--glow` | `rgba(124,92,255,.25)` | Küçük durum göstergesi ışığı |

⚠ **Nötr griler kasıtlı olarak saf değil**, morun içine hafifçe kaydırılmış.
`#09090B` / `#18181B` gibi nötr karşılıklarıyla değiştirme — palet ısısı bozulur.

### Veri yoğunluğu rampası

Grafik, ısı haritası ve barlarda kullanılır. Hepsi `124, 92, 255` üzerine alfa:

| Token | Alfa |
|---|---|
| `--v1` | .85 |
| `--v2` | .62 |
| `--v3` | .42 |
| `--v4` | .26 |
| `--v5` | .14 |

### Veri görselleştirme kategori renkleri

Arayüz tek renklidir; bu altı renk **yalnız** bar, yüzde ve tür etiketinde
görünür — kart zeminine, butona veya navigasyona taşınmaz.

| Tür | Hex |
|---|---|
| hip-hop | `#8B5CF6` |
| pop | `#F59E0B` |
| alternatif | `#10B981` |
| rock | `#3B82F6` |
| elektronik | `#EC4899` |
| r&b | `#84CC16` |

Uygulama: `web/src/lib/genre-colors.ts`. Tabloda olmayan türler mor rampasına düşer.

### Geriye dönük ad eşlemesi

Mevcut kod `--color-*` adlarıyla yazılmış (200+ kullanım). Bu adlar korundu ve
kanonik adlara bağlandı: `--color-accent` → `--accent`, `--color-bg-elevated` →
`--surface`, `--color-text-secondary` → `--muted` … **Yeni kodda kanonik adları
kullan.**

### Semantik & Platform Renkleri

Tek palette sabit.

| Token | Değer |
|---|---|
| `--color-success` | `#10B981` |
| `--color-warning` | `#F59E0B` |
| `--color-error` | `#EF4444` |
| `--color-error-on` | `#0A0910` | Dolu hata zemininde metin (AA ✓) |
| `--color-error-hover` | `#F87171` | Hover — koyulaştırma değil açılma (on-error AA) |
| `--color-info` | `#3B82F6` |
| `--mood-hero-bg` | `#2A1F2E` | Listeler Mood kartı zemin |
| `--mood-hero-border` | `#5C3A2E` | Mood kartı kenarlık |
| `--mood-hero-icon` | `#FCD34D` | Mood ikon vurgusu |
| `--color-spotify` | `#1DB954` |
| `--color-apple` | `#FC3C44` |
| `--color-yt-music` | `#FF0000` |

---


## BÖLÜM 2 — Profil Header Genre Gradyanları

`ProfileHeader.tsx` içindeki `GENRE_GRADIENTS` map. Kullanıcının dominant genre'sine göre profil hero arka planı oluşturur. Lineer gradyan: `colorTop` → `colorBottom`, metin/ikon renkleri kontrast garantilidir.

### Gradyan Token Haritası

| Token | Açıklama |
|---|---|
| `colorTop` | Kartın üst kısmı (başlangıç rengi) |
| `colorBottom` | Kartın alt kısmı (bitiş rengi) |
| `onTop` | Üst bölgedeki metin/ikon rengi |
| `onBottom` | Alt bölgedeki metin/ikon rengi |
| `accentTop` | Üst bölgede badge/ikon vurgu rengi |
| `accentBottom` | Alt bölgede badge/ikon vurgu rengi |

---

| Genre | colorTop | colorBottom | onTop | onBottom | accentTop | accentBottom |
|---|---|---|---|---|---|---|
| **Rock** | `#0A0018` | `#3D00A8` | `rgba(255,255,255,0.95)` | `rgba(255,255,255,0.92)` | `#B388FF` | `#E0C8FF` |
| **Metal** | `#ADD8E6` | `#F4F8FB` | `rgba(10,20,30,0.92)` | `rgba(10,20,30,0.88)` | `#546E7A` | `#37474F` |
| **Electronic** | `#00020F` | `#0033AA` | `rgba(255,255,255,0.95)` | `rgba(200,230,255,0.92)` | `#82B1FF` | `#BBDEFB` |
| **Classical** | `#FFFFFF` | `#A52A2A` | `rgba(30,15,10,0.90)` | `rgba(255,240,230,0.95)` | `#5D4037` | `#FFCCBC` |
| **Folk** | `#1A0800` | `#8B3A00` | `rgba(255,230,200,0.95)` | `rgba(255,210,160,0.92)` | `#FFCC80` | `#FFE0B2` |
| **Hip-Hop** | `#050508` | `#1A1A3A` | `rgba(255,255,255,0.95)` | `rgba(200,200,255,0.90)` | `#9090D0` | `#C0C0FF` |
| **Indie** | `#100200` | `#8B1A00` | `rgba(255,230,210,0.95)` | `rgba(255,200,170,0.92)` | `#FF8A65` | `#FFCCBC` |
| **Pop** | `#FFC0CB` | `#D1B28F` | `rgba(60,10,20,0.90)` | `rgba(40,20,5,0.88)` | `#C2185B` | `#6D4C41` |
| **R&B** | `#100018` | `#6A0080` | `rgba(255,210,255,0.95)` | `rgba(240,180,255,0.92)` | `#EA80FC` | `#F8C8FF` |
| **Reggae** | `#001A00` | `#005500` | `rgba(200,255,200,0.95)` | `rgba(255,240,140,0.92)` | `#69F0AE` | `#FFD740` |
| **Jazz** | `#000080` | `#C4A87A` | `rgba(255,255,255,0.95)` | `rgba(20,12,4,0.90)` | `#82B1FF` | `#5D4037` |
| **Turkish Classical** | `#001218` | `#004455` | `rgba(200,240,255,0.95)` | `rgba(255,210,100,0.92)` | `#80DEEA` | `#FFD54F` |
| **Arabesque** | `#001010` | `#005048` | `rgba(180,255,240,0.95)` | `rgba(255,220,100,0.92)` | `#64FFDA` | `#FFD740` |
| **Turkish Rock** | `#12000A` | `#6E0A38` | `rgba(255,200,230,0.95)` | `rgba(255,180,210,0.92)` | `#F48FB1` | `#F8C8DC` |
| **Country** | `#333333` | `#FFBF00` | `rgba(255,245,220,0.95)` | `rgba(20,12,0,0.90)` | `#FFF9C4` | `#4E342E` |
| **Blues** | `#800000` | `#0D0000` | `rgba(255,210,200,0.95)` | `rgba(255,200,190,0.92)` | `#EF9A9A` | `#FFCDD2` |
| **Latin** | `#D2143A` | `#F3E5AB` | `rgba(255,240,240,0.95)` | `rgba(60,20,10,0.88)` | `#FFCDD2` | `#795548` |
| **Alternative** | `#000000` | `#808080` | `rgba(255,255,255,0.95)` | `rgba(255,255,255,0.88)` | `#BDBDBD` | `#E0E0E0` |

**Fallback (genre eşleşmezse):**

| Token | Değer |
|---|---|
| `colorTop` | `#060C14` |
| `colorBottom` | `#1B3A6B` |
| `onTop` | `rgba(255,255,255,0.95)` |
| `onBottom` | `rgba(200,220,255,0.92)` |
| `accentTop` | `#82B1FF` |
| `accentBottom` | `#BBDEFB` |

---

## BÖLÜM 3 — Gradyan Skalası (10 Adım)

Orijinal gradyan isimlendirmeleri ve renk geçişleri. Her palet Start → End yönünde 10 adımlık geçiş içerir. Animasyon, fotoğraf filtresi ve görsel üretimde referans olarak kullanılır.

---

### 1. Deep Ocean → Coastal Sand

*Navy Blue → Stone Beige* · **Genre: Jazz** · App: `palette-jazz`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#000080` |
| 2 | `#171482` |
| 3 | `#2E2883` |
| 4 | `#463D85` |
| 5 | `#5D5186` |
| 6 | `#746588` |
| 7 | `#8B7A8A` |
| 8 | `#A28E8B` |
| 9 | `#B9A28D` |
| 10 (End) | `#D1B28F` |

---

### 2. Crimson Eclipse

*Maroon → Black* · **Genre: Blues** · App: `palette-blues`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#800000` |
| 2 | `#720000` |
| 3 | `#630000` |
| 4 | `#550000` |
| 5 | `#470000` |
| 6 | `#380000` |
| 7 | `#2A0000` |
| 8 | `#1C0000` |
| 9 | `#0D0000` |
| 10 (End) | `#000000` |

---

### 3. Frozen Mist

*Light Blue → White* · **Genre: Metal** · App: `palette-metal`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#ADD8E6` |
| 2 | `#B6DCEC` |
| 3 | `#C0E1F1` |
| 4 | `#C9E6F5` |
| 5 | `#D2EAF8` |
| 6 | `#DBEFFB` |
| 7 | `#E5F3FC` |
| 8 | `#EEF8FE` |
| 9 | `#F7FCFF` |
| 10 (End) | `#FFFFFF` |

---

### 4. Earth & Stone

*Brown → Stone Beige* · **Genre: Folk** · App: `palette-folk`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#A52A2A` |
| 2 | `#AA3935` |
| 3 | `#AF4841` |
| 4 | `#B4574C` |
| 5 | `#BA6757` |
| 6 | `#BF7662` |
| 7 | `#C4856E` |
| 8 | `#C99479` |
| 9 | `#CEA384` |
| 10 (End) | `#D1B28F` |

---

### 5. Monochrome Shadow

*Black → Gray* · **Genre: Alternative** · App: `palette-alternative`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#000000` |
| 2 | `#0E0E0E` |
| 3 | `#1C1C1C` |
| 4 | `#2A2A2A` |
| 5 | `#393939` |
| 6 | `#474747` |
| 7 | `#555555` |
| 8 | `#636363` |
| 9 | `#727272` |
| 10 (End) | `#808080` |

---

### 6. Minimal Espresso

*White → Brown* · **Genre: Classical** · App: `palette-classical`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#FFFFFF` |
| 2 | `#F6EBEB` |
| 3 | `#EDD8D8` |
| 4 | `#E4C4C4` |
| 5 | `#DBB1B1` |
| 6 | `#D29D9D` |
| 7 | `#C98989` |
| 8 | `#C07676` |
| 9 | `#B76262` |
| 10 (End) | `#A52A2A` |

---

### 7. Desert Rose

*Pink → Stone Beige* · **Genre: Pop** · App: `palette-pop`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#FFC0CB` |
| 2 | `#FAAEBE` |
| 3 | `#F59CB0` |
| 4 | `#F08AA2` |
| 5 | `#EB7995` |
| 6 | `#E66787` |
| 7 | `#E1557A` |
| 8 | `#DC436C` |
| 9 | `#D7315E` |
| 10 (End) | `#D1B28F` |

---

### 8. Sweet Cream

*Cherry → Vanilla* · **Genre: Latin** · App: `palette-latin`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#D2143A` |
| 2 | `#D62E4F` |
| 3 | `#DA4864` |
| 4 | `#DF637A` |
| 5 | `#E37D8F` |
| 6 | `#E797A4` |
| 7 | `#ECB1BA` |
| 8 | `#F0CCCF` |
| 9 | `#F4E6E4` |
| 10 (End) | `#F3E5AB` |

---

### 9. Sage & Churn

*Green → Butter* · **Genre: Reggae**

| Adım | Hex |
|------|-----|
| 1 (Start) | `#008000` |
| 2 | `#198F1D` |
| 3 | `#339E3B` |
| 4 | `#4CAE58` |
| 5 | `#66BD76` |
| 6 | `#7FCC93` |
| 7 | `#99DBB1` |
| 8 | `#B2EACE` |
| 9 | `#CCF9EC` |
| 10 (End) | `#F3E5AB` |

---

### 10. Eclipse Glow

*Dark Gray → Amber* · **Genre: Country** · App: `palette-country`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#333333` |
| 2 | `#4B462E` |
| 3 | `#635A2A` |
| 4 | `#7B6D25` |
| 5 | `#948121` |
| 6 | `#AC941C` |
| 7 | `#C4A818` |
| 8 | `#DCBB13` |
| 9 | `#F4CF0F` |
| 10 (End) | `#FFBF00` |

---

### 11. Midnight Static

*Near-Black → Electric Indigo* · **Genre: Hip-Hop** · App: `palette-hip-hop`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#0A0A0A` |
| 2 | `#111118` |
| 3 | `#181826` |
| 4 | `#202034` |
| 5 | `#282842` |
| 6 | `#303050` |
| 7 | `#46466A` |
| 8 | `#5C5C84` |
| 9 | `#72729E` |
| 10 (End) | `#8888B8` |

---

### 12. Blood & Bone

*Deep Red → Charcoal* · **Genre: Metal (alternatif)**

| Adım | Hex |
|------|-----|
| 1 (Start) | `#1A0000` |
| 2 | `#2D0000` |
| 3 | `#400000` |
| 4 | `#530000` |
| 5 | `#660000` |
| 6 | `#552222` |
| 7 | `#443333` |
| 8 | `#333333` |
| 9 | `#222222` |
| 10 (End) | `#111111` |

---

### 13. Neon Circuit

*Deep Navy → Electric Cyan* · **Genre: Electronic** · App: `palette-electronic`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#000814` |
| 2 | `#001433` |
| 3 | `#002052` |
| 4 | `#002C71` |
| 5 | `#003890` |
| 6 | `#0044AA` |
| 7 | `#0055CC` |
| 8 | `#0077DD` |
| 9 | `#00AAEE` |
| 10 (End) | `#00CCFF` |

---

### 14. Velvet Dusk

*Deep Plum → Dusty Rose* · **Genre: R&B / Soul** · App: `palette-rnb`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#1A0022` |
| 2 | `#2D0040` |
| 3 | `#40005E` |
| 4 | `#5A007A` |
| 5 | `#720090` |
| 6 | `#8A2A8A` |
| 7 | `#A25484` |
| 8 | `#BA7E7E` |
| 9 | `#D2A8A8` |
| 10 (End) | `#EAD2D2` |

---

### 15. Anatolian Dusk

*Deep Teal → Warm Saffron* · **Genre: Arabesque / Turkish Classical** · App: `palette-arabesque`

| Adım | Hex |
|------|-----|
| 1 (Start) | `#00111A` |
| 2 | `#002233` |
| 3 | `#003344` |
| 4 | `#004455` |
| 5 | `#005566` |
| 6 | `#336655` |
| 7 | `#667744` |
| 8 | `#998833` |
| 9 | `#CC9922` |
| 10 (End) | `#FFAA00` |


---

# EK — SEÇENEK HAVUZU (bağlayıcı DEĞİL)

> Yukarısı Rosso'nun **kararı**: canlı palet token'ları, kod ile senkron,
> bağlayıcıdır. Aşağısı **havuz**: yeni bir palet/kombinasyon gerektiğinde
> buradan seçilir. 2026-07-20'de `colours/best-colour-combos.md`'den taşındı.
> ⚠ Havuzdan bir renk seçilirken **60-30-10 ton-yakınlık testi** yapılmalı —
> bkz. `palet-denetimi-2026-07-20.md` (green-butter dersi: accent ile metin
> arasında 8° ton farkı kaldığında iki kanal tek kanala çöküyor).

Bir araya getirilmiş tüm ikili ve üçlü renk kombinasyonları. Her kombonun hex kodları ve karakteristik bir tanımı bulunur.

---

## Üçlü Kombolar (16)

### 1. Coastal Trio
`#F4FEFF` (Ice White) · `#A9C0E0` (Powder Blue) · `#0E2F76` (Royal Blue)
Açık, orta ve koyu mavi tonlarının kademeli geçişi. Sakin, deniz kenarı esintili, güven veren bir his bırakıyor.

### 2. Riviera Contrast
`#95D9C0` (Aqua) · `#FFFFFF` (Blanc) · `#D41F26` (Carmin)
Ferah bir yeşil-mavi, temiz beyaz ve keskin bir kırmızı. Akdeniz mimarisini andıran, canlı ve iddialı bir kombinasyon.

### 3. Nocturne Blues
`#0B1E4A` (koyu lacivert) · `#04326D` (Cobalt Blue) · `#B2BED6` (Mist Blue)
Tek bir renk ailesinin üç farklı tonu. Derinlikli, sakin, monokromatik bir gece atmosferi yaratıyor.

### 4. Sundown Structure
`#27262E` (Charcoal Navy) · `#E19C63` (Sandy Tan) · `#8BA5BE` (Dusty Steel Blue)
Mimari bir fotoğrafın renkleri; koyu antrasit bir zemine sıcak bir vurgu ve soğuk bir denge rengi eklenmiş. Modern, yapısal, dengeli.

### 5. Bold Citrus Blue
`#EF8E01` (Carrot) · `#0038BD` (Persian Blue) · `#EEEEEE` (Platinum) 
Turuncu ve mavinin tamamlayıcı renk çarkındaki klasik zıtlığı, nötr bir gri ile yumuşatılmış. Enerjik ama dengeli.

### 6. Beach Umbrella
`#C07F45` (Caramel) · `#FCEDD6` (Papaya Whip) · `#97C6E0` (Baby Blue)
Sıcak karamel, krem ve açık gökyüzü mavisi. Yaz, tatil ve rahatlık hissi veren yumuşak bir palet.

### 7. Deep Sea Summer
`#002B4C` (Dark Ocean Blue) · `#C0EBFF` (Ice Effect) · `#F59E71` (Summer Orange)
Koyu okyanus mavisinden buzul mavisine, oradan sıcak bir turuncuya geçiş. Soğuk-sıcak kontrastı canlı ve taze duruyor.

### 8. Burnt Caramel
`#E88C2B` (Orange Grove) · `#FEFBF3` (Calming White) · `#4E0401` (Dark Maroon)
Karamelize turuncudan koyu bordoya uzanan sıcak bir yelpaze, aradaki kırık beyazla nefes alıyor. Zengin ve sonbaharımsı.

### 9. Arctic Neon
`#50E8F4` (Fluorescent Blue) · `#C7F8FE` (Thin Air) · `#001619` (Blue Charcoal)
Parlak floresan camgöbeğinden buzlu bir açık tona, oradan neredeyse siyaha düşen dramatik bir gradyan. Dijital ve soğuk.

### 10. Late Night Amber
`#FAAA48` (Romantic Orange) · `#FFDDAC` (Peach Glow) · `#2F0F03` (Chocolate Melange)
Şehir ışıklarının sıcaklığı: amber turuncu ve şeftali tonları, koyu çikolata kahvesiyle çerçevelenmiş. Romantik, akşam vakti.

### 11. Racing Midnight
`#071317` (Midnight Edition) · `#02A0A0` (Traditional Turquoise) · `#FFBD65` (Pastel Orange)
Neredeyse siyah bir zemin üzerine canlı turkuaz ve pastel turuncu vurgular. Hız, teknoloji ve gece hissi.

### 12. Cyber Rain
`#36D2FF` (açık mavi — etiket-renk uyumsuzluğu var) · `#58D4F9` (Aquatic Frost) · `#0C1433` (Liberty Blue)
Neon camgöbeğinden koyu laciverte geçiş; yağmurlu, neon ışıklı bir gece şehri hissi.

### 13. Cherry Blossom Bold
`#2A0C1B` (Black Cherry) · `#FFE0EB` (Carousel Pink) · `#BE2C55` (Perfect Rose)
Neredeyse siyah bir mürdümden yumuşak pembeye ve canlı güle geçen dişil, dramatik bir palet.

### 14. Neon Forest Night
`#012F25` (Pitch Black Forest) · `#FAF2A0` (Yippie Ya Yellow) · `#FC7D14` (Orange Popsicle)
Koyu orman yeşilinin üzerine parlak sarı ve turuncu vuran, gece şehrinin neon tabelalarını andıran canlı bir kontrast.

### 15. Jazz Coastal
`#000080` (Deep Ocean) · `#D1B28F` (Coastal Sand)
*(İkili olarak da listelenen bu renk ikilisi, temanın "Jazz" etiketiyle üçlü listeye referans olarak eklendi.)* Lacivert ve kumun klasik, zamansız birlikteliği.

### 16. Anatolian Dusk Trio
`#00111A` (çok koyu lacivert) · `#FFAA00` (Dusk Amber)
*(İki renkli "Anatolian Dusk" kombosunun genişletilmiş hali olarak burada anılıyor.)* Gece göğü ile sıcak amber ışığın Doğu esintili zıtlığı.

---

## İkili Kombolar (33)

### 1. Arctic Calm
`#0E7490` (Arctic Teal) × `#F2F5F7` (Cloud Pearl)
Koyu, doygun bir deniz mavisi ile neredeyse beyaz bir gri-mavi. Soğuk, profesyonel, güven verici.

### 2. Terracotta Earth
`#C96A4A` (Terracotta Bloom) × `#EEDCC8` (Sand Dune)
Kızıl toprak tonu ile açık bej-şeftali. Sıcak, organik, Akdeniz esintili.

### 3. Indigo Bloom
`#2D4275` (Indigo Night) × `#D6C6F7` (Wisteria Glow)
Koyu lacivert-mor ile açık leylak. Gizemli bir zeminin üzerine romantik bir pastel.

### 4. Berry Blush
`#6B3557` (Berry Plum) × `#E9C1B7` (Blush Clay)
Koyu mürdüm ile pudra pembesi-somon. Zengin ve zarif, dişil bir denge.

### 5. Midnight Cream
`#0F172A` (Midnight Navy) × `#FFF7ED` (Soft Cream)
Neredeyse siyah lacivert ile sıcak krem. Ciddi ama davetkar, klasik bir kontrast.

### 6. Galaxy Whisper
`#2B262C` (Galaxy Black) × `#F5F1E8` (Wishful White)
Kömür-mor arası koyu ton ile kırık beyaz. Şık, minimal, sakin.

### 7. Forest Breath
`#12372A` (Forest Green) × `#EAF8EF` (Mint Mist)
Derin orman yeşili ile ferah nane tonu. Doğal, dingin, canlandırıcı.

### 8. Royal Frost
`#1D4ED8` (Royal Blue) × `#F8FAFC` (Ice White)
Canlı kraliyet mavisi ile saf beyaza yakın bir ton. Enerjik ama temiz.

### 9. Espresso Sand
`#3B2F2F` (Espresso Brown) × `#F3E8D0` (Sand Beige)
Koyu kahve tonu ile sıcak kum bej. Rahat, sıcak, ağırbaşlı.

### 10. Charcoal Cloud
`#1F2937` (Charcoal Grey) × `#F3F4F6` (Cloud Grey)
Koyu antrasit ile neredeyse beyaz gri. Modern, nötr, her yere uyan bir çift.

### 11. Ocean Brilliance
`#CAE8E8` (Ocean Water) × `#28469E` (Brilliant Blue)
Soluk deniz mavisinden parlak, doygun bir maviye geçiş. Ferah ve güvenilir.

### 12. Orange Eclipse
`#FAAE62` (Light Orange) × `#3E0856` (Dark Purple)
Açık turuncu ile koyu mor. Tamamlayıcı renklerin dramatik, güçlü bir çarpışması.

### 13. Pistel Sky
`#04344C` (Pistel Blue) × `#B0EDF9` (Sky Blue)
Koyu petrol mavisi ile açık gökyüzü tonu. Serin ve ferah, iki uçlu bir mavi paleti.

### 14. Milano Cream
`#A90E02` (Milano Red) × `#FFFBD4` (Lemon Chiffon)
Doygun kırmızı ile krem sarısı. Cesur ve iştah açıcı, klasik bir İtalyan hissi.

### 15. Signal Yellow
`#FFFE15` (Palesun Yellow) × `#0C1E29` (Uniform Blue)
Parlak sarı ile neredeyse siyah lacivert. Yüksek görünürlük, dikkat çekici, endüstriyel bir kontrast.

### 16. Sapphire Pearl
`#12697B` (Sapphire Teal) × `#F2EEE7` (Soft Pearl)
Derin camgöbeği ile yumuşak inci tonu. Temiz, kıyı esintili, premium bir his.

### 17. Copper Alabaster
`#B96443` (Copper Clay) × `#F0E2D3` (Alabaster Sand)
Sıcak bakır tonu ile açık kum rengi. Toprak esintili, editoryal, sıcak bir eşleşme.

### 18. Fern Porcelain
`#54714F` (Pine Fern) × `#F5EBDD` (Porcelain Cream)
Yosun yeşili ile porselen krem. Organik, sakin, zamansız.

### 19. Twilight Lavender
`#405092` (Twilight Cobalt) × `#CDC2F6` (Lavender Frost)
Koyu kobalt mavisi ile açık lavanta. Modern, yumuşak, premium bir kombinasyon.

### 20. Jazz Coastal
`#000080` (Deep Ocean) × `#D1B28F` (Coastal Sand)
Klasik lacivert ile sıcak kum tonu. Zamansız, caz kulüplerinin şık atmosferini andırıyor.

### 21. Crimson Eclipse
`#800000` (Bordo) × `#000000` (Siyah)
Koyu bordo ile mutlak siyah. Ağır, dramatik, blues müziğinin melankolik derinliğiyle örtüşüyor.

### 22. Frozen Mist
`#ADD8E6` (Açık mavi) × `#FFFFFF` (Beyaz)
Buzlu açık mavi ile saf beyaz. Soğuk, metalik, temiz — metal estetiğine ters bir yumuşaklık katıyor.

### 23. Earth & Stone
`#A52A2A` (Toprak kızılı) × `#D1B28F` (Taş tonu)
Kızıl toprak ile açık taş rengi. Doğal, halk müziğinin sıcak ve otantik ruhunu taşıyor.

### 24. Monochrome Shadow
`#000000` (Siyah) × `#808080` (Gri)
Saf siyah ile nötr gri. Sade, alternatif müziğin minimalist ve karanlık estetiğine uygun.

### 25. Minimal Espresso
`#FFFFFF` (Beyaz) × `#A52A2A` (Espresso kızılı)
Temiz beyaz zemin üzerine sıcak bir kızıl-kahve vurgu. Klasik müziğin zarif sadeliğini yansıtıyor.

### 26. Desert Rose
`#FFC0CB` (Pembe) × `#D1B28F` (Kum tonu)
Yumuşak pembe ile sıcak kum rengi. Pop müziğin hafif, tatlı ve erişilebilir enerjisi.

### 27. Sweet Cream
`#D2143A` (Kırmızı) × `#F3E5AB` (Krem)
Canlı kırmızı ile tatlı krem sarısı. Latin müziğinin sıcak, tutkulu ritmini çağrıştırıyor.

### 28. Sage & Churn
`#008000` (Yeşil) × `#F3E5AB` (Krem)
Doygun yeşil ile yumuşak krem. Reggae'nin doğal, rahat ve güneşli havasına denk düşüyor.

### 29. Eclipse Glow
`#333333` (Koyu gri) × `#FFBF00` (Amber)
Koyu nötr bir zemin üzerine parlak amber. Country müziğin sıcak ama toprağa basan karakterini yansıtıyor.

### 30. Midnight Static
`#0A0A0A` (Neredeyse siyah) × `#8888B8` (Mavi-gri)
Derin siyah ile tozlu bir mavi-gri. Hip-hop'un şehir gecesi, ham ve atmosferik enerjisi.

### 31. Blood & Bone
`#1A0000` (Koyu kızıl-siyah) × `#111111` (Neredeyse siyah)
İki farklı koyu tonun neredeyse ayırt edilemez birlikteliği. Metal müziğin karanlık, ağır ve yoğun atmosferi.

### 32. Neon Circuit
`#000814` (Çok koyu lacivert) × `#00CCFF` (Neon camgöbeği)
Derin, dijital bir karanlık üzerine parlak neon camgöbeği. Elektronik müziğin fütüristik enerjisi.

### 33. Velvet Dusk
`#1A0022` (Koyu mor) × `#EAD2D2` (Toz pembe)
Kadifemsi koyu mor ile yumuşak toz pembesi. R&B ve soul'un duygusal, zarif ve samimi tonu.

### 34. Anatolian Dusk
`#00111A` (Çok koyu lacivert) × `#FFAA00` (Amber)
Gece göğü mavisi ile sıcak amber ışık. Arabesk müziğin dramatik, Doğu esintili kontrastı.

---

## Kart Üçlüleri — "Koyu · Krem · Vurgu" Deseni (7)

> Sahibin derlemesi, 2026-07-21. Hepsi aynı yapısal deseni paylaşıyor:
> **koyu çapa + kırık-beyaz/krem nefes + doygun vurgu**. Yani üçü birden
> 60-30-10'un üç katmanına doğrudan oturuyor — zemin, yapı, vurgu.
>
> **Nerede kullanılabilir (fikir aşaması, kod değişikliği yok):** Recap ve
> Journey story ekranlarında **kart bazında** — her kartın kendi renk dünyası
> olur, uygulama paleti bozulmaz. Ayrıca yıl kapağı arka planı, dönem ayracı,
> vibe kartı zemini gibi anlatı yüzeylerinde.
>
> ⚠ **Uygulamadan önce iki test:** (1) 60-30-10 ton-yakınlık testi — krem ile
> vurgu arasındaki ton farkı yeterli mi (`palet-denetimi-2026-07-20.md`,
> green-butter dersi); (2) metin kontrastı WCAG AA. Bu kombolarda metin genelde
> **karttan koyu tonu ödünç alıyor** (krem kart üzerine koyu yeşil/lacivert
> yazı), açık zemine beyaz yazı değil.

### 1. Wicked Green
`#9ED14B` (Wicked Green) · `#FBFBCC` (Morrow White) · `#006887` (Orient Blue)
Asit yeşili + krem + petrol mavisi. Enerjik ama soğuk bir çapası var — mavi
yeşilin fazla "neon" kaçmasını engelliyor. Metin rengi olarak mavi kullanılır.

### 2. Orange Peach
`#EFBB91` (Orange Peach) · `#FFE0C0` (Odious Orange) · `#023441` (Natural Indigo)
Şeftali–krem sıcak yelpaze, çok koyu petrol lacivertle çerçevelenmiş.
Yumuşak, nostaljik; "eski fotoğraf" hissi. Sıcak dönem anlatıları için.

### 3. Cocoa Brown
`#2E1A1B` (Cocoa Brown) · `#FFE1CB` (Tender Rose Gold) · `#CB6116` (Brusque Orange)
Koyu kakao + pudra-şeftali + yanık turuncu. Toprak, ahşap, akustik. Folk ve
country dünyasına yakın; mevcut `palette-folk` ile akraba ama daha sıcak.

### 4. Grenadier Orange
`#D14C03` (Grenadier Orange) · `#FAFFDD` (Moon Glow) · `#B8DD60` (Comforting Green)
Yanık turuncu + limon-krem + fıstık yeşili. Üçü de doygun — en yüksek enerjili
kombo. **Dikkat:** turuncu ve yeşil birlikte baskın; birini %10 bütçesinde tut.

### 5. Covert Black
`#16171C` (Covert Black) · `#D9E4E8` (Sea Salt) · `#65ABC4` (Vintage Aqua)
Neredeyse siyah + buzlu gri-mavi + soluk aqua. Serin, temiz, teknik.
Mevcut `palette-metal` ve `palette-electronic` ile aynı ailede; bu üçü
metal/electronic recap kartlarında doğrudan kullanılabilir.

### 6. Darkout Brown
`#331A0C` (Darkout Brown) · `#FDF1D5` (Papaya Whip) · `#E45D26` (Fiery Coral)
Koyu kahve + papaya krem + mercan turuncusu. Sonbahar, gün batımı, retro baskı.
Havuzdaki [Late Night Amber](#10-late-night-amber) ve
[Burnt Caramel](#8-burnt-caramel) ile aynı sıcak yelpazenin daha kontrastlı hâli.

### 7. Midnight Purple
`#341F4B` (Midnight Purple) · `#FFD68C` (Egg Cream) · `#23B4AF` (Glass Jar Blue)
Koyu mor + yumurta sarısı krem + turkuaz. Üç ayrı renk ailesi — havuzdaki en
"üçlü" kombo. Gece, sahne ışığı, R&B/soul. Mevcut `palette-rnb` zeminiyle
(#1A0022) akraba; turkuaz orada olmayan bir üçüncü kanal açıyor.

---

**Ortak gözlem:** Bu yedi kombonun hiçbirinde **iki koyu ton yan yana durmuyor**
ve hiçbirinde krem katmanı vurgu görevi üstlenmiyor. Rosso'nun v2 paletinde
yaşadığı hata (metin ile accent aynı renge çökmesi) bu desende yapısal olarak
imkânsız — kart üçlüleri tam da bu yüzden güvenli bir başlangıç noktası.
