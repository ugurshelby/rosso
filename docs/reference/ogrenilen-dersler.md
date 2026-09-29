# Öğrenilen Dersler — Kuralların Arkasındaki Canlı Bedeller

> Bu dosya **otorite değildir**; `CLAUDE.md`'deki kuralların *neden* var olduğunu saklar.
> Kural CLAUDE.md'de, gerekçe burada. Yeni bir canlı hata yaşanınca kural CLAUDE.md'ye
> tek satır olarak, hikâyesi buraya yazılır.

---

## 1. Doğru kaynağa sahip araç da yanılır → `CLAUDE.md` «Ölçüme güven»

NotebookLM'in elinde gerçek Spotify/YouTube dokümanları vardı ve yine de yanlış cevap verdi.

| İddia | Gerçek |
|---|---|
| "Spotify toplu uç `/v1/tracks?ids=` çalışıyor" | **403 Forbidden** — tekil uç gerekiyordu; cron ilk turda patladı |
| "duration_ms = 0 → çalınamaz içerik" | Değer **NULL**'du; kök neden bizim kodumuzdaydı |
| "31 fonksiyon `anon`'a açık" | **28'i güvenliydi**; gerçek açık yalnız 3'ündeydi |

**Daha kötüsü:** iddia teste çevrildiğinde test yanlış gerçeği korur.
`test_fetch_batch_50lik_tek_istek_atar` geçiyordu — koruduğu davranış canlıda 403 alıyordu.

Aynısı kendi kodum için: plan limiti `least(NULL, …)` yüzünden sessizce etkisizdi; ancak
uygulamadan sonra ölçünce görüldü.

---

## 2. Spotify 6,4 saatlik ceza (2026-07-12) → `kural-veritabani-islemleri.md` §1

**Zincir:** Toplu uç 403 verdi → tekil uca geçtim → tekil uç **50 kat fazla istek** demek →
cron 50 isteği arka arkaya attı → platform uygulamayı **6,4 saat** cezalandırdı. Tek bir yavaş
istek bile 429 aldı; görseller ve zenginleştirme de durdu. 403'ü çözerken daha büyük bir sorun
yarattım.

**Daha kötüsü:** `catalog_backfill` cooldown'ı hiç kullanmıyordu. Altyapı 0010'dan beri vardı;
kod 429 yiyor, DB'ye yazmıyor, 10 dk sonra yine deniyordu — **cezayı kendi kendine besliyordu.**

**Ders:** 50 kat artış masum bir değişiklikle sessizce gelir. Toplu iş yazarken "bu kaç istek
atıyor?" sorusu zorunlu.

---

## 3. Supabase REST kırpması — sessiz kullanıcı kaybı (2026-07-17) → `kural-veritabani-islemleri.md` §2

**Belirti:** Bir kullanıcının recap'i VE taste'i hiç üretilmedi — hiçbir hata, hiçbir log satırı yok.
İki ayrı cron'da aynı bug, aynı gün.

**Kök neden:** `recap_runner` ve `taste_runner` kullanıcı listesini
`play_events.select("user_id").limit(100000)` ile çekip Python'da `set()` ile tekilleştiriyordu.
Supabase REST ~1000 satırda **sessizce kırpıyor** (hata yok, `.limit(100000)` yazsan bile).
253k satırlık `play_events`'te bu, yalnız **en eski** kullanıcıların görünmesi demekti; tabloda
geç satırlarda olan 2. organik kullanıcı iki cron'dan da düşüyordu.

**Neden yakalanması zor:** Cron `{"outcome":"success","errors":0}` diyordu — işlediği kullanıcılar
için gerçekten başarılıydı. Eksik olan, hiç görülmeyen kullanıcıydı.

**Çözüm:** DB tarafında `DISTINCT` yapan RPC — `recap_user_ids()`, migration 0102.
"Limit'i büyütürsem çözülür" varsayımı yanlış: REST kendi tavanını uyguluyor.

---

## 4. REVOKE boilerplate'i — 7 kez tekrarlayan desen (0052…0106) → `kural-veritabani-islemleri.md` §4

`CREATE FUNCTION` sonrası PUBLIC+anon otomatik EXECUTE alıyor, `REVOKE ... FROM public` satırı
unutuluyordu. Desen en az 7 migration'da tekrarladı. **2026-07-18'de sınıf yapısal olarak
kapatıldı** (0107-0109): global + şema default-privilege'leri söküldü. Canlı probe ile doğrulandı:
yeni fonksiyon ACL'i `{postgres, authenticated, service_role}`.

0113 ile eski `SET search_path` eksikleri kapatıldı; advisor `function_search_path_mutable`
uyarısı sıfırlandı.

---

## 5. Forward-fix disiplininin gerekçesi (2026-07-27) → `kural-veritabani-islemleri.md` §3

**Sahip:** *"Veritabanında bir hata olsa dahi hiçbir veriyi kaybedemeyiz, o yüzden kör kütük
işlem yapılamaz."*

Sahip SQL/DB'ye hâkim değil ve sık sık "sürekli uygula, onaylıyorum" diyor — bu yüzden **tek
koruma katmanı benim disiplinim.** Migration'lar `apply_migration` ile doğrudan tek canlı DB'ye
gidiyor; ayrı lokal DB yok, yani her migration production'dır.

Canlı doğru desen: `0028_fix_...`, `0105_fix_...`.
0138 dersi: CHECK güncellenmezse yeni `run_type` ile cron ilk turda **sessizce** patlar —
`record_run`'ı canlı test kaydıyla denemek şart.

---

## 6. Katman katman büyütme prensibi (2026-07-16) → `CLAUDE.md` «Önce basit çalışan hâl»

**Sahip:** *"Önce çalışan en basit hâlini yap, sonra istediğimiz kompleksiteye getirene kadar
çalışan katmanın üstüne sağlam adımlarla kat kat çık."*

**Gerekçe:** Kompleks hedefi tek adımda kurmak iki riski birleştirir — "ölçmeden varsayma" ve
"tahminle kod yazma". Basit hâl çalışırken her yeni katman kendi başına doğrulanabilir; hata
nerede belli olur. Tek dev adımda kurulursa hatanın hangi parçadan geldiği belirsizleşir.

---

## 7. Frontend kararlarının gerekçeleri → `kural-frontend-akisi.md`

**Katman + skill zorunluluğu (2026-07-20).** Sahip: *"Her frontend işinde hangi katmanda iş
yapılıyorsa o katmanın design.md'sine uygun iş yapılmalı, skill kullanılsa da buna biat etmeli."*
Ve: *"Ben bir frontend işi verdiğimde bunu otomatik olarak uygun skilleri kullanarak design
klasörü içeriğinden yararlanarak yapmanı istiyorum."*

**Genel skill yasağı kaldırıldı (2026-07-20).** Öncesinde `rosso-frontend` genel skilleri
yasaklıyordu; bu, kalite düşüşünün kök nedeniydi.

**Screenshots skill'i kaldırıldı (2026-07-20).** Sahip: *"iyi çalışmıyor, kullanılmasın"*,
ayrıca *"inanılmaz yavaş"*. Bu bir kısıt değil kalibrasyon: bir gün "test geçti" deyip bitmiş
saydığım recap işi ertesi gün canlıda bozuk çıktı.

