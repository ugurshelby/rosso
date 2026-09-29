# DB Yedek & Geri Yükleme Rehberi

> Oluşturulma: 2026-09-17. Tetikleyen soru (Sahip): *"diyelim ki mallık ettim
> Supabase hesabıma erişimi kaybettim, buna hazırlıklı olmak gerekir."*

---

## 1. Neden Supabase'in kendi yedeği yetmiyor

İki ayrı gerekçe:

1. **Yedek, kaybedeceğin hesabın içinde duruyor.** Supabase'in otomatik
   yedekleri proje panelinden erişilir. Senaryo "hesaba erişimi kaybettim" ise
   yedek de erişilemez durumdadır. Bir yedeğin anlamlı olması için **farklı bir
   kimlik alanında** yaşaması gerekir — bizde bu GitHub.
2. **Ücretsiz planda point-in-time recovery yok.** "Dün 14:00'e dön"
   diyebileceğin bir mekanizma zaten mevcut değil.

Bu yüzden yedek GitHub Actions'ta alınır ve GitHub artifact'i olarak saklanır.

---

## 2. Sistem nasıl çalışıyor

**Workflow:** `worker/.github/workflows/db-yedek.yml`

- Her pazar 04:00 UTC çalışır; ayrıca Actions sekmesinden **Run workflow** ile
  istediğin an elle tetiklenebilir.
- `pg_dump` ile `public` şeması alınır → `gzip -9` → `gpg` AES256 simetrik
  şifreleme → `rosso-yedek-YYYYAAGG-SSDD.sql.gz.gpg` artifact'i.
- `system_logs` tablosunun **verisi hariç tutulur** (şeması kalır) — teşhis
  kaydıdır, yedekte yer kaplamasının anlamı yok.
- Dosya 10 KB'tan küçükse workflow bilerek **hata verir**: sessizce boş bir
  yedek üretip "başarılı" görünmesindense gürültülü patlaması iyidir.

### Gereken iki GitHub secret (worker reposunda)

`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Değer |
| :--- | :--- |
| `SUPABASE_DB_URL` | `postgresql://postgres.<ref>:<parola>@aws-0-<bolge>.pooler.supabase.com:5432/postgres` |
| `YEDEK_PAROLA` | Kendi belirlediğin güçlü bir parola (şifre çözmede kullanılacak) |

`<ref>` ve `<parola>` değerleri `web/.env.local` içindeki
`NEXT_PUBLIC_SUPABASE_URL` ve `DATABASE_PASSWORD`'dan türetilir; bölge için
`web/scripts/db-migration-uygula.mjs` içindeki host listesi referans alınabilir
(`eu-central-1` / `eu-west-1`).

> 🔴 **`YEDEK_PAROLA`'yı Supabase'den BAĞIMSIZ bir yerde sakla** (parola
> menajeri, kâğıt, ne olursa). Bu parolayı kaybedersen yedekler geri
> döndürülemez şifreli çöptür — yedeği olmayan durumdan farkı kalmaz.

---

## 3. Yedeği indirme

1. GitHub → `ugurshelby/rosso` → **Actions** sekmesi
2. Sol menüden **DB Yedek** workflow'u → son başarılı çalıştırma
3. Sayfanın altındaki **Artifacts** bölümünden `rosso-db-yedek` indir

**Saklama süresi 90 gündür** (GitHub ücretsiz plan tavanı). Daha uzun süre
tutmak istiyorsan ara sıra bir artifact indirip kendi diskinde/harici diskte
sakla — en dayanıklı yedek, senin fiziksel kontrolündeki yedektir.

---

## 4. Geri yükleme

### Adım 1 — Şifreyi çöz ve aç

```bash
gpg --batch --decrypt --passphrase '<YEDEK_PAROLA>' \
  -o rosso-yedek.sql.gz rosso-yedek-YYYYAAGG-SSDD.sql.gz.gpg
gunzip rosso-yedek.sql.gz
```

### Adım 2 — Hedef veritabanına bas

Yeni bir Supabase projesine (hesabı kaybettiğin senaryo) veya mevcut projeye:

```bash
psql "postgresql://postgres.<yeni-ref>:<parola>@aws-0-<bolge>.pooler.supabase.com:5432/postgres" \
  -f rosso-yedek.sql
```

Dump `--no-owner --no-acl` ile alındığı için farklı bir projeye/role basmak
sorun çıkarmaz — zaten amacı budur.

### Adım 3 — Yedeğin kapsamadıkları

Dump yalnızca `public` şemasıdır. Geri yükleme sonrası elle kurulması
gerekenler:

- **`auth.users`** — kullanıcı hesapları Supabase Auth'un kendi şemasındadır,
  bu dumpta yoktur. Yeni projede kullanıcılar yeniden kayıt olmak zorundadır;
  `public` tablolarındaki `user_id` referansları yeni UUID'lerle eşleşmez.
  **Bu, kabul edilmiş bir sınırdır:** 5 kullanıcılık kişisel bir projede
  veri (dinleme geçmişi, katalog) kurtarılabilir olsun yeter; hesapların
  birebir taşınması için `auth` şemasını da dumplamak gerekir ki bu ayrı bir
  karardır.
- **pg_cron işleri** — `cron.job` tablosu `public` şemasında değil. Migration
  dosyaları (`web/supabase/migrations/`) bunları yeniden kurar.
- **Extension'lar, RLS politikaları ve fonksiyonlar** — `public` şemasında
  oldukları için dumpa dahildir, ama sıralama sorunu çıkarsa doğru referans
  yine migration dosyalarıdır.
- **Vault sırları** (`vault.decrypted_secrets` — cron_secret vb.) dahil
  değildir, elle yeniden kurulur.

---

## 5. Yedeğin çalıştığını doğrulama

Bir yedeğin gerçekten çalıştığı, **yalnızca geri yüklenerek** bilinir —
"workflow yeşil yandı" bir iddiadır, kanıt değil (CLAUDE.md §3.2).

Yılda bir kez (bkz. `yillik-bakim-kontrol-listesi.md`):

1. Son artifact'i indir, şifresini çöz, `gunzip` ile aç.
2. Dosyanın başını oku: `head -50 rosso-yedek.sql` — `CREATE TABLE` ifadeleri
   görünüyor mu?
3. Beklenen tabloların varlığını kontrol et:
   `grep -c "CREATE TABLE" rosso-yedek.sql` ve
   `grep "COPY public.play_events" rosso-yedek.sql | head -1`
4. Gerçekten emin olmak istiyorsan ücretsiz bir Supabase test projesi açıp
   Adım 2'yi orada uygula, sonra projeyi sil.
