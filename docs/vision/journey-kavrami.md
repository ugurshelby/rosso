# Journey — Kavram

> **Ne:** Musical Journey modülünün kavramsal tanımı — teknik detay yok.
> **İlkeler:** [`recap-journey-ilkeleri.md`](recap-journey-ilkeleri.md) · **Felsefe:** [`kuzey-yildizi.md`](kuzey-yildizi.md) §İmza
> **Tasarım:** [`design/katmanlar/recap-journey-design.md`](../design/katmanlar/recap-journey-design.md) · **Teknik:** [`reference/teknik-mimari-referansi.md`](../reference/teknik-mimari-referansi.md)
>
> **Son güncelleme:** 2026-08-05

---

## Tek cümle

Çok yıllık dinleme geçmişini gezilebilir zaman çizgisine dönüştürüp, kullanıcının kendi anlattığı hayat hikâyesini (kariyer, aşk, sosyal çevre, genel hava) müzik verisiyle harmanlayan arşiv.

| Modül | Soru |
|---|---|
| Recap | Bu ay/yıl ne dinledin? |
| Journey | Yıllar içinde nasıl biri oldun? |
| Taste | Bugün nasılsın? |

Wrapped kopyası değil; hayatının müzik üzerinden okunabilen versiyonu.

---

## Üç katman

### 1. Kilit — Ritüel

Varsayılan **kilitli**. Açmak için tam ekran ritüel: 5 sabit soru (kariyer zirvesi, kaybolma, kendini bulma, aşk, içe kapanma) — her soruya bir veya birden fazla yıl. Tamamlanınca kilit **kalıcı** açılır.

Ritüel = kullanıcının hayatını yıllara etiketlemesi; anlatının girdisi.

### 2. Zaman çizgisi

Veri yeterli her yıl (≥500 dinleme, ≥3 aktif ay): baskın tür, çeşitlilik, keşif oranı, sadakat, top şarkı/sanatçı. Hepsi gerçek veriden — uydurma yok. Yıllar arası "en büyük kırılma" tespiti.

### 3. Anlatı

Ritüelden **ayrı** milestones anketi (yılın havası, kariyer, aşk, sosyal çevre). Cevaplar ekranda tekrarlanmaz; deterministik anlatı motoru (24 modül) edebi paragrafa çevirir. **Asla** "bunu müziğinden okuduk" demez — kullanıcının anlattığını süslü geri sunar.

**Dikkat:** Ritüelin 5 sorusu ≠ milestones'ın 4 ekseni.

---

## Ek yüzeyler

- **Bugün kartı** — en son dinlenen şarkı, taze veri
- **Evre paleti** — yıl rengi türe göre değil, dönemin evresine göre (Sessizlik, İçe Dönüş vb.)

---

## Ne değil

- Recap'in büyütülmüş hali değil
- AI/LLM kullanmaz — kural + şablon
- Müzikten kişilik "okumaz"

---

## Canlı durum

Backend + UI `/journey`'de çalışıyor. Bekleme tonu: [`uygulamali-vizyon.md`](uygulamali-vizyon.md) §Bekleme.
