# Recap ve Journey — Tasarım İlkeleri

> **Ne zaman:** Bu modüllerde değişiklik planlanmadan önce.
> **Journey kavramı:** [`journey-kavrami.md`](journey-kavrami.md) · **Uygulama:** [`plans/`](../plans/) · **Tasarım:** [`design/katmanlar/recap-journey-design.md`](../design/katmanlar/recap-journey-design.md)
>
> **Son güncelleme:** 2026-08-05

---

## Tek cümle

Recap = **kutlama anı** (Wrapped enerjisi). Journey = **arşiv** (sakin gezinme). Aynı görsel dil; farklı ruh hâli.

---

## Ortak ilkeler

1. **Tekrar düşman** — Statik tek-kelime etiketler yasak; varyasyon veya farklı eksen (ruh hali, tempo). Journey anlatısında ardışık yıllar benzememeli.
2. **Backend jargonu sızmaz** — Persona, Identity, Frame, Fusion, Discovery Rate ekranda yok.
3. **Sayı tekrarı yasak** — Aynı istatistik birden fazla kartta aynı şekilde tekrarlanmaz.
4. **Navigasyon disiplini** — Recap: Stories sağ/sol dokunma (alt buton yok); Journey: dikey zaman nehri + yatay kanıt sahnesi (sağ/üst sessiz YearRail).
5. **Tam viewport** — Masaüstünde sahte mobil çerçeve yok; içerik tam ekran sahne.

---

## Recap

- Dönem kutlaması; paylaşılabilir
- Kart renkleri: dönemin sıralı baskın tür paletleri
- Kapanış: tek cümle özet + vibe; sayı tekrarı yok
- Tam ekran opsiyonel
- Kapanıştan Discover'a köprü CTA

---

## Journey

- Çok yıllık zaman çizgisi; kilit + ritüel (detay: [`journey-kavrami.md`](journey-kavrami.md))
- Dikey zaman nehri + yatay kanıt sahnesi; tarayıcının yerel kaydırma fiziği (scroll hijacking yok)
- Tam ekran **zorunlu**; minimal çıkış ve sessiz `YearRail`
- Renk: tür değil, yıl **karakteri** ve dinamik sıvı kromotografi (soğuk -> ateş -> dingin)
- Anlatı: deterministik; kullanıcı cevaplarını süslü geri sunar
- Veri güdümlü 5 sahne kompozisyonu (`baglilik`, `kesif`, `hacim`, `dagilma`, `sakin`) ve 1:1 kırpılmayan görsel garantisi

---

## Ne değil (ikisi için)

- Rakip özet kopyası değil
- AI/LLM yok
- Müzikten kişilik iddiası yok — davranış veya kullanıcı sinyali geri sunulur
