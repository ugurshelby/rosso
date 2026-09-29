import type { MetadataRoute } from 'next'
import { yazilar } from './(marketing)/blog/posts'
import { mutlakUrl, indekslenebilir } from '@/lib/seo/site-url'
import { DILLER, DIL_ETIKETI, yerelYol } from '@/lib/marketing/dil'
import { MODUL_ANAHTARLARI, modulYolu } from '@/lib/marketing/moduller'

/**
 * `/sitemap.xml` — arama motorlarına hangi sayfaların var olduğunu ve ne
 * sıklıkta değiştiğini söyler.
 *
 * ─── Neden yalnız marketing sayfaları ───────────────────────────────────
 * Dashboard'un tamamı giriş gerektiriyor. Bot oraya girerse `/login`'e
 * yönlenir; sitemap'e koymak arama motoruna var olmayan içerik vaat etmek
 * olurdu. `robots.ts` de aynı yolları zaten kapatıyor — ikisi tutarlı.
 *
 * ─── İki dil (2026-09-22) ───────────────────────────────────────────────
 * Her sayfa iki kez girer (Türkçe `/…`, İngilizce `/en/…`) ve her girdi
 * `alternates.languages` ile KARŞI dildeki eşini bildirir — Google'ın
 * sitemap'te hreflang önerisi. Sayfadaki `<link rel="alternate">` ile aynı
 * bilgi; ikisi tutarlı olmalı (tek kaynak: `lib/marketing/dil.ts`).
 *
 * Gizlilik (`/privacy`) 2026-09-22 KVKK denetiminde iki dilli yazıldı ve
 * artık o da diğerleri gibi `ikiDilde()` üzerinden giriyor — tek istisna
 * kalmadı.
 *
 * ⚠ Preview/localhost'ta BOŞ döner: preview adresi indekslenirse aynı
 * içerik iki yerde görünür (duplicate content) ve kanonik sayfa zayıflar.
 */

type Girdi = {
  yol: string
  lastModified: Date
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

/** Bir sayfayı iki dilde, karşılıklı hreflang eşleşmesiyle üretir. */
function ikiDilde(g: Girdi): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    DILLER.map((d) => [DIL_ETIKETI[d], mutlakUrl(yerelYol(d, g.yol))]),
  )
  return DILLER.map((d) => ({
    url: mutlakUrl(yerelYol(d, g.yol)),
    lastModified: g.lastModified,
    changeFrequency: g.changeFrequency,
    priority: g.priority,
    alternates: { languages },
  }))
}

export default function sitemap(): MetadataRoute.Sitemap {
  if (!indekslenebilir()) return []

  const bugun = new Date()
  const yazilarTr = yazilar('tr')

  const sabitSayfalar: Girdi[] = [
    // 1.0 yalnız ana sayfada: öncelik SİTE İÇİ sıralamadır, mutlak bir
    // değer değil. Her sayfaya 1.0 vermek sinyali tamamen anlamsızlaştırır.
    { yol: '/', lastModified: bugun, changeFrequency: 'weekly', priority: 1 },
    { yol: '/pricing', lastModified: bugun, changeFrequency: 'monthly', priority: 0.8 },
    {
      yol: '/blog',
      // `/blog` listesinin gerçek güncellenme anı: en yeni yazının tarihi.
      lastModified: yazilarTr[0] ? new Date(yazilarTr[0].date) : bugun,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    { yol: '/help', lastModified: bugun, changeFrequency: 'monthly', priority: 0.6 },
    {
      // Gizlilik metni nadiren değişir ama ARAMA SONUCUNDA görünmesi bir
      // güven sinyalidir — düşük öncelikle dahil.
      yol: '/privacy',
      lastModified: bugun,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const yaziGirdileri: Girdi[] = yazilarTr.map((yazi) => ({
    yol: `/blog/${yazi.slug}`,
    // Yazının KENDİ tarihi — `new Date()` vermek her taramada "değişti"
    // sinyali üretir ve zamanla güvenilmez hale gelir.
    lastModified: new Date(yazi.date),
    changeFrequency: 'yearly',
    priority: 0.5,
  }))

  // Modül tanıtım sayfaları (2026-09-25): niş aramalar için (spotify recap / playlist creator …).
  // Merkez 0.8, modül sayfaları 0.7 — ana sayfanın altında, blogun üstünde.
  const modulGirdileri: Girdi[] = [
    { yol: '/modules', lastModified: bugun, changeFrequency: 'monthly', priority: 0.8 },
    ...MODUL_ANAHTARLARI.map((k) => ({
      yol: modulYolu(k),
      lastModified: bugun,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  return [
    ...sabitSayfalar.flatMap(ikiDilde),
    ...modulGirdileri.flatMap(ikiDilde),
    ...yaziGirdileri.flatMap(ikiDilde),
  ]
}
