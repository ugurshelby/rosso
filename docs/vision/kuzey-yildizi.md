# Rosso — Kuzey Yıldızı

> **Otorite:** Her özellik ve öncelik tartışmasının süzgeci.
> **Uygulama:** [`uygulamali-vizyon.md`](uygulamali-vizyon.md) · **Aktif planlar:** [`plans/`](../plans/)
>
> **Son güncelleme:** 2026-09-25 — V2: kişisel, sosyal katmansız Rosso

---

## Amaç

**İnsanın müzik kimliğini en iyi anlatan uygulama** — "en çok özellik" değil.

> Spotify sana ne dinlediğini gösterir. Rosso bunu dinleyen insanı anlatır.
> Unuttuğun hâlleri müzik aracılığıyla yeniden hatırlatmak.

**Rakip:** Spotify değil; insanın kendi hafızası. ("Müziğin hafızası senden daha güçlü olabilir.")

**İstatistikler silinmez** — top artist, dakika, tür, paylaşım kartları hikâyenin **ilk katmanı**; son durak değil.

---

## Teşhis

Sorun özellik eksikliği değil — **hikâyenin ürünün her yerine aynı güçle yansımaması**.

---

## Mimari güç

Ortak müzik veri modeli → Recap, Taste, Journey, playlist aynı merkezden beslenir. Bu mimari yalnızca tek amaca bağlı kalırsa değerlidir.

| Platform | Ne gösterir |
|---|---|
| Spotify | Ne dinlediğini |
| Last.fm | Ne kadar dinlediğini |
| Soundiiz | Playlist taşıma |
| **Rosso** | Müziğin üzerinden **seni** |

Teknik detay: [`reference/teknik-mimari-referansi.md`](../reference/teknik-mimari-referansi.md)

---

## İmza: Journey

Recap = dönemsel ayna ("bu ay/yıl ne dinledin"). Journey = ömür boyu arşiv ("nasıl biri oldun"). Uzun vadeli farklılaşma adayı.

Detay: [`journey-kavrami.md`](journey-kavrami.md) · [`recap-journey-ilkeleri.md`](recap-journey-ilkeleri.md) · tasarım: [`design/katmanlar/recap-journey-design.md`](../design/katmanlar/recap-journey-design.md)

---

## Taste

**Şu An** = ruh hali ("Bugün nasılsın?") · **Değişmeyenler** = karakter ("Nasıl biri oldun?")

---

## Kişisel Rosso (V2, 2026-09-25)

**Her koyun kendi bacağından asılır.** Rosso bir sosyal ağ değil, herkesin kendine ait aynasıdır:

- Kullanıcılar **birbirini görmez, birbiriyle konuşmaz**. Profil, takip, mesaj, eşleşme, keşif yok.
- Herkes **kendi Spotify geliştirici uygulamasını** kurar, Client ID/Secret'ını girer, hesabını bağlar ve kendi ZIP'ini yükler. Kota ve sorumluluk kullanıcıda; 5 kullanıcı tavanı kullanıcı başına sıfırlanır.
- **Ortak olan yalnız altyapı:** şarkı/sanatçı kataloğu, zenginleştirme (tür, kapak, ISRC) ve yapay zekâ havuzu. Bu ortaklık kimseye kimsenin verisini göstermez; herkesin aynasını daha iyi yapar.
- Mobil uygulama açık kaynak (`rosso-mobile`): isteyen indirip kendi cihazında derler.
- Sosyal sürüm `sosyal-son` git etiketinde saklı; geri dönüş mümkün ama plan değil.

Süzgeç: **"Bu özellik bir insanın kendi müziğini kendine anlatmasına mı hizmet ediyor, yoksa başkalarına göstermeye mi?"** Sonrakine hayır.

---

## Risk ve öncelik

**En büyük risk:** özellik çöplüğü. Yeni özellik varsayılan **hayır** — önce bu süzgeç, sonra plan. Fikir deposu: [`fikir-backlogu.md`](fikir-backlogu.md) (taahhüt değil).

Teknik temel oluştu; asıl yatırım:

1. UX · 2. Onboarding · 3. Motion · 4. Yazı dili

İlk 60 saniyede "Bu uygulama neden var?" **hissedilmeli**.

---

## Yakınlık takibi

> Öznel skor + somut yüzey gözlemi. Büyük UI sprinti veya yeni modül önerisinde güncelle.

| Eksen | Hedef | Durum (2026-08) | Not |
|---|---|---|---|
| Amaç netliği | Kimlik anlatısı merkezde | ●●●●○ | Dokümanda net; vitrin hâlâ özellik listesi okuyabilir |
| Hikâye tutarlılığı | Aynı hikâye her yüzeyde | ●●○○○ | Asıl açık iş — bkz. [`gerilimler.md`](gerilimler.md) |
| Ortak veri modeli | Tek merkez → tüm modüller | ●●●●● | Mimari güçlü |
| Kişisellik (V2) | Sosyal yüzey yok, herkes kendi verisiyle | ●●●●○ | Kod budandı; landing/metinler tarandı |
| Veri→Anlam→Kimlik | İstatistik ilk katman | ●●○○○ | Bilinçli katman; uygulama kısmi |
| Journey = imza | Pazarlama + onboarding'de görünür | ●●●○○ | Canlı; landing'de zayıf |
| Özellik disiplini | Varsayılan hayır | ●●○○○ | Yol haritası hâlâ çok kollu |
| UX / copy / motion | İlk 60 sn vaat | ●●○○○ | Asıl kalite katmanı |

---

## Agent kontrol listesi

1. §Amaç'a hizmet ediyor mu?
2. Yeni özellik mi, kalite katmanı mı?
3. Journey / Taste / kimlik anlatısını zayıflatıyor mu?
4. Özellik çöplüğüne adım mı?
5. Yakınlık tablosu güncellenmeli mi?
