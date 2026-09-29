# Rosso Logosu — "Kuzey Yıldızı"

> 2026-09-16, Sahibin seçtiği 8 köşeli kristal yıldız motifi resmi Rosso logosu oldu.
> Kaynak: `logo pack/*.svg` (4 varyasyon, Sahip tarafından sağlandı) →
> `docs/design/rosso-kimligi/logo/` altına arşivlendi (bu klasör diğer `docs/` gibi yalnız yerel).

## Varyasyonlar

| Dosya | İçerik | Kullanım |
|---|---|---|
| `rosso-yildiz-transparan.svg` | Şeffaf zemin, yalnız yıldız (gömülü 1024×1024 raster) | **Master** — tüm ikon/favicon/OG üretiminin kaynağı |
| `rosso-yildiz-orjinal.svg` | Siyah zemin baked-in | Referans/arşiv — üretimde kullanılmadı (zemin rengi kod sabitleriyle [`ZEMIN`](../../../web/src/app/opengraph-image.tsx) birebir eşleşmiyordu) |
| `rosso-yildiz-gradyan-bg.svg` | Mor gradyan zemin baked-in | Referans/arşiv — kullanılmadı (aynı gerekçe) |
| `gradyan-arka-plan.svg` (arşivlenmedi) | Yalnız gradyan dikdörtgen, yıldız yok | Kullanılmadı — logo değil, yan ürün |

**Neden "orjinal"/"gradyan-arka-planlı" değil de kod-taraflı flatten:** Zemin rengi her yerde
(`web` OG `ZEMIN = #0a0a0f`, `mobile/app.json backgroundColor = #0A0910`) az farklı marka
sabitleriyle tanımlı. Baked-in versiyonların sabit rengi bu değerlerle piksel piksel eşleşmiyordu;
onun yerine şeffaf master her hedefin kendi zemin rengine `sharp` ile flatten edildi — tutarlılık
kod sabitlerinden geliyor, statik dosyadan değil (bkz. `opengraph-image.tsx` içindeki "neden kod,
neden statik PNG değil" notu — aynı ilke burada da uygulandı).

## Nerede kullanılıyor

| Hedef | Dosya | Boyut | Zemin |
|---|---|---|---|
| `web/src/app/favicon.ico` | ICO (16/32/48 çok boyutlu) | — | `#0a0a0f` (ZEMIN) |
| `web/src/app/icon.png` | Next.js otomatik favicon/PWA ikonu | 512×512 | Şeffaf |
| `web/src/app/apple-icon.png` | iOS ana ekran ikonu | 180×180 | `#0a0a0f` (Apple alfa kabul etmiyor) |
| `web/src/app/opengraph-image.tsx` | Sosyal paylaşım görseli, "ROSSO" yazısının yanında | 40×40 (kaynak 128×128) | Şeffaf, dinamik arka plan üstünde |
| `admin/src/app/favicon.ico`, `icon.png`, `apple-icon.png` | Aynı desen, admin de aynı markayı taşır | web ile birebir | web ile birebir |
| `mobile/assets/icon.png` | iOS/genel uygulama ikonu | 1024×1024 | `#0A0910` (Apple alfa kabul etmiyor) |
| `mobile/assets/adaptive-icon.png` | Android adaptive icon **foreground** katmanı | 1024×1024, yıldız kanvasın ~%58'i (Google'ın safe-zone kuralı — maske ne olursa olsun köşe/uç kırpılmasın) | Şeffaf (`backgroundColor` `app.json`'da ayrı tanımlı) |
| `mobile/assets/splash.png` | Açılış ekranı | 1284×1284, `resizeMode: contain` | Şeffaf |
| `mobile/assets/favicon.png` | Expo web build (kullanılmıyor ama Expo şablonu bekliyor) | 96×96 | Şeffaf |

## Üretim

Tek seferlik üretim scripti (`sharp` ile, web/node_modules üzerinden) oturum sırasında
çalıştırıldı, kalıcı bir build script değil — logo bir daha değişirse aynı adımlar elle
tekrarlanmalı: master SVG'yi `trim()` ile kırp, hedef boyuta göre kanvasın belli bir oranını
kaplayacak şekilde ortala, opak hedeflerde ilgili zemin rengiyle `flatten()` et.
