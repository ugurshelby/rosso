# Rosso Renk Token Mimarisi — OKLCH, Uyum Modelleri, WCAG

> 🔴 **HUE KAYMASI DÜZELTİLDİ (2026-08-10).** İlk OKLCH geçişi
> *"HEX ile görsel parity korunur"* diyordu; **ölçüldü, yanlıştı**:
> `--accent` hue **277.5** yazılmıştı ama `#7C5CFF`'in gerçek değeri
> **286.2** — 8,7 derece kayma, kırmızı kanalında 26 birim düşüş
> (`#7C5CFF` → `#625CFF`). Marka moru maviye kayıyordu.
>
> Tüm token'lar HEX'ten yeniden hesaplandı; geri dönüşte **fark 0**.
> `npm run audit:colors` artık OKLCH↔HEX parity de kontrol ediyor
> (kanal farkı > 2 → çıkış kodu 1). Nöbetçi kasten bozularak sınandı:
> kaymayı yakaladı.


> **Otorite sırası:** `globals.css` / `tokens.ts` (canlı değerler) → bu dosya (model ve kurallar) → `renk-paleti.md` (referans tablosu).
> **Son denetim:** 2026-08-10 · Otomatik tarama: `node scripts/audit-color-tokens.mjs`

---

## 1. İki katmanlı mimari

Rosso renkleri **primitive → semantic** zinciriyle tanımlanır. Bileşenler yalnızca semantic (ve gerektiğinde kanonik) adları kullanır; ham hex yasaktır.

```
PRIMITIVE (OKLCH / hue-chroma-lightness)
    ↓ türetme
SEMANTIC (--bg, --accent, --color-text-secondary …)
    ↓ kullanım
BİLEŞEN (var(--surface), colors.surface, color-mix)
```

| Katman | Web | Mobil | Örnek |
|---|---|---|---|
| **Primitive** | `:root` içi OKLCH yorum + hue sabitleri | `tokens.ts` üst yorum | `hue-accent: 277°` |
| **Semantic** | `--bg`, `--accent`, `--muted` | `colors.bg`, `colors.accent` | kart zemini |
| **Türev** | `color-mix`, `rgba(accent, α)` | `accentSubtle`, `dataRamp` | hover, grafik |

**Tek palet:** Deep Violet (2026-08-01). Palet seçici yok. Marketing (`marketing-theme.css`) ürün paletinden bağımsızdır.

---

## 2. OKLCH kaynak uzayı

HEX değerler **çıktı** formatıdır; yeni ton üretirken OKLCH kullanılır. Aynı hue'da lightness/chroma kaydırınca renk "kaymaz".

### 2.1 Accent ekseni (monokromatik çekirdek)

| Rol | HEX (canlı) | OKLCH (kaynak) | Not |
|---|---|---|---|
| Accent | `#7C5CFF` | `oklch(59.9% 0.230 286.2)` | Tek marka hue |
| Accent hover | `#9D84FF` | `oklch(69.1% 0.176 286.2)` | L↑, C↓ |
| Glow | `rgba(124,92,255,.25)` | `oklch(58% 0.237 286.2 / 0.25)` | Durum ışığı |

**Monokromatik nötr skala** (hue ≈ 285°, chroma düşük — mor sıcaklığı):

| Token | HEX | OKLCH | Kullanım |
|---|---|---|---|
| `--bg` | `#0A0910` | `oklch(14.5% 0.015 291.1)` | Sayfa zemini |
| `--color-bg-sunken` | `#06050C` | `oklch(10% 0.012 285)` | Çukur / zebra |
| `--surface` | `#16141F` | `oklch(17.8% 0.022 285)` | Kart |
| `--surface-hi` | `#1F1C2C` | `oklch(21% 0.028 285)` | Hover |
| `--border` | `#2A2637` | `oklch(28% 0.030 285)` | Kenarlık |
| `--border-strong` | `#3A3550` | `oklch(35% 0.035 285)` | Güçlü ayırıcı |

Saf nötr gri (`#09090B`, `#18181B`) **kasıtlı olarak kullanılmaz** — palet ısısı bozulur.

### 2.2 Metin rampası (aynı hue, lightness ile hiyerarşi)

| Token | HEX | OKLCH | Kontrast / surface |
|---|---|---|---|
| `--text` | `#F4F4F5` | `oklch(97.3% 0.002 285)` | 16,56:1 ✓ |
| `--muted` | `#A5A0B5` | `oklch(72% 0.025 285)` | 7,19:1 ✓ |
| `--faint` | `#8B85A6` | `oklch(62% 0.040 285)` | 5,20:1 ✓ (ölçüldü) |

⚠ Eski `--faint` (`#6E6980`) surface üzerinde **3,46:1** — AA altı. Dokümantasyon ve kod senkronize edildi.

---

## 3. Renk çarkı uyum modelleri

### 3.1 Monokromatik (arayüz gövdesi)

**Kapsam:** zemin, yüzey, border, metin rampası, veri yoğunluğu `--v1…--v5`.

Tek hue (277–285°) üzerinde lightness/chroma adımları. Grafiklerde `rgba(124, 92, 255, α)` rampası.

### 3.2 Analog (ikincil ışık)

**Kapsam:** `--color-accent-gold` (`#6E86FF`), atmosfer `rgba(59, 130, 246, 0.09)`.

Accent hue 277° → analog mavi ~250° (≈ −27°). Düşük doygunluk; birincil mor ile çatışmaz. **CTA veya hata rengi değildir.**

### 3.3 Tamamlayıcı (yüksek etki)

**Kapsam:** odak halkası, birincil CTA zemin/metin çifti, yıkıcı onay.

