# Rosso — Uygulamalı Vizyon

> **Ne:** Felsefenin ekrandaki yüzü — landing, bekleme, dil, anlatıcı, katmanlar.
> **Süzgeç:** [`kuzey-yildizi.md`](kuzey-yildizi.md) · **İlkeler:** [`kimlik-ve-ilkeler.md`](kimlik-ve-ilkeler.md)
>
> **Son güncelleme:** 2026-09-15 — taşıma CTA referansı kaldırıldı.

---

## Üç katman

```
Veri  →  Anlam  →  Kimlik
```

Örnek: Top Artist → bu dönemin sembolü → kalıcı zevkin değil, o dönemin izi.

Her metrik için sor: *Anlam var mı? Kimlik cümlesi var mı?*

---

## Landing

**Tek amaç:** *"Ben bunu görmek istiyorum"* merakı — özellik listesi değil.

- Uygulamadan bağımsız dil/motion mümkün
- Feature listesi merakın **sonrasında**
- Ana kapı özellik listesi değil, kimlik/keşif merakı; Journey görünür olmalı
- Bilinen gerilimler: [`gerilimler.md`](gerilimler.md) §Landing

Örnek iskelet (kilitli copy değil):

> 2019 → Gece dinlemeye başladın. · 2021 → Zevkin sessizce değişti. · 2024 → Bunu sen hatırlamıyorsun; müziğin hatırlıyor.

---

## Bekleme (ZIP / Journey)

- Sahte loading **yok** — mesajlar gerçek iş adımlarına ve sayılara bağlı
- Ton: "analiz ediliyor" değil; **"geçmişin okunuyor"** / **"arşiv çözümleniyor"**
- Journey 1–2 gün sürebilir; bu dezavantaj değil, ritüel

Örnek aşamalar: dosya alındı → X dinleme bulundu → dönemler ayrıştırılıyor → hikâye hazırlanıyor.

Worker ilerlemesi (`processed_events` / `total_events`) zaten ölçülüyor — uydurma sayı gerekmez.

---

## Taste

Yapı korunur: **Şu An** / **Değişmeyenler**. Güçlendirilecek: hikâyeleştirme.

| Modül | Soru |
|---|---|
| Taste | Bugün nasılsın? |
| Journey | Nasıl biri oldun? |

---

## Ürün dili

Kullanıcıya "analiz yaptığını" değil, **"onu anladığını"** hissettir.

| Öne çıkar | Gizle |
|---|---|
| hikâye, dönem, değişim, iz, anı, yolculuk, alışkanlık, ses | identity, analysis, insight, profile, behavioral signals |

Anlatıcı: **müzik** ("Seni 2019'da fark ettim"), sistem değil.

UI metinleri: `reference/ui-terim-sozlugu.md` · `reference/ui-metin-envanteri.md`

---

## Tasarım ilkesi

Rosso **sadece veri** göstermemeli:

1. Her veri → bir **anlam**
2. Her anlam → kullanıcı hakkında **yeni bir şey**

---

## Yüzey hizalama (ton listesi)

UI/copy/motion işine başlarken hizala — haftalık görev listesi değil:

- Landing merak · ZIP/Journey gerçek ilerleme · Veri→Anlam→Kimlik
- Landing frontend rehberi: `design/katmanlar/landing-page-rehberi.md`
- Jargon gizle · anlatıcı müzik sesi · Journey imza görünürlüğü
- Somut iş çıkarsa → [`plans/`](../plans/)

---

## Kontrol listesi

1. Veri'de mi duruyor, Anlam/Kimlik'e çıkıyor mu?
2. İstatistik ilk katman mı, son durak mı?
3. Landing merak mı, özellik listesi mi?
4. Bekleme gerçek mi, sahte mi?
5. Yasaklı jargon var mı?
6. Anlatıcı sistem mi, müzik mi?
