# Dil altyapısı (EN ana dil + TR)

**Karar (Sahip, 2026-09-24):** uygulamanın ana dili **İngilizce**, **her şeyin**
Türkçe karşılığı var; onboarding'in ilk adımı **dil seçimi**. Gelen veri (Spotify
verisi, türler, mood adları) İngilizce kalır, çevrilmez.
Plan: `docs/plans/yeni-kullanici-deneyimi-quick-start.md` §13.

## Hızlı kullanım

```tsx
// Sunucu bileşeni
import { getT } from '@/lib/i18n/server'
const { t, tp, locale } = await getT()
<h2>{t('quickStart.title')}</h2>
<p>{tp('quickStart.cards.zip.progress', 2)}</p>          // "2 of 3 files uploaded" / "3 dosyadan 2 tanesi yüklendi"
<p>{t('quickStart.cards.zip.nextUp', { missing: 'Account Data' })}</p>

// İstemci bileşeni ('use client')
import { useT } from '@/lib/i18n/provider'
const { t, tp, locale } = useT()
```

`useT()` yalnız `<I18nServerProvider namespaces={[…]}>` içinde çalışır. Dashboard ve
onboarding layout'ları **zaten sarmalıyor** (`(dashboard)/layout.tsx`,
`onboarding/layout.tsx`). Başka bir kökte (örn. yeni bir route grubu) kullanacaksan
sen sar.

## Yeni metin ekleme (kural: bileşene GÖMÜLÜ METİN YASAK)

1. `messages/en/<yuzey>.ts` — İngilizce metin (tek doğruluk kaynağı). Yeni dosya
   açtıysan `messages/en/index.ts`'e ekle.
2. `messages/tr/<yuzey>.ts` — Türkçe karşılık. Tip `Catalog['<yuzey>']`: **eksik ya da
   fazla anahtar `tsc` hatasıdır**. Yeni dosyaysa `messages/tr/index.ts`'e ekle.
3. Yeni yüzey (üst düzey ad) eklediysen layout'taki `namespaces` listesine de ekle —
   istemciye yalnız listelenen yüzeyler gider (paket boyutu). Sunucu bileşenleri
   `getT()` ile HER yüzeye erişir.
4. Yer tutucu `{ad}` — EN ve TR **aynı yer tutucuları** taşımalı (test yakalar).
5. Çoğul: yaprak `{ one, other }` olur, `tp(key, count)` ile okunur. Türkçe'de
   ikisi genelde aynı (sayıdan sonra tekil).

Her yüzeyin **ayrı dosyası** olması iki agent'ın aynı dosyada çakışmasını önler.

### Anahtar adlandırma

Anlama göre, metne göre değil: `quickStart.zip.nextUp` ✓ — `quickStart.nextColon` ✗.
Metin değişince anahtar değişmez.

### Çevrilmeyenler

Marka/ürün terimleri (**Rosso, Spotify, Recap, Journey, Taste, Mood**) çevrilmez;
bileşende ya da sözlükte aynı yazılır. Dil adları kendi dillerinde (`English`, `Türkçe`).
Çevrilmeyen bir sözlük değeri **bilinçliyse** `i18n.test.ts`'teki `istisna` listesine
ekle (yoksa "çevrilmemiş kopya" testi düşer).

## Dil nasıl çözümlenir

`getLocale()` sırası: giriş yapmışsa **kayıtlı tercih** (`user_preferences.locale`) →
`rosso-locale` çerezi → `Accept-Language` (`tr*` → `tr`) → `en`.

- `locale IS NULL` = kullanıcı **henüz seçmedi** → onboarding dil adımı ilk adımdır.
  Durum: `getDilDurumu(userId)` → `{ locale, secildi, onerilen }`.
- Dili değiştirmek: `setLocale('tr')` (`@/lib/i18n/actions`, sunucu eylemi) → çerez +
  DB yazar. Sonra `router.refresh()`; **yeniden yükleme yok.**
- Dil çerezi **işlevsel** bir tercihtir (analitik çerez rızasına tabi değil).

## Biçimlendirme

`formatNumber`, `formatDate`, `formatRelative` (`@/lib/i18n` — saf, istemci-güvenli).
`APP_LOCALE` (`lib/locale.ts`, sabit `'en-US'`) **eskimiş** — dokunduğun yerde bunlara
geç. Tarih/sayı Türkçe kullanıcıya Türkçe biçimde görünmeli (`1.234,5`, `24 Eyl 2026`).

## Tuzaklar

- **`text-transform: uppercase` + Türkçe** → `i` → `İ` (ve tersi). `I18nServerProvider`
  alt ağacı `<div lang>` ile sarar; yine de büyük harf başlıkları Türkçe'de **gözle
  kontrol et**. Marka adı (`SPOTIFY`) için `lang="en"` işaretini elle ver.
- Türkçe metin ~%20–30 uzun: nav, düğme, kart başlığı **iki dilde** taşmamalı.
- İstemciye tam sözlük **gönderme** (`createTranslator` yalnız sunucuda; istemci
  `useT`). `full.ts`'i istemci bileşeninde import etme.
- Sunucu tarafı metinler (API hata mesajları, e-posta, worker) ayrı iş — bu denetim
  raporunda: `docs/reference/dil-denetimi-*.md`.

## Dosya haritası

| Dosya | Görev |
| ----- | ----- |
| `locales.ts` | Diller, çerez adı, `Accept-Language` çözümü (saf) |
| `messages/{en,tr}/*.ts` | Sözlükler (yüzey başına dosya) |
| `messages/types.ts` | `Catalog`, `MessageKey`, `PluralKey` — TR'nin EN'e uyumunu zorlar |
| `translate.ts` | Çekirdek çevirici (saf; sözlük DIŞARIDAN) |
| `full.ts` | Tam sözlüklü çevirici — **yalnız sunucu** |
| `server.ts` | `getLocale`, `getT`, `getStoredLocale`, `getDilDurumu` |
| `server-provider.tsx` / `provider.tsx` | Sunucu→istemci köprüsü, `useT()` |
| `actions.ts` | `setLocale` sunucu eylemi |
| `format.ts` | Dile göre sayı/tarih/göreli zaman |