| Çift | Açı | Uygulama |
|---|---|---|
| Mor ↔ sarı-yeşil eksen | ~180° | `--accent` + `--on-accent` (`#0A0910`) |
| Uyarı | ~55° | `--color-warning` (`#F59E0B`) — accent değil |

⚠ Beyaz metin accent üzerinde **4,35:1** (hover **2,93:1**) — **yasak**. `--on-accent` koyu zemin rengidir.

### 3.4 Triadik (veri kategorileri)

Altı sabit tür rengi **120° aralıklı triadik dağılıma yakın** el ile kalibre edilmiştir:

| Tür | HEX | Hue (yaklaşık) | Aile |
|---|---|---|---|
| hip-hop | `#8B5CF6` | 258° | mor (accent akrabası) |
| pop | `#F59E0B` | 38° | sıcak |
| alternatif | `#10B981` | 163° | yeşil |
| rock | `#3B82F6` | 217° | mavi |
| elektronik | `#EC4899` | 330° | pembe |
| r&b | `#84CC16` | 84° | lime |

**Kural:** Yalnız bar, yüzde, tür etiketi. Kart zeminine, butona, navigasyona taşınmaz (`genre-colors.ts`, `categoryColors`).

Bilinmeyen türler monokrom mor rampasına düşer — ekranda 60+ rastgele renk oluşmaz.

---

## 4. Semantik ve platform renkleri

| Token | HEX | Uyum rolü | Kontrast notu |
|---|---|---|---|
| `--color-success` | `#10B981` | tamamlayıcı-yeşil | koyu metin üstünde 7,81:1 ✓ |
| `--color-warning` | `#F59E0B` | analog-sıcak | koyu metin 9,23:1 ✓ |
| `--color-error` | `#EF4444` | tamamlayıcı-kırmızı | dolu zemin — `--color-error-on` kullan |
| `--color-error-on` | `#0A0910` | koyu metin | error üstünde **8,9:1** ✓ |
| `--color-info` | `#3B82F6` | analog-mavi | bilgi şeridi |
| Platform (Spotify vb.) | marka | — | yalnız ~16–20px rozet |

**Hata/uyarı accent değildir.** Mor = konum + aksiyon; kırmızı/turuncu = bozukluk.

---

## 5. WCAG 2.1 AA denetim matrisi

Ölçüm: `scripts/audit-color-tokens.mjs` (relative luminance). Tam JSON: `renk-denetim-raporu.json`.

| Çift | Oran | AA normal (4,5) | AA büyük (3,0) |
|---|---|---|---|
| text / bg | 18,03 | ✓ | ✓ |
| text / surface | 16,56 | ✓ | ✓ |
| text / surface-hi | 15,15 | ✓ | ✓ |
| muted / surface | 7,19 | ✓ | ✓ |
| faint / surface | 5,20 | ✓ | ✓ |
| faint / surface-hi | 4,76 | ✓ | ✓ |
| on-accent / accent | 4,56 | ✓ | ✓ |
| on-accent / accent-hover | 6,78 | ✓ | ✓ |
| white / accent | 4,35 | ✗ | ✓ |
| text / error (dolu zemin) | 3,42 | ✗ | ✓ |

**Uygulama kuralları:**

1. Hata mesajında renk **tek başına** anlam taşımaz — ikon + metin zorunlu.
2. `--color-error` dolu buton/şeritte metin `--on-accent` veya `#0A0910` kullanır; açık metin yalnız büyük başlık/şerit için.
3. Yeni çift eklerken eşiği **en açık zemine** göre ölç (`--surface-hi`, hover).
4. Renk körlüğü: kategori grafiklerinde legend/etiket zorunlu.

---

## 6. İstisna bölgeleri (hex serbest)

| Bölge | Dosya | Neden |
|---|---|---|
| Token kaynağı | `globals.css`, `tokens.ts` | tek otorite |
| Tür tablosu | `genre-colors.ts` | 6 sabit kategori |
| Mood tint | `mood-tints.ts` (web+mobil) | 5 atmosfer rengi — triadik dağılım |
| Journey dönem paletleri | `journey-palette.ts` | anlatı katmanı |
| Profil genre gradyanları | `ProfileHeader.tsx` | kapak sanatı |
| Marketing | `marketing-theme.css` | ayrı katman |
| Letterbox siyah | `colors.canvasBlack` | recap kapak 1:1 çerçeve |
| `color-mix` çapaları | `#000`, `#fff` | matematiksel karışım, marka rengi değil |

---

## 7. Yeni renk ekleme protokolü

1. **Semantic ihtiyaç mı?** Mevcut token + `color-mix` yeterli mi?
2. **OKLCH'de türet** — hue'yu accent (277°) veya semantik aileden koparma.
3. **Kontrast ölç** — `node scripts/audit-color-tokens.mjs` matrisine satır ekle.
4. **İki platform** — `globals.css` + `tokens.ts` aynı turda güncellenir.
5. **Dokümantasyon** — `renk-paleti.md` tablosu + bu dosya §2–§5.

---

## 8. İlgili dosyalar

| Dosya | Rol |
|---|---|
| [`renk-paleti.md`](renk-paleti.md) | HEX referans tablosu, genre gradyan havuzu |
| [`renk-denetim-2026-08-10.md`](renk-denetim-2026-08-10.md) | İnsan okunur denetim raporu |
| `renk-denetim-raporu.json` | Makine çıktısı |
| `palet-denetimi-2026-07-20.md` | Ton-yakınlık dersi (green-butter) |
| [`../referans/60-30-10-renk-kurali.md`](../referans/60-30-10-renk-kurali.md) | Oran disiplini |
| [`../katmanlar/dashboard-design.md`](../katmanlar/dashboard-design.md) §3 | Accent kullanım kuralları |
