# Sürüm Kilometre Taşları

> Kodun belirli bir andaki hâlini dondurup isimlendirdiğimiz noktalar.
> Her taş bir **git tag**'idir; `git checkout <tag>` ile o hâle dönülür.
>
> ⚠ Tag **yalnız kodu** dondurur. Veritabanı, sırlar ve dış servisler git'te
> değildir — aşağıdaki "Dahil değil" bölümü her taş için bunu söyler.

---

## v2.0 — 2026-09-29

**Etiket:** `v2.0` (kök ve web repoları)
**Ne:** Kişisel, sosyal katmansız Rosso'nun DONDURULMUŞ hâli: davet listeli kayıt kapısı (0359), AI otomatik kapanış kilidi (17 Aralık 2026), tek dosyalık kurulum şeması + `npm run kur` betiği. Bakım moduna geçiş noktası.
**Portfolyö:** herkese açık kurulabilir kopya `github.com/ugurshelby/rosso` (`scripts/yayin-hazirla.mjs` ile üretilir).
**Dahil değil:** canlı DB, sırlar, Vercel ayarları.

---

## sosyal-son — 2026-09-25

**Etiket:** `sosyal-son` (kök, web, admin, worker repolarında)
**Ne:** Sosyal katmanlı (Social, Messages, Discover, Profile) SON sürüm. V2 bundan sonra sosyal katmansız devam eder.
**Geri dönüş:** `git checkout -b sosyal sosyal-son` · yerel arşiv: `_arsiv/sosyal-son/` (web worktree, mobil kopya, .env yedekleri).
**Dahil değil:** canlı DB (ortak, yalnız eklemeli değişir), sırlar, Vercel ayarları.

---

## v1 — 2026-08-04

**Commit:** `011f1ad`
**Dal:** `feature/phase-5`
**Neden:** Köklü bir değişikliğe girmeden önce mevcut kararlı hâli sabitlemek.
İleride bu dönemin koduna ihtiyaç olursa buradan alınır.

### Ne var

| Parça | Durum |
|---|---|
| Web (Next.js 16 · React 19 · Tailwind v4) | ana uygulama |
| `apps/admin` | ayrı admin paneli |
| `apps/mobile` (Expo / React Native) | APK üretildi |
| `worker/` (Python, Railway) | cron ve toplu işler |
| `supabase/migrations/` | **0001 → 0210** (210 dosya) |
| `docs/` | plan, karar, tasarım, referans belgeleri |

Bu noktada Aşama 3 (komponent paketleri mimarisi) tamamlanmış, Rosetta
migration'ları (0196-0210) canlıya uygulanmıştı.

### Ne yok — git dışı parçalar

| Eksik | Nerede duruyor | Yeni kurulumda ne gerekir |
|---|---|---|
| `.env.local` | yalnız yerel makinede | Supabase · Spotify · Railway anahtarları elle girilir |
| Supabase **verisi** | canlı Supabase projesinde | migration'lar şemayı kurar, **veri gelmez** |
| `node_modules/` | — | `npm install` |
| `apps/mobile/android/` | Expo prebuild çıktısı | `npx expo prebuild` |
| `apps/mobile/.env` | yerel | elle girilir |
| Railway cron tanımları | Railway panelinde | elle kurulur |

**Özet:** `v1` = *kodun fotoğrafı*, sistemin fotoğrafı değil. Çalışır bir kopya
için kod + sırlar + veritabanı üçünün de taşınması gerekir.

### Bu hâle nasıl dönülür

```bash
# Sadece bakmak için (mevcut işi bozmadan)
git checkout v1

# Bu hâlden yeni bir dal açmak için
git checkout -b <yeni-dal-adi> v1

# Başka bir makineye/projeye getirmek için
git clone https://github.com/ugurshelby/rosso.git
cd project-rosso
git checkout v1
npm install          # sonra .env.local doldurulur
```

---

## Yeni taş eklerken

1. Çalışma ağacı temiz olsun (`git status` boş)
2. `git tag -a <ad> -m "..."` — açıklamalı tag kullan, hafif tag değil
3. `git push origin <ad>` — yoksa yalnız yerel makinede kalır
4. Bu dosyaya bölüm ekle: commit · neden · ne var · ne yok
5. `logs/YYYY-AA-GG.md`'ye bir satır
