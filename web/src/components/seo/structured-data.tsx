import { siteUrl, mutlakUrl } from '@/lib/seo/site-url'
import { DIL_ETIKETI, yerelYol, type Dil } from '@/lib/marketing/dil'
import { SOZLUK } from '@/lib/marketing/sozluk'

/**
 * JSON-LD yapısal veri — arama motorunun sayfayı "anlaması" için.
 *
 * ─── Neden `dangerouslySetInnerHTML` ────────────────────────────────────
 * JSON-LD `type="application/ld+json"` script bloğunda durur. React metni
 * JSX içinde kaçırır (`"` → `&quot;`) ve bu JSON'u BOZAR; tek doğru yol
 * `dangerouslySetInnerHTML`. Güvenlik `guvenliJson` ile sağlanıyor.
 */

/**
 * Ters bölü — kaynak metninde kaçış dizisi yazmamak için kod noktasından
 * üretiliyor.
 *
 * ⚠ Bu dolambaç bilinçli. Kaçışı doğrudan yazmak ince bir tuzak barındırıyor:
 * normal bir dizede `"<"` JavaScript tarafından okunurken `<`
 * karakterine ÇÖZÜLÜR, yani kod `.replace(/</g, '<')` haline gelir ve
 * koruma hiçbir şey yapmaz. Bu hata ilk yazımda gerçekten yapıldı
 * (2026-08-21); kaynağa bakan biri "kaçış var" diye geçer, yalnız davranış
 * testi yakalar. Sahte güvenlik, korumasızlıktan tehlikelidir.
 */
const TERS_BOLU = String.fromCharCode(92)

/**
 * JSON-LD gövdesini script bloğuna güvenle gömer.
 *
 * `JSON.stringify` tek başına YETMEZ: HTML ayrıştırıcısı script içeriğini
 * JSON olarak değil METİN olarak tarar; `</script>` dizisini görürse bloğu
 * orada kapatır ve sonrası çalıştırılabilir HTML gövdesine düşer.
 *
 * Üç karakter kaçırılır: `<` (script kapatma / yorum açma), `>` (yorum
 * kapatma varyantı), `&` (entity çözümü). Kaçırılan biçim JSON
 * standardında geçerlidir — okuyan taraf orijinal karakteri görür, veri
 * BOZULMAZ (testle kanıtlı).
 */
function guvenliJson(veri: Record<string, unknown>): string {
  return JSON.stringify(veri)
    .replace(/</g, `${TERS_BOLU}u003c`)
    .replace(/>/g, `${TERS_BOLU}u003e`)
    .replace(/&/g, `${TERS_BOLU}u0026`)
}

function JsonLd({ veri }: { veri: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: guvenliJson(veri) }}
    />
  )
}

/**
 * Ana sayfa: kuruluş + yazılım uygulaması.
 *
 * `SoftwareApplication` seçildi (`Product` değil): Rosso kullanılan bir
 * uygulama, satılan bir nesne değil. Google bu tipte kategori ve platform
 * bilgisini arama sonucunda gösterebiliyor.
 */
export function AnaSayfaYapisalVeri({ dil = 'tr' }: { dil?: Dil }) {
  const kok = siteUrl()
  const sayfa = mutlakUrl(yerelYol(dil, '/'))
  const dilEtiketi = DIL_ETIKETI[dil]

  return (
    <>
      {/*
       * `WebSite` — Google arama sonucunda gösterilen SİTE ADINI buradan
       * okur (2026-09-22). Olmadan sonuçta "your-app.example" yazar.
       * `alternateName`: domain "project-rosso" ama marka "Rosso"; Google'a
       * ikisinin aynı site olduğunu söyler — "project rosso" aramasının
       * doğrudan buraya düşmesi için.
       */}
      <JsonLd
        veri={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Rosso',
          alternateName: ['Project Rosso'],
          url: `${kok}/`,
          inLanguage: [DIL_ETIKETI.tr, DIL_ETIKETI.en],
        }}
      />
      <JsonLd
        veri={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Rosso',
          alternateName: 'Project Rosso',
          url: kok,
          // Kare, 512px, şeffaf zeminli marka işareti — Google logo için
          // en az 112×112 ve taranabilir bir URL istiyor.
          logo: mutlakUrl('/icon.png'),
          description:
            dil === 'tr'
              ? 'Dinleme geçmişini kişisel bir müzik kimliği hikâyesine dönüştüren uygulama.'
              : 'An app that turns listening history into a personal identity story.',
        }}
      />
      <JsonLd
        veri={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Rosso',
          url: sayfa,
          applicationCategory: 'MultimediaApplication',
          // Yalnız Web: Android istemcisi yerel APK, mağazada yayında değil
          // (CLAUDE.md §1) — "Android" demek bulunamayan bir uygulama vaat eder.
          operatingSystem: 'Web',
          inLanguage: dilEtiketi,
          // Ücretsiz alfa — Google uygulama sonucunda "Ücretsiz" gösterebilir.
          offers: { '@type': 'Offer', price: '0', priceCurrency: dil === 'tr' ? 'TRY' : 'USD' },
          description: SOZLUK[dil].anaSayfa.metaAciklama,
        }}
      />
    </>
  )
}