**Test sıklığı (2026-07-27).** Sahip: *"Bu tür testleri her faz sonunda değil, ben istedikçe
uygula. Büyük bir UI işini gece oturumunda bıraktım — sen tüm kodu yaptıktan sonra testi
yaparsın, tüm hataları görür düzeltirsin. Her fazda yapmak işi gereksiz yavaşlatıyor."*

---

## 8. Belge düzeni kararları → `docs/README.md` «Belge Yaşam Döngüsü»

**İç klasörleme yok (2026-07-19).** Sahip: *"plan varsa henüz uygulanmamıştır, yani zaten
aktiftir."*

**`archive/` neden var (2026-07-19).** Geçerliliğini yitiren ama çöpe atmak istemediğimiz
dosyalar: *"belki ilerde lazım olur diyebileceğimiz türde."* Silme değil taşıma.

**Paralel hiyerarşi istenmiyor.** Sahip: *"bize paralel bir ikilik yaratıyor, bunu sevmiyorum."*

---

## 9. İnceleme belgesi kendi ölçümünü eskitti (2026-07-31) → `docs/README.md` «İnceleme belgesi»

**Bedel:** `performans-olcumleri.md` **4.447 satır** oldu — CLAUDE.md'nin (214) **21 katı.**
Yazması uzun sürdü, çok token yedi. Buna rağmen **kapsamlı olması onu doğru yapmadı.**

**Belgenin kendi içinde dört düzeltme turu var** — ve her tur bir öncekinin *ölçülmemiş*
iddiasını çürüttü:

| Tur | Ne çürüdü |
|---|---|
| II | "EXPLAIN = en iyi durum, pg_stat = gerçek durum, fark önbellek" → **yanlış.** Önbellek isabeti %100'dü; suçlu değişken CPU (14 kat oynaklık) |
| II | Cron bütçesi bölümü **hiç yoktu** — belge tüm ağır işi cron'a taşıyıp maliyetini hesaplamamıştı |
| III | "refresh_user_taste 5107 ms" → **505 ms.** İlk sayı **2 örneklik** ölçümdendi |
| IV | Ölçek alarmı ("1.000 kullanıcıda 10 saat") → tasarım kararlarıyla ~3 saate indi |

**Ve uygulama turunda bir kez daha:** Paket #3'ün kapsamı belgede
`user_hourly_play_counts` + `recap_hourly_pattern` yazıyordu. Gerçek:
- Birincisi **zaten paket #2'de çözülmüştü** — kapsamın yarısı boşunaydı
- Belgedeki **1342 + 988 ms**, kimlikli ölçümde **126 + 61 ms** çıktı — **14 kat abartı**
- Sözleşmedeki anahtar (`user`) **yanlıştı**; her iki RPC de dönem parametresi alıyordu

Yani hatalar belge *daha çok yazılarak* değil, **o kısım yeniden ölçülerek** bulundu.

**Sahibin teşhisi:** *"Belge en iyi olmaya çalışsa da gözden kaçırdığı ve ancak o kısım
yeniden incelendiğinde fark edilen hatalar oldu. Bu denli karmaşık ve kapsamlı olmasına
gerek bile yokmuş — ana başlıkları, yöntemi, kalite ve güvenlik standartlarını içerse
yeterliymiş. Amaç, yöntem, kural bazlı olsa yeterliymiş."*

**Kök neden:** Ölçüm **bozulur**, yöntem bozulmaz. Belge ölçümü *dondurdu* ve dondurduğu
her sayı, okunduğu anda yanlış olma riski taşıdı. 4.447 satırın büyük kısmı bir günlük
`pg_stat_statements` fotoğrafıydı; kalıcı olan kısım ise birkaç sayfalık **yöntem**:
tazelik sınıfları (A/B/C/D), paket sözleşmesi, "paket yoksa hazırlanıyor" kuralı.

**Daha kötüsü — ölçülen sayı kod yorumuna kaçtı:** `insights-row.tsx`'te *"çok
platformluların oranı %91"* yorumu var. Canlı ölçüm: 3 gerçek kullanıcının **üçü de tek
platformlu.** Yorum yazıldığı gün doğruydu; bugün yanlış ve **kimse fark etmedi.**

**Ders:** Belge ne yapılacağını ve hangi standartla yapılacağını yazar; **kaç milisaniye
sürdüğünü yazmaz** — onu ölçüm anında sorgular. Sayı belgeye girecekse yanına ölçüm
tarihi ve *"karar anında yeniden ölç"* damgası girer.

---

## 10. Kararsız (flaky) test avı — üç ayrı kök neden (2026-08-25)

Test paketi haftalardır *"4 tur üst üste geçiyor ama tek turda rastgele bir
test kırılıyor"* diye not düşülmüştü. Av yapıldı; **tek bir sebep değil,
üç ayrı sebep** çıktı — ve biri ölçüm aracının kendisiydi.

### ⚠ Önce: ölçüm aracım beni yanılttı

İlk turlar `npx vitest run --reporter=basic` ile koşuldu ve **"6 tur temiz"**
sonucu alındı. Oysa vitest v4'te `basic` reporter'ı **yok**:

```
Error: Failed to load custom Reporter from basic
```

Yani testler **hiç koşmamıştı**; çıkış kodu 0 olduğu için "geçti" sanıldı.
`grep`'in eşleşme bulamaması da "kırık yok" gibi okundu.

> **Ders:** *"Başarılı döndü"* kanıt değildir — çıkış kodu 0, boş grep
> çıktısı ve "hata görmedim" üçü de aynı yanılgının farklı yüzü.
> Bir koşumun GERÇEKTEN koştuğunu, koştuğu test SAYISINI görerek doğrula.

### Kök neden 1 — `.next/static` canlı bir dizin (ENOENT yarışı)

`bundle-secrets.test.ts` `.next/static`'i gezip her `.js` dosyasını okuyor.
`readdirSync` ile `readFileSync` **arasında** `next dev`/`next build` bir
dosyayı silerse okuma `ENOENT` fırlatır.

Ayrı bir betikle kanıtlandı: *listele → sil → oku* sırası hatayı üretiyor.
35 dosya tarama sırasında silindiğinde eski kod çöküyor, yeni kod 34
dosyayı tarayıp geçiyor.

Düzeltme: hem gezinme hem okuma kaybolan girdiyi atlar. **Ama** nöbetçi
sessizce ölmesin diye `taranan > 0` şartı eklendi — yarışı tolere etmek,
"hiç tarama yapmadan geçti" demeye dönüşmemeli.

Aynı desen üç dosyada vardı: `src/lib/security/bundle-secrets.test.ts`,
`apps/admin/src/lib/admin/bundle-secrets.test.ts`,
`src/lib/security/platform-token-erisimi.test.ts`.

### Kök neden 2 — `vi.mock` + `vi.doMock` yarışı

`api-auth.test.ts`'te iki mock aynı modülü hedefliyordu:

```ts
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))  // → undefined döner
...
vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: … }) }))
```

`vi.mock` **hoist edilir** ve modül kaydına önce o yerleşir; `vi.doMock`
yalnız kendinden sonraki import'ları etkiler. `resetModules()` telafi
etmeye çalışıyordu ama 82 dosyalık paralel koşuda kayıt bazen statik
mock'ta kalıyor ve hata gerçek sebepten UZAKTA patlıyordu:

