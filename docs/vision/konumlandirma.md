# Rosso — Konumlandırma

> **Ne:** Dış anlatı — landing, basın, yatırımcı, marka sesi.
> **İç ilkeler:** [`kimlik-ve-ilkeler.md`](kimlik-ve-ilkeler.md) · **Süzgeç:** [`kuzey-yildizi.md`](kuzey-yildizi.md) · **UI tonu:** [`uygulamali-vizyon.md`](uygulamali-vizyon.md)
>
> **Son güncelleme:** 2026-09-25 — V2: sosyal vaat kaldırıldı; kişisel kullanım konumlandırması.

---

## Kahraman vaat

**Rosso, müziğini gerçekten dinleyen insanlar için — Spotify geçmişini tek aynada toplayan ve zevkini yalnız sana anlatan, kişisel bir müzik hafızası.**

Kısa formlar (landing / deck):

> *Müzik geçmişin senin. Rosso onu anlatır.*
> *Spotify sana yılını anlatıyor. Rosso sana kendini anlatıyor.*
> *Bunu sen hatırlamıyorsun. Ama müziğin hatırlıyor.*

---

## Neden var?

Wrapped yılda bir kez, parti sonrası kaybolur. Rosso: **sürekli günlük** — saf Spotify derinliğinde, kalıcı, yargılamayan ayna. Tamamlayıcıdır; rakip değil.

**İlk kullanıcı:** Müzik kimliğinin parçası olan; export yüklemeyi göze alan; Wrapped'ı sever ama "yılın geri kalanında da olsun" diyen 20'li–30'lu dijital yerli.

---

## Aha anı

ZIP yükleme → gerçek ilerleme → dashboard dolmaya başlar. İlk katman: sevilen istatistikler (süre, top sanatçı, tür). Hemen ardından anlam ve kimlik (Taste, Recap, Journey).

**Wow:** Skor vermez; unuttuğun bir hâli geri gösterir.

Landing ve bekleme kuralları: [`uygulamali-vizyon.md`](uygulamali-vizyon.md)

---

## Kişisel vaat

Sosyal ağ değil; dating değil; feed değil; performans sahnesi değil. **Kimse seni görmez, sen kimseyi görmezsin.**

Verin sana ait, aynan sana ait: kendi Spotify geliştirici uygulamanı sen kurarsın, kendi ZIP'ini sen yüklersin. Rosso yalnızca kataloğu ve zenginleştirmeyi ortak tutar ki herkesin aynası daha doğru olsun.

Feed yok çünkü **kıyas yok, ayna var.** Paylaşmak istersen kendi çıktını (recap kartı, vibe kartı) dışarı sen alırsın; Rosso içinde bir "sahne" yoktur.

---

## Paylaşılabilir çıktılar

| Çıktı | Ne anlatır |
|---|---|
| Identity kelimeleri | Veriye dayalı "burç" |
| Living Avatar / genre hero | Dominant tür paleti |
| Aylık / yıllık recap story-deck | Dönem hikâyesi |
| Journey hero | İlk şarkı → son şarkı + anlatı |
| Top Matrix kartı | Yılın top şarkı/sanatçı/albüm |

Paylaşım sonradan eklenen özellik değil; baştan tasarlanır. Ton: kutlama, yargılama değil.

---

## Fiyatlandırma mantığı

Value-based: fiyat özellik listesi değil, kazanılan değer üzerinden.

| | Free | Pro |
|---|---|---|
| Vaat | Başlamak için | Derinlemesine, sürekli günlük |
| Recap & kimlik | ✓ | ✓ |
| Gece senkron | — | ✓ |

**Asla:** Veriyi reklam için satmak · düşük skor baskısı · verini başkalarına göstermek.

---

## Rakipler

| | Wrapped | Stats.fm | Last.fm | **Rosso** |
|---|---|---|---|---|
| Sıklık | Yılda 1× | Sürekli (tek platform) | Sürekli | Sürekli |
| Platform | Spotify | Spotify ağırlıklı | Çoklu scrobble | Saf Spotify |
| Derinlik | Yüzeysel | Derin istatistik | Log | Derin + anlatılı |
| Ton | Parti | Analitik | Nostaljik | Ayna + günlük |
| Veri | Platformda | Platformda | Scrobble | Kullanıcı export'u (Account Data) |

**Tek cümle fark:** Wrapped derinliği + saf Spotify odağı + sürekli anlatı; kişisel, feed'siz, kıyassız.

---

## Güven vaadi (özet)

- Verin senin — satılmaz, gereksiz paylaşılmaz; silince gider
- Kimse kimsenin verisini göremez (RLS); Client Secret şifreli saklanır
- Sosyal özellikler kapalı; eski sosyal veri hiçbir amaçla işlenmez

Hukuki metin: `/privacy` (KVKK aydınlatma)

---

## Kaçınılacak dil

"En iyi dinleyiciler", "keşif oranın düşük", "algoritma seni şöyle görüyor" — Rosso küçültmez. AI klişeleri (evren, kader, konfor alanı) recap'te yasak.
