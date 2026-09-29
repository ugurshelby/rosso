# Rosso — Kimlik ve İlkeler

> **Kitle:** Agent, geliştirici, proje ortakları.
> **Teknik detay:** [`reference/teknik-mimari-referansi.md`](../reference/teknik-mimari-referansi.md) · **Aktif planlar:** [`plans/`](../plans/)
>
> **Son güncelleme:** 2026-09-25 — V2: kişisel, sosyal katmansız ürün tanımı.

---

## Rosso nedir?

**Amaç:** Müziğin üzerinden insanı anlatmak — özellik sayısı değil, kimlik anlatısı.

**Ürün:** Spotify Account Data ve yıllara yayılan dinleme geçmişi üzerinden Taste · Recap · Journey ve playlist üreten, **kişisel kullanım için** saf Spotify uygulaması (web + açık kaynak mobil). Sosyal katman yoktur; kullanıcılar birbirini görmez. Katalog, zenginleştirme ve yapay zekâ ortak havuzdur; hesap ve Spotify geliştirici uygulaması kullanıcıya aittir (BYOC). Platform taşıma/migration özelliği yoktur — Rosso Spotify dışı hiçbir platforma bağlanmaz.

Felsefe: [`kuzey-yildizi.md`](kuzey-yildizi.md) · Dış anlatı: [`konumlandirma.md`](konumlandirma.md)

---

## İki kişilik

| Kişilik | Hissiyat | UI |
|---|---|---|
| **Veri laboratuvarı** | Otoriter, sakin, koyu | Tabular sayılar, monospace metadata, Bento kartlar |
| **Müzik platformu** | Tanıdık, ergonomik | Cover art, track satırları, platform rozetleri |

Omurga = güven; yüzey = ilişki. Çatışmazlar.

Tasarım otoritesi: [`design/rosso-kimligi/rosso-design-system.md`](../design/rosso-kimligi/rosso-design-system.md) (giriş: [`design/README.md`](../design/README.md))

---

## Ürün ilkeleri

0. **Kimlik anlatısı > özellik** — "Müzik kimliğini anlatmaya hizmet ediyor mu?" testi
0b. **Veri → Anlam → Kimlik** — İstatistik ilk katman; sadece veri gösterme yasak
0c. **Ürün dili** — Bkz. [`uygulamali-vizyon.md`](uygulamali-vizyon.md) §Ürün dili
1. **Netlik > süsleme** — Efekt bilgiyi netleştirmiyorsa gider
2. **Tutarlılık > tekil yaratıcılık** — Aynı iş, aynı görünüm
3. **Affedici UI** — Yıkıcı işlemde 5 sn Undo; boş ekran yok
4. **ISRC = tek doğru kaynak** — Cross-platform eşleşme; platform ID ikincil
5. **Veri kaybı yok** — Eşleşmeyen track silinmez; atlananlar `skipped=true`
6. **Platform izolasyonu** — Bir servis çökerse ana sistem ayakta
7. **Kullanıcı kahramandır** — Rosso ayna ve sahne
8. **Lehine çerçeveleme** — Metrik küçültmez
9. **Kıyas yok, ayna var** — Feed yok, sosyal yüzey yok (değer kararı)
10. **Güven zemindir** — Kimse kimsenin verisini görmez; sırlar şifreli
11. **Kalite katmanı öncelikli** — UX, onboarding, motion, copy; yeni özellik varsayılan hayır

---

## Teknik ilkeler

- TypeScript strict — `any` yasak
- DB değişikliği yalnızca `supabase/migrations/`
- Servis izolasyonu — graceful degradation
- Cascade delete — kullanıcı silinince tüm veri gider (silme işareti `account_deletions`, sosyal profilden bağımsız)
- DB değişiklikleri yalnızca eklemeli; sosyal tablolar durur (`sosyal-son` etiketine dönüş mümkün kalsın)
- Hassas veri DB'ye yazılmaz (`ip_addr` vb.)
- Service role sırları yalnızca server-side (client bundle'a asla sızmaz)

---

## Tasarım özeti

- Dark-first; saf siyah (`#000`) ve generic AI slop yasak
- 60-30-10 renk · 8pt grid · Canvas vs Index yoğunluk modları
- WCAG kontrast · 44px dokunma · focus ring
- Paylaşım yerleşik tasarlanır (Living Avatar, identity kelimeleri)

**Tipografi:** Archivo (display) · Hanken Grotesk (body) · Geist Mono / JetBrains Mono (metadata)

---

## Marka tonu

- **Rosso** — İtalyanca "kırmızı"; garnet/amber sıcaklığı
- Premium ama cezalandırıcı değil; veri ciddiyeti + müzik sıcaklığı
- UI Türkçe (`lang="tr"`)