```
TypeError: Cannot read properties of undefined (reading 'auth')
❯ src/lib/auth/index.ts:22  await supabase.auth.getUser()
```

Yığın izi `index.ts`yi gösteriyor — oysa kusur testin mock kurgusunda.
Düzeltme: statik mock kaldırıldı, `doMock` tek otorite. Ayrıca **mock
gerçekten bağlandı mı** diye bir nöbetçi eklendi; bağlanmazsa hata
okunur bir mesajla, doğru yerde patlar.

> **Ders:** Aynı modülü hem `vi.mock` hem `vi.doMock` ile mocklama.
> Birini seç. Hata yığın izinin gösterdiği dosya, kusurun bulunduğu
> dosya olmayabilir.

### Kök neden 3 — ölü kod yanlış güven verir

Aynı dosyada `getCurrentUserMock` tanımlıydı ve **hiçbir yerde
kullanılmıyordu**. Okuyan biri "kullanıcı mock'lanıyor" sanır. Kaldırıldı.

### Yöntem notu

Kararsız test tek koşumda yakalanmaz. Doğru yöntem: **aynı komutu N kez
koş, her turun çıktısını AYRI dosyaya yaz**, sonra kırık turu bul ve tam
hata metnini oku. Özet satırı (`Tests 683 passed`) hangi testin kırıldığını
söylemez.

---

## 11. Railway öldükten sonra worker'ı hiç tetiklemeyen 2 sessiz dosya (2026-09-15) → `01-yillik-kontrolsuz-calisma-plani.md`

Railway (7/24 worker) sonlandırılınca, GitHub Actions'ın `python -m app.pipeline.export_runner` ve `python -m app.pipeline.genre_runner` çağırdığı **iki modülde `if __name__ == "__main__":` hiç yoktu**. Workflow tetiklendiğinde her ikisi de fonksiyon/sınıf tanımlamak dışında top-level kod içermediği için **sessizce hiçbir iş yapmadan `exit 0` ile kapanıyordu** — CI/log'da "başarılı" görünen bir hiçlik. Gerçek iş mantığı (`app.cron.export.run_export_burst()`) başka bir dosyada, hiçbir `__main__`'e bağlı olmadan duruyordu.

**Ayrı bulgu, aynı oturum:** `pg_cron`'un `cron.job_run_details.status = 'succeeded'` demesi yalnızca SQL fonksiyonunun (genelde `net.http_post` ile bir isteği KUYRUĞA ALMASININ) hatasız dönmesi demektir — çağrılan HTTP endpoint'in gerçekten `200` döndürdüğünü **garanti etmez**. Gerçek kanıt `net._http_response` tablosunda `status_code` sütunudur. "succeeded" yazan bir cron, arkasında sessizce 401/500 alan bir endpoint'i aylarca gizleyebilir.

**Ders:** "Bu script/cron çalıştı" iddiası iki ayrı katmanda yanıltıcı olabilir — (1) betiğin gerçekten bir giriş noktası var mı (yoksa "başarı" boş bir kabuktur), (2) dış çağrı gerçekten istenen sonucu verdi mi (yoksa "başarı" yalnızca kuyruğa alma başarısıdır). İkisi de yalnızca CI/cron log satırına bakarak değil, **fiili giriş noktasını (`if __name__`) ve fiili HTTP yanıtını (`net._http_response`) okuyarak** doğrulanır.

---

## 12. Devre dışı bir cron, açık bir bug'dan daha tehlikeli olabilir (2026-09-17) → `guvenlik.md`

Genel güvenlik denetiminde `mcp__supabase__get_advisors` ve `cron.job` sorgusu hiçbir "hata" göstermiyordu — `rosso-account-purge-cron` sadece `active: false` idi, sistem bunu bir arıza olarak işaretlemiyordu. Yüzeysel bakışta "8 cron aktif, 1 pasif" nötr bir istatistik gibi görünür.

**Gerçek risk migration geçmişindeydi:** `0299_maintenance_cron_ts_gecisi.sql` satır 122-144, bu cron'u **bilinçli olarak** `active := false` ile zamanlamış, yorum satırında "account_purge yine INAKTİF" diye açıkça belirtmişti. Ama hesap silme akışı (`account/delete/route.ts`) kullanıcıya 30 günlük "hesabın silinecek" vaadini veriyordu — vaadi yerine getirecek olan tam da bu cron'du. Cron kapalıyken bu, KVKK/GDPR "unutulma hakkı" açısından **sessiz bir uyumsuzluktu**: sistem hata vermiyordu, sadece söz verdiğini yapmıyordu.

**Neden yakalanması zor:** Advisor'lar ve health check'ler "bu cron çalışıyor mu" sorusuna cevap verir, "bu cron'un çalışmaması ne anlama geliyor" sorusuna değil. İkincisi yalnızca cron'un **çağırdığı iş akışının ürün/hukuki vaadini** bilerek sorulabilir bir soru.

**Ders:** Bir cron/job'un `active: false` olması başlı başına bir bulgu değildir — ama migration geçmişinde "neden" sorusunun cevabı yoksa (ya kasıtlı hem de belgelenmemiş, ya da unutulmuş), o "neden" bulunana kadar dokunulmamalı. Bulunca da (bu örnekte: bilinçliydi ama vaat edilen bir özelliği sessizce devre dışı bırakıyordu), karar **DB'ye hâkim olmayan** paydaşa (Sahip) açıkça sorulmalı — CLAUDE.md'nin "geri alınamaz DB işlemleri öncesi dur ve sor" kuralı tam olarak bu senaryo için var.

---

## 13. Örneklem denetimi, denetim değildir (2026-09-17) → `guvenlik.md` §11.1

`guvenlik.md` (2026-09-16) 82 SECURITY DEFINER fonksiyondan **4'ünü** açıp (`get_track_detail`, `mark_message_read`, `mesaji_geri_al`, `end_conversation`) hepsinde `auth.uid()` sahiplik kontrolü bulmuş ve maddeyi *"örneklenen kısmı sahiplik kontrollü"* diye kapatmıştı. Cümle dürüsttü — ama okunduğunda bıraktığı izlenim "bu eksen temiz"di.

**Ertesi gün 82'sinin tamamı okununca:** 78'i gerçekten temizdi, 3'ü değildi. En ağırı `merge_track_into` — hiçbir sahiplik kontrolü olmayan, `DELETE FROM play_events` / `DELETE FROM tracks` içeren, **tüm kullanıcıların** satırlarını kapsayan bir fonksiyon. RLS `authenticated` rolüne bu tablolarda UPDATE/DELETE yetkisi vermiyordu; bu fonksiyon o yetkinin tek yoluydu ve herkese açıktı. Giriş yapmış herhangi bir kullanıcı tüm dinleme geçmişini ve katalogu kalıcı silebilirdi.

**Neden örneklem yanılttı:** Seçilen 4 fonksiyon *aynı ailedendi* — hepsi kullanıcıya dönük okuma/mesaj uçlarıydı ve hepsi aynı guard şablonuyla yazılmıştı. Açık olan 3'ü ise başka bir aileydi: worker/ETL yardımcıları. Bunlar `authenticated`'a hiç açık olmamalıydı, `EXECUTE` yetkisi unutulmuştu. Yani örneklem, popülasyonun **çeşitliliğini** değil, tek bir kümesinin tekrarını ölçmüştü.