/**
 * Blog yazısı: `BlogPosting`.
 *
 * `datePublished` ISO biçiminde olmalı — `POSTS` zaten `YYYY-MM-DD`
 * tutuyor, o da geçerli ISO 8601.
 */
export function YaziYapisalVeri({
  baslik,
  ozet,
  tarih,
  slug,
  dil = 'tr',
}: {
  baslik: string
  ozet: string
  tarih: string
  slug: string
  dil?: Dil
}) {
  const adres = mutlakUrl(yerelYol(dil, `/blog/${slug}`))
  return (
    <JsonLd
      veri={{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: baslik,
        description: ozet,
        datePublished: tarih,
        dateModified: tarih,
        inLanguage: DIL_ETIKETI[dil],
        url: adres,
        mainEntityOfPage: { '@type': 'WebPage', '@id': adres },
        author: { '@type': 'Organization', name: 'Rosso', url: siteUrl() },
        publisher: { '@type': 'Organization', name: 'Rosso', url: siteUrl() },
      }}
    />
  )
}

/**
 * SSS — `/help` için.
 *
 * Google bunu arama sonucunda açılır soru-cevap olarak gösterebiliyor.
 * ⚠ Yalnız sayfada GERÇEKTEN görünen sorular verilir; görünmeyeni
 * işaretlemek kural ihlalidir ve zengin sonucun tamamen kaybolmasına
 * yol açar.
 */
export function SssYapisalVeri({
  sorular,
}: {
  sorular: ReadonlyArray<{ q: string; a: string }>
}) {
  return (
    <JsonLd
      veri={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: sorular.map((s) => ({
          '@type': 'Question',
          name: s.q,
          acceptedAnswer: { '@type': 'Answer', text: s.a },
        })),
      }}
    />
  )
}

/**
 * Breadcrumb — arama sonucunda "rosso.app › Blog › Yazı" hiyerarşisi.
 *
 * ⚠ Yalnız sayfada GERÇEKTEN gezinilebilir bir yol varken kullanılır.
 * Blog yazısında "Tüm yazılar" bağlantısı bunun görünen karşılığı;
 * burada makine tarafı işaretleniyor. Görünmeyen bir yolu işaretlemek
 * Google'ın yapısal veri kurallarının ihlalidir.
 */
export function KirintiYolu({
  parcalar,
}: {
  parcalar: ReadonlyArray<{ ad: string; yol: string }>
}) {
  return (
    <JsonLd
      veri={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: parcalar.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p.ad,
          item: mutlakUrl(p.yol),
        })),
      }}
    />
  )
}

/**
 * Modül tanıtım sayfası (`/modules/<slug>`): `WebPage` + `SoftwareApplication` özellikleri.
 *
 * `about` sayfanın konusunu (ör. "Spotify recap") söyler; `featureList` yalnız sayfada
 * GÖRÜNEN özellikleri taşır (görünmeyeni işaretlemek yapısal veri kuralı ihlalidir).
 * SSS ve breadcrumb ayrı bileşenlerle (`SssYapisalVeri`, `KirintiYolu`) eklenir.
 */
export function ModulYapisalVeri({
  ad,
  baslik,
  aciklama,
  yol,
  ozellikler,
  anahtarKelimeler,
  dil = 'tr',
}: {
  ad: string
  baslik: string
  aciklama: string
  /** Türkçe (öneksiz) yol — `/modules/spotify-recap`. */
  yol: string
  ozellikler: ReadonlyArray<string>
  anahtarKelimeler: ReadonlyArray<string>
  dil?: Dil
}) {
  const adres = mutlakUrl(yerelYol(dil, yol))
  return (
    <JsonLd
      veri={{
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: baslik,
        description: aciklama,
        url: adres,
        inLanguage: DIL_ETIKETI[dil],
        keywords: anahtarKelimeler.join(', '),
        about: {
          '@type': 'SoftwareApplication',
          name: `Rosso ${ad}`,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'Web',
          url: adres,
          featureList: ozellikler.join('; '),
          offers: { '@type': 'Offer', price: '0', priceCurrency: dil === 'tr' ? 'TRY' : 'USD' },
        },
        isPartOf: { '@type': 'WebSite', name: 'Rosso', url: `${siteUrl()}/` },
      }}
    />
  )
}