**Ders:** "N tanesinden K'sını kontrol ettim, temiz" bir kapsam ifadesidir, bir sonuç değil. Güvenlik ekseninde örneklem yalnızca *desenin varlığını* kanıtlar, *istisnanın yokluğunu* kanıtlamaz — ve açıklar tam da istisnalarda yaşar. 82 fonksiyon tek oturumda okunabilecek bir sayıydı; "örnekleyip geçmek" zaman tasarrufu değil, ertelenmiş risktir. Bir eksen ancak **sayılabilir ve sayısı tükenmiş** olduğunda kapatılabilir.


---

## 14. "Başarılı" adım, işin yapıldığının kanıtı değil — doğru katmanda ölç (2026-09-18) → `logs/2026-09-18.md`

Tek bir günde, birbirinden bağımsız dört iş aynı biçimde yanılttı. Dördü de yeşil/başarılı görünüyordu:

| Görünen | Gerçek |
| :--- | :--- |
| Secret girildi (GitHub arayüzü onayladı) | **Codespaces** kasasına girildi; workflow yalnızca **Actions** kasasını okuyor |
| `apt-get install postgresql-client-17` — adım YEŞİL | `ubuntu-latest`'te önceden kurulu 16 PATH'te önde; `pg_dump` hâlâ 16'yı çağırıyordu |
| Gece cron'u recap'leri üretiyor, hata yok | 5. kartın `image_url`'ü hiç yazılmıyordu; kartın yarısı aylardır boştu |
| GitHub App "silindi" | Sayfa yenilenince listede duruyordu |

**Ortak mekanizma:** Her birinde bir *proxy* ölçüldü, sonucun kendisi değil. Arayüzün "kaydedildi" demesi, doğru kasaya kaydedildiğini; `apt-get`'in 0 dönmesi, o binary'nin çalışacağını; cron'un hatasız bitmesi, payload'ın dolu olduğunu **söylemez**. Üçünde de hata, sebebinden *bir veya iki katman sonra* yüzeye çıktı — pg_dump örneğinde kurulum adımı yeşil yanıp iki adım sonraki dump adımı patladığı için, ilk bakışta yanlış yerde arandı.

**Recap örneğinin ayrı bir katmanı vardı:** `RecapDiscoveryPayload` tipi `top_track`/`top_artist` alanlarını hiç tanımlamıyordu, kart tarafındaki tip ise onları opsiyonel yapmıştı. Atama derlendi. **Tip eksik olduğu için derleyici, üreticinin bu alanları yazmadığını yakalayamadı** — eksik bir tip, yanlış bir tipten daha sessizdir.

**Ders:** Bir işin yapıldığını iddia eden katman ile sonucu tüketen katman farklıysa, **tüketen katmanda** doğrula: `gh secret list --app actions` (workflow'un baktığı kasa), `pg_dump --version` (çalışacak binary), `naturalWidth > 0` (tarayıcının gerçekten yüklediği görsel), sayfayı yenile (sunucunun bildiği liste).

**Kalıcı hale getirmenin yolu, doğrulamayı sebebin olduğu adıma gömmektir:** `db-yedek.yml` artık `postgresql-client-17` kurulumundan hemen sonra sürümü kendi içinde kontrol edip 17 değilse orada patlıyor. Böylece bir dahaki sefere hata, sebebinin bulunduğu adımda görünür. Aynı mantık 10. derste (`if-no-files-found: error`) ve yedeğin 10 KB alt sınırında da var: **sessiz başarısızlığı gürültülü hataya çevir.**

Bu, 13. dersin kardeşi. Orada hata *örneklemin dar olmasıydı*; burada örneklem değil, **ölçümün yanlış katmanda yapılmasıdır**. İkisinin ortak kökü aynı: CLAUDE.md §3.2 — *`{"outcome":"success"}` iddiadır, kanıt değildir.*

---

## 15. Dış bağımlılık eklerken asıl iş, onsuz çalıştığını KANITLAMAK (2026-09-18) → `logs/2026-09-18.md`

Mood playlistlerine Gemini tabanlı bir küratör katmanı eklendi. Sahibin şartı baştan nettti: *"ai mood modülü için güzel bir katman ama vazgeçilmez olmamalı."* Bu cümle, işin kolay yarısının AI'ı çalıştırmak, zor yarısının ise **AI'sız hâli tasarlamak** olduğunu söylüyordu.

**Yanlış refleks:** "Fallback ekledim" demek. `try/catch` içine `return null` yazmak fallback değildir — yalnızca çökmeyi engeller. Gerçek soru şudur: *bağımlılık kalıcı olarak yok olursa, ürünün hangi yeteneği kaybolur?*

**Doğru kurgu — öğrenmeyi bağımlılığın DIŞINDA tut.** Buradaki kritik karar, kullanıcı davranışından öğrenmeyi (sanatçı bazlı kademeli ceza) AI'ın prompt context'ine değil, **SQL skorlama motorunun kendisine** gömmek oldu (`mood_artist_penalty_carpan`, migration 0311). Ceza AI context'inde yaşasaydı, API'nin ölmesi öğrenmeyi de öldürürdü. Şimdi Gemini hiç çalışmasa bile sistem kullanıcıdan öğrenmeye devam ediyor; kaybolan tek şey kürasyonun ince ayarı. **Bağımlılık bir yeteneği taşıyorsa vazgeçilmezdir; yalnızca bir yeteneği iyileştiriyorsa değildir. Fark, kodun nereye yazıldığındadır.**

**Frenleri ölçerek doğrula, varlıklarına güvenme.** Dört fren (kimlik/kota/hata/davranış) yazıldı, sonra ikisi canlıda tetiklendi: kota sayacı elle tavana bir kala çekildi → tam 1 çağrı geçti, kalan 11 mood **hata değil fallback** olarak SQL yoluna düştü. Değişiklik yapılmadan ikinci tur → `skipped: 12`. Bir freni yazmak, o frenin tutacağını kanıtlamaz; tutturup görmek gerekir. (CLAUDE.md §3.2)

**Sayaç nerede yaşıyor sorusu, sayacın kendisi kadar önemli.** İlk tasarımda günlük kota sayacı in-memory'di. Serverless'ta süreç her yeniden başladığında sıfırlanacaktı — yani kota freni, en çok ihtiyaç duyulduğu anda (yoğun trafik, çok sayıda cold start) en zayıf hâlinde olacaktı. Sayaç veritabanına alındı. **Bir güvenlik sınırı, koruduğu kaynaktan daha kısa ömürlü olamaz.**

**Ek olarak ölçülen tuzak — "thinking" modellerde çıktı bütçesi.** `gemini-2.5-flash` çağrısı `Unterminated string in JSON` ile düştü. `responseSchema` verildiği için model doğru yapıda üretiyordu; sorun yapı değil, **bütçeydi**: düşünme (thinking) token'ları `maxOutputTokens`'tan harcanıyor, JSON'a sıra gelmeden bütçe bitiyordu. Bu 14. dersin kardeşi — hata (bozuk JSON), sebebinden (bütçe tükenmesi) bir katman sonra yüzeye çıktı. Çözüm bütçeyi büyütmek **ve** `thinkingBudget: 0` ile düşünmeyi kapatmaktı; kürasyon derin akıl yürütme istemiyor, kapatmak maliyeti de düşürüyor.

**Aynı gün, aynı ilke güvenlik tarafında da tekrarlandı:** servis hesabı `roles/aiplatform.user`'a daraltıldı (sızarsa zarar Vertex kotasıyla sınırlı), koddaki 150 çağrı/gün freninin yanına **bağımsız** bir GCP bütçe alarmı kondu. Tek bir çite güvenilmedi — çünkü bir çitin çalıştığını varsaymak, tam da 14. dersin yasakladığı şey.

---

## 16. `GRANT` bir izin VERİR, var olanı geri ALMAZ (2026-09-19) → `logs/2026-09-19.md`

Yeni AI/katalog fonksiyonları yazılırken her birinin sonuna titizlikle şu kondu:

```sql
GRANT EXECUTE ON FUNCTION public.catalog_enrichment_track_adaylari(int, int) TO service_role;
```

Bu satır, okuyan herkese "bu fonksiyon yalnız service_role'a açık" hissi verir.
**Vermiyor.** PostgreSQL bir fonksiyon yaratıldığında EXECUTE yetkisini varsayılan
olarak `PUBLIC`'e verir; Supabase'de bu pratikte `authenticated` rolü demektir. Yukarıdaki
`GRANT` o yetkinin **üstüne ekler**, onu kaldırmaz. Kapatmanın tek yolu açık `REVOKE`'tur:

```sql
REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION ... TO service_role;
```

`SECURITY DEFINER` ile birleşince sonuç ciddileşir: fonksiyon tanımlayıcının yetkisiyle
çalışır, yani **RLS'i atlar**. Denetimde çıkan iki somut açık:

- `catalog_enrichment_track_adaylari` / `..._artist_adaylari` — TÜM kullanıcıların
  `play_events` verisini toplayıp döndürüyordu, rol kontrolü yoktu. Giriş yapmış
  herhangi biri platformdaki herkesin dinleme istatistiklerini sayfalayarak çekebilirdi.
- `build_mood_pkg(p_user_id, ...)` — çağıranın kimliğini doğrulamıyordu. Başkasının
  `user_id`'si verilerek onun mood paketi yeniden ürettirilebilirdi (IDOR).

**Asıl ders, bulgunun kendisi değil nasıl bulunduğu.** Kodu okuyarak bulunamazdı: her
dosyada "yalnız service_role" yazan bir `GRANT` ve çoğunda bir de `auth.role()` kontrolü
vardı. Bulgu, **gerçek yetki tablosuna bakınca** çıktı:

```sql
select p.proname, p.prosecdef, p.proacl from pg_proc p
join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';
```

`authenticated=X/postgres` satırı, niyetin ne olduğunu değil sistemin ne yaptığını
söyler. 3. dersin ("ölçüme güven, kaynağa değil") yetki katmanındaki karşılığı:
**bir izin hakkında kodun söylediği şey iddiadır; `proacl` kanıttır.**

Supabase'in kendi `get_advisors(type='security')` linter'ı bunu doğrudan raporluyor
(`authenticated_security_definer_function_executable`). Yeni bir RPC eklendikten sonra
çalıştırılmalı — bu tur toplam 99 bulgu verdi, 10'u o gün eklenmişti.

**İki yanlış refleks:**
1. *"Fonksiyonun içinde `auth.role()` kontrolü var, yeter."* Yetmez — yazma uçları için
   çalışır ama okuma uçlarının çoğunda böyle bir kontrol yoktur, ve olsa bile tek
   savunma hattına güvenmek yanlıştır. REVOKE + iç kontrol birlikte olmalı.
2. *"Hepsini toptan REVOKE edelim."* Kalan 89 fonksiyona bilerek dokunulmadı: bir kısmı
   kullanıcı oturumundan çağrılıyor (`mood_playlist` gibi) ve toplu revoke uygulamayı
   **sessizce** kırardı. Doğrusu her fonksiyonun çağrı yerini grep'leyip istemcinin
   hangi anahtarla kurulduğunu doğrulamaktır — bu turda 16 fonksiyon için tek tek
   yapıldı, `worker/app/db.py`'nin `service_role` kullandığı dahil.

**Kalıcı hale getirmenin yolu nöbetçidir.** 0317/0318 migration'ları, REVOKE'tan sonra
`has_function_privilege('authenticated', ...)` ile kapalılığı VE
`has_function_privilege('service_role', ...)` ile cron'un hâlâ çalışabildiğini
doğruluyor; ayrıca `mood_playlist`'in yanlışlıkla kapatılmadığını da kontrol ediyor.
10. derste (`if-no-files-found: error`) ve 14. derste olduğu gibi: **sessiz
başarısızlığı gürültülü hataya çevir.**

---

## 17. Her düzeltme bir sonraki sınırı görünür kılar — zincir ölçümle yürür (2026-09-19) → `logs/2026-09-19.md` §4-7

Commit öncesi tek bir "son kontrol" turu beklenirken canlı ölçüm, her biri bir öncekinin çözümüyle ortaya çıkan bir zincir üretti:

| Adım | Ölçüm | Karar |
| :--- | :--- | :--- |
| Spec §7'ye uyup gün-dilimi listelerini `flash-lite`'a taşı (6× ucuz) | 2/4 başarı, 17 sn gecikme, tur **71 sn** (sınır 60) | Geri al |
| Mood döngüsüne süre bütçesi koy | Tur 38 sn ✓ — ama 12 mood'un yalnız **9'u** AI ile | Neden 9? |
| 9/12'nin sebebi: çağrı ~7 sn, pencereye 3 dalga sığıyor; aktif kullanıcıda her gün **aynı son 3 mood** AI'sız | Sistematik kalite açığı | Çağrıyı hızlandır |
| Model uuid yerine sıra numarası döndürsün | ~7 → **~2 sn**, maliyet **−%72** ✓ — ama 12'den **4'ü 429** | Neden şimdi? |
| Hızlanınca istek hızı arttı; paylaşımlı kapasite reddetti | — | Yalnız 429'da üstel yeniden dene |
| Son tur | **12/12**, 0 hata, 39 sn | Bitti |

**Üç çıkarım:**

1. **"Yeşil" bir ara durumda durmak, bir sonraki sorunu canlıya taşımaktır.** Süre bütçesi eklendiğinde tur 60 sn'nin altına indi ve hiçbir test kırmızı değildi. Ama `aiCurated: 9` sayısına "neden 9?" diye bakılmasaydı, her gün aynı üç listenin AI'sız kaldığı hiç fark edilmezdi — çünkü o listeler SQL fallback'iyle gayet makul görünüyordu. **Bir sayının beklenenden az olması, sessiz başarısızlığın en tipik görüntüsüdür.**

2. **Spec'in önerisi bir hipotezdir.** `flash-lite` §7'de açıkça yazıyordu ve fiyat gerekçesi doğruydu. Bu projede/bölgede kapasitesinin dar olduğunu yalnız ölçüm söyleyebilirdi. 13. dersin ("örneklem denetimi denetim değildir") model seçimindeki karşılığı.

3. **Bu fiyatlamada modele ne yazdırdığın, ne okuttuğundan önemlidir.** Çıktı token'ı girdiden 8 kat pahalı ve gecikmenin asıl kaynağı. uuid → sıra numarası değişikliği hem maliyeti hem süreyi hem halüsinasyon riskini aynı anda düşürdü; aynı desen katalog zenginleştirmesinde zaten vardı. Yeni bir AI çağrısı tasarlarken ilk soru şu olmalı: *model kimlik mi kopyalıyor, yoksa karar mı veriyor?* Kimliği kopyalatma — kararı aldır, eşlemeyi kendin yap.

---

## 18. Kullanıcının elle yaptığı temizlik, sistemin tek gerçek etiket kümesidir (2026-09-20) → `logs/2026-09-20.md`

Sahip 12 Mood listesini elle gözden geçirip ait olmadığını düşündüğü şarkıları çıkardı. Paket 02:30'da yazılmıştı, temizlik 08:25–08:33 arasında yapıldı; yani `mood_pkg.payload` = sistemin seçimi, `hidden_track_ids` = insanın "hayır"ı. Bu, Rosso'nun bugüne kadar sahip olduğu **tek gerçek etiketli değerlendirme kümesi**:

| mood | seçilen | çıkarılan | oran |
| :--- | ---: | ---: | ---: |
| no_limit | 50 | 48 | %96 |
| gece_217 | 50 | 41 | %82 |
| quiet_side | 50 | 37 | %74 |
| miles_away | 50 | 34 | %68 |
| full_throttle | 50 | 17 | %34 |
| locked_in | 50 | 11 | %22 |
| closer | 50 | 5 | %10 |
| **toplam** | **350** | **193** | **%55** |

**Dört çıkarım — hepsi ölçümden, hiçbiri okumadan çıktı:**

1. **Veri elimizdeydi, karara girmiyordu.** Çıkarma oranı `energy_character`'a göre ayrıştırıldığında sebep tek bakışta göründü: `full_throttle · medium` %71 çıkarılmış (`high` %23, `explosive` %11); `no_limit · medium` 33 parçanın 32'si. `catalog_ai_enrichment` bu alanı aylardır yazıyordu ve `catalog_enrichment_for_tracks` `moods`'u DÖNDÜRÜYORDU — ama `mood-ai-context.ts` onu okuyup **atıyordu**; modele yalnız tür ve enerji gidiyor, enerji hiçbir yerde filtre olarak kullanılmıyordu. **Bir alanın tabloda olması, kararda olduğu anlamına gelmez.** 0319'un yorumu ("Katman A'yı Katman C'ye bağla") bağlantının kurulduğunu söylüyordu; kurulan ok veriyi taşıyordu ama alıcı taraf onu çöpe atıyordu.

2. **"Üst sınır" diye belgelenen sabit, pratikte ALT sınır gibi çalışıyordu.** `MOOD_TRACK_LIMIT = 50`'nin yorumunda *"⚠ Bu bir ÜST SINIR"* yazıyordu. Ama `validateAiSelection` modelin seçimini her koşulda 50'ye TAMAMLIYORDU — yani sistemde 50'den kısa liste üretebilen hiçbir yol yoktu. Model dürüstçe "burada yalnız 30 parça uyuyor" deseydi, kalan 20'yi havuzun dibinden biz ekliyorduk. **Yorumdaki niyet ile kodun davranışı arasındaki fark, yorumu okuyarak değil davranışı ölçerek bulunur.**

3. **"Blacklist değil" diye tasarlanan iki mekanizmadan biri blacklist'ti.** 0311 sanatçı cezasını kademeli yaptı ve yorumunda *"taban 0.35, asla 0'a inmez"* dedi — doğru. Ama 0272'nin `(tür||sanatçı)` hard dışlaması aynı dosyada duruyordu ve bir parça çıkarıldığında o sanatçının aynı türdeki TÜM parçalarını havuzdan siliyordu. Ölçülen sonuç: `gece_217` havuzu 203 → **33** (hedef 50!), `miles_away` 620 → 230. Havuz hedeften küçük olunca liste zorunlu olarak dibi kazıyor. **İki mekanizma aynı amacı taşıyorsa, ikisinin BİRLİKTE ne yaptığını ölçmek gerekir; tek tek doğru olmaları yetmez.**

4. **Negatif sinyal saklanıyordu, pozitif sinyal atılıyordu.** `hidden_track_ids` vardı; "kullanıcı bunları BIRAKTI" bilgisi hiçbir yere yazılmıyordu. Oysa 50 parçalık bir listeyi temizleyen insan iki şey söyler. Pozitif etiket (`approved_track_ids`, 0326) eklenince ve skorda sıralama kademesi yapılınca tutulan-parça geri çağırma oranı %74 → **%91** oldu.

**Ayrıca, aynı turda ortaya çıkan üç yan bulgu:**

- `locked_in`'in "sözsüz" filtresi `title ~ '[şğıİöüçŞĞÖÜÇ]'` idi — enstrümantal tespiti değil, **Türkçe başlık cezası**. Bir regex'in adı (`v_sozsuz`) ne yaptığını söylemez.
- `/api/mood/create-playlist` sayfanın gösterdiği listeyi (`mood_pkg`) DEĞİL, canlı RPC'yi yazıyordu. Gerekçe belgede duruyordu ("bayat liste Spotify'a gitmesin") ve AI kürasyonu gelmeden önce makuldü; geldikten sonra iki listenin ayrışması kural oldu ve kullanıcı ekranda temizlediği listeyi gönderdiğini sanıyordu. **Bir gerekçe, yazıldığı günün mimarisine aittir.**
- `ai_usage_counter` cron turunda 12 çağrı sayıyordu ama `ai_generation_logs`'ta o güne ait **tek satır yoktu**. Log yazımı `.then(() => undefined, () => undefined)` ile hem hatayı hem fırlatmayı yutuyor, `Promise.race` de 3 sn'de sessizce devam ediyordu — "yazıldı" ile "kayboldu" ayırt edilemiyordu. 14. dersin ölçüm katmanındaki karşılığı: **ölçüme güvenilen bir sistemde en pahalı hata, ölçümün kendisinin sessizce düşmesidir.**

**Ve bir de kaliteyi kesen görünmez tavan:** `mood-v4-semantik` prompt'u (mood/vibe etiketleri + semantik playlist tanımı + pozitif/negatif örnekler) çağrı gecikmesini 2,5 → 5,0 sn'ye çıkardı. 28 sn'lik AI penceresine 12 mood'un yalnız **6'sı** sığdı, kalan 6 sessizce SQL'e düştü. Hiçbir hata üretmedi; yanıttaki `aiCurated: 6` sayısına bakılmasaydı listelerin yarısının kürasyonsuz olduğu fark edilmezdi. 17. dersin aynısı bir kez daha: **bir sayının beklenenden az olması, sessiz başarısızlığın en tipik görüntüsüdür.**

---

## 19. Sabit bir eşleme tablosu, kullanıcının zevkiyle sessizce çelişebilir (2026-09-20, ikinci tur)

Sahip listeleri elle temizlemekle kalmayıp **cümleyle tarif etti**:

> "The quiet side… bu listeden beklentim rock tabanlı, alternatif olur hiphop bile olur ama örneğin heavy metal olmaz, reggae olmaz. Klasik müzik de buraya yakışmaz… enstrümental müzik de buraya ait değil."

Canlı liste bu cümleye göre ölçüldü: **50 parçanın 27'si** klasik/instrumental/ambient/post-rock/film müziği içeriyordu.

Kök neden AI değildi, enrichment değildi, prompt değildi. `quiet_side`'ın tek tür sinyali `genre_mood_weight(tur, 'sad')` idi:

```
klasik 1.0 · ambient 1.0 · instrumental 1.0 · film müzikleri 1.0 · post-rock 1.0
rock 0.0 (!) · hip-hop 0.0 · alternatif 0.45 · indie rock 0.25
```

Yani sistem "hüzünlü = klasik/ambient" varsayıyordu; Sahibin hüznü "Türkçe rock/alternatif/rap"ti. Tablo yanlış değildi — **başkasının zevkine göre doğruydu.**

Çıkarılan dersler:

- **Sabit bir sözlük, ürünün en eski ve en görünmez varsayımıdır.** 18. ders "kullanıcının temizliği tek gerçek etiket kümesidir" diyordu; bu ders onun devamı: kullanıcının CÜMLESİ de etikettir ve çoğu zaman tek tek çıkarmalardan daha çok şey söyler.
- **Kullanıcının kuralı koda değil veriye yazılmalı.** Tür sepetleri `mood_playlist` içinde `IF/ELSIF` zinciriydi; "şu tür girmesin" demek her seferinde yeni migration demekti. 0332 bunları `mood_definitions.pozitif_genres`/`negatif_genres`'e taşıdı ve `mood_kural` tablosunu açtı: artık Sahibin bir cümlesi bir satır.
- **%9 kapsamalı zengin veri, %90 kapsamalı kaba veriden iyi değildir.** `catalog_ai_enrichment.primary_genre` 609 parçada dolu; `tracks.genres` 25.890'da (%90) ve zaten Sahibin konuştuğu sözlükte (`klasik`, `rock`, `film müzikleri`). Kuralı ikincisine bağlamak, AI kuyruğunu beklemekten iyiydi.
- **Çok etiketli alanda toptan yasak, doğru parçayı da keser.** `ambient` yasaklansaydı Cigarettes After Sex (`pop|indie pop|ambient`), `film müzikleri` yasaklansaydı PJ Harvey (`alternative rock|indie rock|film müzikleri`) de giderdi. Yalnız tek anlamlı etiketler (klasik, instrumental, lo-fi hip-hop) yasaklandı; adı anılmayan sanatçılar veto edilmedi, **Sahibe isim listesi olarak geri soruldu.**

## 20. Berabere skor, ölçümün kendisini yalancı yapar (2026-09-20)

0332 "yalnız taşıma, davranış değişmeyecek" migration'ıydı ve nöbetçisi **üç kez** düştü:

| Karşılaştırma | Sonuç | Gerçek sebep |
|---|---|---|
| (parça, sıra) ilk 50 | gece_217'de 46 sapma | Berabere skorda tek takas sonraki tüm pozisyonları kaydırır |
| İlk 50 parça kümesi | gece_217'de 6 sapma | Beraberlik tam kesim çizgisinde (50. sıra 1.29, 51. 1.28) |
| Tüm havuz (limit 400) | 112 sapma, **farklı puan 0** | Sanatçı tavanı kurası |

Sapan parçalar dökülünce şu görüldü: hepsi **aynı sanatçının başka bir parçasıyla** takas olmuştu (6LACK↔6LACK, Jacob Lee×2, Sleep Fruits Music×3). Sanatçı tavanı (`artist_rn <= 3`) `ORDER BY onayli DESC, mood_calma DESC` ile sıralanıyordu; bir sanatçının 4+ parçası aynı `mood_calma`'ya sahipse hangi 3'ünün kalacağı **plan bağımlıydı**.

- **Kontrol deneyi olmadan sonuç yorumlanamaz.** Eski fonksiyon kendisiyle, aynı işlem içinde karşılaştırıldı: 0 fark. Sapmanın refactor'den gelmediği ancak böyle kanıtlandı. Tahminle "herhalde beraberliktir" demek, üç turdur yanlış yerde arama demekti.
- **`LIMIT` ile filtre karıştırılmamalı.** "Limit 400 verirsem kesim olmaz" doğru değildi: sanatçı tavanı bir limit değil bir **filtre**; limit kalksa bile çalışır. Karşılaştırma bu yüzden tavan takasından etkilenmeyen bir değişmeze taşındı: **mood × sanatçı başına parça sayısı.**
- **Belirsiz bir fonksiyon, ölçülemeyen bir sistemdir.** `ORDER BY ... , t.id` eklendi. Bu bir stil düzeltmesi değil: öncesinde kullanıcının listesi kendi kendine 25 parça değişebiliyordu ve her kalite ölçümü bu gürültüyü de içeriyordu.

## 21. `img-src` medyayı kapsamaz — CSP direktifleri sessizce `default-src`'ye düşer (2026-09-21)

Landing hero videoları Vercel Blob'a taşındı. Yerelde çalıştı, `curl` ile beş URL de HTTP 200 + doğru `Content-Length` döndü, `readyState 4` ile oynadı. Production'da **hiç oynamadı**: `video.error.code = 4` (SRC_NOT_SUPPORTED), `readyState 0`, çözünürlük `0x0`.

Konsol sebebi birebir söylüyordu:

> "…violates the following Content Security Policy directive: `default-src 'self'`. Note that **'media-src' was not explicitly set, so 'default-src' is used as a fallback**."

CSP'de `img-src 'self' data: blob: https:` vardı — yani **resimler için** dış kaynak açıktı. Ama `media-src` hiç yazılmamıştı ve yazılmadığında sessizce `default-src 'self'`'e düşüyor.

- **"Resimler çalışıyorsa video da çalışır" varsayımı yanlış.** CSP'de her kaynak türü kendi direktifine bakar; `img-src`'yi gevşetmek `media-src`'yi gevşetmez. Aynı tuzak `font-src`, `connect-src`, `worker-src` için de geçerli.
- **Belirti sınıfı yine sessizdi.** Sayfa yüklendi, 200 döndü, hiçbir hata sayfası çıkmadı; yalnız video alanı siyah kaldı. Konsola bakılmasa fark edilmezdi. 14. ve 17. dersin aynı ailesi: **başarı gibi görünen başarısızlık.**
- **Yerel doğrulama yetmedi, çünkü CSP yalnız production'da tam uygulanıyor.** Dış bir kaynağa bağlanan her değişiklik canlıda ayrıca doğrulanmalı — `curl` ile kaynağın erişilebilir olması, *tarayıcının* ona erişmesine izin verildiği anlamına gelmez.
- **Kapsam dar tutuldu:** `media-src 'self' blob: https://*.public.blob.vercel-storage.com`. `https:` geneli vermek kolay yoldu ama gereksiz genişti; store değişse bile joker desen tutuyor. Test hem direktifin varlığını hem `https:` genelinin yazılmadığını kilitliyor.

## 22. Serverless'ta `void promise` bir iş değil, bir umuttur (2026-09-22)

`/api/export/queue` ZIP worker'ını `void dispatchWorkerEvent(...)` ile uyandırıp hemen 202 dönüyordu. Yorum satırı niyeti doğru anlatıyordu: "yükleme akışını bloke etmesin". Ama Vercel fonksiyonu **yanıt döndüğü anda donduruyor**; GitHub isteği hiç tamamlanmadı. Ölçüldü: ZIP 7 saat 42 dakika `queued` kaldı, rosso-worker'da **tek bir** `repository_dispatch` çalışması yok, `system_logs` boş — çünkü hata logu da aynı donmuş fonksiyonun içindeydi.

- **Başarısızlığın kendisi de sessizdi.** Hata yakalama doğru yazılmıştı; sadece hiç çalışma fırsatı bulamadı. "Hata loglanmadı" ≠ "hata olmadı".
- **Doğru araç `after()`** (Vercel'de `waitUntil`): yanıtı bekletmez, platforma işin bitmesini bekleme sözü verir. Aynı işi `await` eden kardeş rota (`trigger-worker-maintenance`) çalışıyordu — fark tam buydu.
- **PostgREST sorguları daha da sert:** `void supabase.from(...).update(...)` hiç gönderilmez bile, çünkü sorgu `then` çağrılınca yola çıkar. `resolve-track.ts`'teki `image_url` güncellemesi bu yüzden hiç çalışmıyor olabilir — ayrıca ölçülmeli.
- İkinci kırık da aynı ailedendi: worker GitHub Actions'ta `pip install -e .` aşamasında düşüyordu (setuptools `assets/`'i paket sandı) ve **hiç CI olmadığı için** kimse görmedi. Artık `tests.yml` her push'ta kurulumu da kanıtlıyor.

## 23. Birleştirme kimliği unutursa, kopya geri gelir (2026-09-22)

0304 aynı ses kaydının iki Spotify kimliğini (A, B) ISRC ile tek şarkıda topladı, B'nin çalmalarını A'ya taşıdı ve **B'yi sildi**. Sonuç doğruydu — ta ki B tekrar gelene kadar. İkinci ZIP B'yi getirince sistem onu tanımadı, yeni bir B yarattı ve aynı çalmaları B'ye bir kez daha yazdı: **1.125 şarkı, 6.158 çift çalma**. Kuru çalışmada ikinci kaynak da çıktı: 17-21 Eylül arası canlı dinleme de 34 şarkıyı aynı yoldan geri açmıştı.

- **Birleştirme, kaybedenin kimliğini de saklamalı.** Silmek "B yok" der; "B, A'dır" demez. Dış sistem (Spotify) B'yi göndermeye devam ettiği sürece o bilgi gerekir. → `track_spotify_alias`, ve her çözümleyici (ZIP RPC'si, web, worker) ona bakar.
- **Tekrar anahtarı kimlik içeriyorsa, kimlik hatası tekrar olarak görünmez.** `(user, played_at, track_id)` doğru bir anahtar, ama track_id yanlış olunca aynı çalma "yeni" görünür. Çift kaydı bulan sorgu anahtara değil **olayın kendisine** baktı: aynı kullanıcı + aynı saniye + aynı `ms_played`.
- **Kuru çalışma sayısı beklenenle tutmuyorsa uygulama.** İlk kuru çalışma 346 satır açık verdi; o açık kovalanınca ikinci kaynak (canlı yolun yarattığı 34 kopya) bulundu. Temizlik ancak sonuç birebir `122.996 + 2.297 + 1`'e oturunca uygulandı.
- **Bir temizlik başka bir çifti görünür yapabilir.** Birleştirmeden sonra 172 ZIP↔canlı çift ortaya çıktı: ZIP işlenirken kopya kimlikte oldukları için ±5 sn koruması onları görmemişti. Temizlikten sonra da ölçmek şart.

## 24. Floating Navigation & Modül Detay Sayfalarında Füzyon Mimarisi (2026-09-27)

Modül tanıtım sayfaları (`/modules`, `/modules/[slug]`) pazarlama ve SEO açısından yüksek dönüşüm sağlayan vitrin alanlarıdır. Eski uygulamada karşılaşılan üç temel hata çözüldü:

1. **Floating Navigation & Z-Index İzolasyonu:** Sayfa kapsayıcısı (`.pageWrapper`) üstte fixed pill navbar için yeterli boşluk bırakmadığında breadcrumb ve hero başlıklarıyla çakışıyordu; mobilde ise fixed bottom bar (`bottom: calc(0.75rem + env(safe-area-inset-bottom))`) alt içerikleri ve footer linklerini örtüyordu. Sayfa kapsayıcısına üstten `clamp(4.5rem, 8vw, 6.5rem)` ve alttan `calc(... + var(--marketing-bottom-nav-offset, 80px) + 80px + env(safe-area-inset-bottom, 0px))` eklenerek hem masaüstünde hem mobilde en az 80px net güvenli alan sağlandı.
2. **Box-in-Box Temizliği:** Özellikler bölümündeki hantal kart kutuları (`featureCard` arka planları ve sahte gölgeler) kaldırılarak saf canvas mimarisine geçildi; 1px zarif çizgiler ve mor aksan ikonlarıyla desteklenen tipografi odaklı minimal bir ızgara kuruldu.
3. **Nasıl Çalışır? Grid Normalizasyonu:** 3 adımlı modüller (`Recap`, `Journey`, `Playlists`) ile 4 adımlı modüller (`Taste`) arasındaki tek kartın alt satıra düşme dengesizliği `[data-step-count="3"]` ve `[data-step-count="4"]` seçicileriyle çözüldü; masaüstünde 3'lü ve 4'lü tam satır, tablette 2'li dengeli ızgara sağlandı.
4. **Living Mockup Dönüşümü:** Statik pikselli ekran görüntüleri yerine ürünün gerçek gücünü kanıtlayan interaktif ve görsel derinliğe sahip canlı modeller inşa edildi:
   - **Recap:** Spotify Wrapped tarzı dikey story kartı, çok katmanlı kart destesi (`layered stack`), üst story progress segmentleri (`- - - -`), "Uykusuz Indie Ayı" vibe başlığı ve köşe istatistik hapları (`4.820 dk`, `%87 Indie Rock`, `#1 The Strokes`, `41× tekrar`).
   - **Taste:** "Gece Kurdu" Müzik Kişilik Kartı, 24 saatlik dinleme dağılım grafiği (gece 02:00 zirvesi ve 3.4× yoğunluk vurgusu) ve 3 adet karakteristik `#1f1f1f` tür hapı.
   - **Journey:** 2020 ile 2024 arasındaki müzikal değişimi sergileyen yatay timeline / film şeridi, parlayan neon evrim çizgisi ve iki dönüm noktası kapağının karşılaştırması.
   - **Playlists:** 1:1 kare canlı kapak (`radius: 6px`, `box-shadow: 0 8px 24px rgba(0,0,0,0.5)`), hover anında play ikonuna dönüşen indeks numarası, 40px cover kareleri, net şarkı/sanatçı hiyerarşisi ve sağ altta hafif mor ışıltılı specular cam rozeti (`backdrop-filter: blur(20px)`).
