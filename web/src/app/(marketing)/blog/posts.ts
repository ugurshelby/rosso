import { TARIH_YERELI, type Dil } from '@/lib/marketing/dil'
import type { ModulAnahtari } from '@/lib/marketing/moduller'

export interface BlogPost {
  /** İki dilde AYNI — `hreflang` eşleşmesi slug üzerinden kurulur. */
  slug: string
  title: string
  date: string // YYYY-MM-DD
  /** Kısa konu etiketi — editoryal sınıflandırma (Teknik, Ürün, Gizlilik). */
  topic: string
  excerpt: string
  /** Paragraf dizisi — şimdilik basit statik içerik (MDX'e ileride geçilebilir). */
  body: string[]
  /** İlgili modül tanıtım sayfaları — yazının altında iç bağlantı olarak çıkar (SEO). */
  moduller?: readonly ModulAnahtari[]
}

/*
 * ⚠ 2026-09-22: ISRC yazısı yeniden yazıldı. Eski hâli Spotify ↔ Apple Music
 * arasında playlist taşımayı anlatıyordu; Rosso saf Spotify platformu
 * (CLAUDE.md §4) ve taşıma özelliği yok. Yeni metin ISRC'nin bugün GERÇEKTEN
 * yaptığı işi anlatıyor: `lib/catalog/resolve-track.ts` → önce spotify_id,
 * bulunamazsa isrc, o da yoksa yeni satır. Belirsiz durumda birleştirme yok.
 */
const TR: BlogPost[] = [
  {
    slug: 'isrc-ile-eslestirme',
    title: 'ISRC: bir şarkının değişmeyen kimliği',
    date: '2026-05-12',
    topic: 'Teknik',
    excerpt:
      'Aynı şarkı Spotify’da single’da başka, albümde başka kimlikle durabilir. ISRC kaydın kendisine aittir ve değişmez; Rosso geçmişini bu yüzden ona göre birleştirir.',
    body: [
      'Spotify’da aynı kayıt birden fazla yerde yaşayabilir: önce single olarak çıkar, sonra albüme girer, bazen bir derlemede yeniden görünür. Her birinin ayrı bir Spotify kimliği vardır. Ama hepsinin ISRC’si aynıdır — ISRC, ses kaydına verilen uluslararası standart koddur.',
      'Bu fark dinleme geçmişinde görünür hale gelir. Aynı şarkıyı yıllar içinde hem single’dan hem albümden dinlediysen, yalnızca kimliklere bakan bir sistem onu iki ayrı şarkı sayar: dinleme sayın ikiye bölünür, sıralaman yanlış çıkar.',
      'Rosso bir şarkıyı kataloğa eklerken önce Spotify kimliğine bakar. O kimliği tanımıyorsa ISRC’ye bakar; aynı kayıt zaten kataloktaysa yeni bir şarkı açmak yerine yeni kimliği eskisine bağlar. Böylece o şarkının bütün dinlemeleri tek yerde toplanır.',
      'Emin olamadığımız durumda birleştirmeyiz. İki farklı kaydı tek şarkı sanmak, bir şarkıyı iki kez saymaktan daha kötüdür. Doğruluk, tamlıktan önce gelir.',
    ],
  },
  {
    slug: 'recap-vs-taste',
    title: '“Ne kadar dinledin” ile “kim olduğun” farklı sorular',
    date: '2026-05-28',
    topic: 'Ürün',
    excerpt:
      'Recap niceliği gösterir: saatler, şarkılar, sanatçılar. Taste ise dinleme tarzını: örüntülerin, sadakatin, yıllar içindeki değişimin.',
    body: [
      'Çoğu yıllık özet aynı şeyi yapar: en çok dinlediğin beş şarkı, toplam dakika. Bu Recap’tir — ve değerlidir.',
      'Rosso bir soru daha sorar: nasıl dinliyorsun? Sabah mı akşam mı? Hangi sanatçıya yıllardır sadıksın? 2021’den 2024’e zevkin nasıl kaydı?',
      'Bu iki soru farklı sayfalarda yaşıyor çünkü farklı şeyler anlatıyorlar.',
    ],
  },
  {
    slug: 'verilerin-senin',
    title: 'Dinleme geçmişin senin — IP adresin değil',
    date: '2026-06-10',
    topic: 'Gizlilik',
    excerpt:
      'Spotify dışa aktarımını işlerken neyi sakladığımız kadar neyi saklamadığımız da önemli. IP adresi hiçbir tabloya yazılmaz.',
    body: [
      'Spotify dışa aktarımı her dinleme olayında bağlam bilgisi taşır — bunların bir kısmı kişiseldir. IP adresini işlerken görürüz, ama hiçbir yere yazmayız.',
      'identity.json gibi dosyalar işlenir ve silinir. Gizli oturum (incognito) dinlemeleri saklanır ama istatistiklerden varsayılan olarak çıkarılır; istersen sen açarsın.',
      'Hesabını silersen, tüm verin bağlı kayıtlarıyla birlikte gider. Bu bir ayar değil, mimari.',
    ],
  },
  {
    slug: 'spotify-gecmis-verini-indir',
    title: 'Spotify geçmişini indir: Extended Streaming History',
    date: '2026-09-25',
    topic: 'Rehber',
    excerpt:
      'Spotify’ın tüm zamanların dinleme geçmişini nasıl talep edeceğin, hangi dosyayı seçeceğin ve indirdikten sonra Rosso’da neye dönüştüğü — adım adım.',
    moduller: ['journey', 'recap'],
    body: [
      'Spotify uygulamasında dinleme geçmişin yalnızca son birkaç ayı gösterir. Yıllara yayılan tam geçmişini görmek istiyorsan Spotify’ın “verilerini indir” hakkını kullanman gerekir. Bu yazı bunu adım adım anlatıyor.',
      '1. Spotify hesabının gizlilik ayarlarına gir (hesap sayfanda “Gizlilik ayarları”). 2. “Verilerini indir” bölümünde “Genişletilmiş dinleme geçmişi”ni (Extended streaming history) işaretle. 3. Talebi e-postayla onayla.',
      'Spotify dosyayı hazırlayınca sana e-posta ile bir indirme bağlantısı gönderir. Bu genellikle birkaç gün sürer, ama Spotify bunun 30 güne kadar uzayabileceğini söyler; sabırlı ol. Bağlantı belirli bir süre açık kalır, gelir gelmez indirmen iyi olur.',
      'İndirdiğin ZIP dosyasının içinde yıllara yayılan dinleme kayıtları JSON dosyaları olarak durur: hangi şarkıyı, ne zaman, ne kadar dinlediğin. Spotify’ın yanında “hesap verisi” ve “teknik günlük” paketlerini de sunar; Rosso üç türü de tanır ve derin analizler için hangisine ihtiyaç olduğunu sana gösterir.',
      'Dosyayı Rosso’ya yüklediğinde geçmişin işlenir ve iki şeye dönüşür: her ay ve yıl için Spotify recap özetlerine ve yıllar içinde zevkinin nasıl değiştiğini gösteren müzik yolculuğuna (Journey). Yükleme yalnızca senin hesabına yapılır; kimse başkasının geçmişini göremez.',
      'Verilerinin gizliliği için ne yaptığımızı ayrıca yazdık: dosya işlendikten sonra silinir ve hesabını sildiğinde her şey geri dönüşsüz gider.',
    ],
  },
  {
    slug: 'spotify-wrapped-alternatifi-aylik-recap',
    title: 'Spotify Wrapped alternatifi: her ay recap',
    date: '2026-09-25',
    topic: 'Ürün',
    excerpt:
      'Wrapped yılda bir kez gelir ve yılın son aylarını kapsamaz. Rosso her ay Spotify recap üretir; geçmişe de dönebilirsin. Ücretsiz alfa.',
    moduller: ['recap', 'taste'],
    body: [
      'Spotify Wrapped her yıl aynı zamanda yayımlanır, yılın bir bölümünü kapsar ve sonrasında tazelenmez. Sevdiğin bir şarkının en çok dinlendiği ayı ya da zevkinin ne zaman değiştiğini yıl boyunca göremezsin.',
      'Rosso bunu tersine çevirir: her ay için bir Spotify recap üretir. En çok dinlediğin şarkılar, sanatçılar ve albümler, o ayın en yoğun günü, dinleme serin ve o dönemin küçük bir hikâyesi story akışıyla gelir.',
      'Recap sayıları verir; Taste ise nasıl bir dinleyici olduğunu anlatır: tür DNA’n, gün içindeki ritmin ve yıllardır bırakmadığın sanatçılar. İkisi farklı sorulara cevap verir, bu yüzden ayrı sayfalarda yaşar.',
      'Geçmiş yılların recap’i için Spotify’dan indirdiğin dinleme geçmişini yüklemen yeter; Rosso geçmiş ayları ve yılları da oluşturur. Hesabını bağlamak yeni dinlemeleri otomatik getirir.',
      'Rosso alfa süresince ücretsizdir ve kimse başkasının verisini göremez: profil, takip ya da mesajlaşma yok. Recap yalnızca sana aittir.',
    ],
  },
]

const EN: BlogPost[] = [
  {
    slug: 'isrc-ile-eslestirme',
    title: 'ISRC: the identity a song never loses',
    date: '2026-05-12',
    topic: 'Engineering',
    excerpt:
      'One Spotify song can have several IDs: single, album. The ISRC belongs to the recording and never changes, so Rosso merges your history by it.',
    body: [
      'On Spotify, one recording can live in several places: it comes out as a single, then lands on the album, sometimes reappears on a compilation. Each has its own Spotify ID. But they all share the same ISRC — the international standard code assigned to a sound recording.',
      'That difference shows up in your listening history. If you have played the same song from both the single and the album over the years, a system that only looks at IDs counts it as two songs: your play count gets split and your rankings come out wrong.',
      'When Rosso adds a song to the catalog, it first looks at the Spotify ID. If it doesn’t recognise that ID, it checks the ISRC; if the same recording is already in the catalog, it links the new ID to the existing song instead of creating a new one. That way every play of the song ends up in one place.',
      'When we can’t be sure, we don’t merge. Treating two different recordings as one song is worse than counting a song twice. Accuracy comes before completeness.',
    ],
  },
  {
    slug: 'recap-vs-taste',
    title: '“How much you listened” and “who you are” are different questions',
    date: '2026-05-28',
    topic: 'Product',
    excerpt:
      'Recap shows quantity: hours, songs, artists. Taste shows how you listen: your patterns, your loyalty, how you change over the years.',
    body: [
      'Most year-end summaries do the same thing: your top five songs, your total minutes. That’s Recap — and it’s valuable.',
      'Rosso asks one more question: how do you listen? Mornings or nights? Which artist have you stayed loyal to for years? How did your taste drift from 2021 to 2024?',
      'These two questions live on different pages because they tell different stories.',
    ],
  },
  {
    slug: 'verilerin-senin',
    title: 'Your listening history is yours — your IP address isn’t ours',
    date: '2026-06-10',
    topic: 'Privacy',
    excerpt:
      'When we process your Spotify export, what we don’t keep matters as much as what we do. IP addresses are never written to any table.',
    body: [
      'A Spotify export carries context with every listening event — some of it personal. We see the IP address while processing, but we never store it anywhere.',
      'Files like identity.json are processed and then deleted. Private session (incognito) listens are kept but excluded from your stats by default; you can switch them on if you want.',
      'If you delete your account, all your data goes with it, along with everything linked to it. That isn’t a setting — it’s the architecture.',
    ],
  },
  {
    slug: 'spotify-gecmis-verini-indir',
    title: 'How to download your Spotify streaming history',
    date: '2026-09-25',
    topic: 'Guide',
    excerpt:
      'How to request your all-time Spotify listening history, which file to choose, and what it becomes in Rosso once you upload it — step by step.',
    moduller: ['journey', 'recap'],
    body: [
      'The Spotify app only shows a few recent months of your listening. To see your full multi-year history you need to use Spotify’s “download your data” right. This guide walks through it step by step.',
      '1. Open the privacy settings of your Spotify account. 2. In “Download your data”, tick “Extended streaming history”. 3. Confirm the request by email.',
      'When Spotify has prepared the file it emails you a download link. This usually takes a few days, but Spotify says it can take up to 30, so be patient. The link stays open for a limited time, so download it as soon as it arrives.',
      'Inside the ZIP you download, your listening records across the years sit in JSON files: which track you played, when, and for how long. Spotify also offers “account data” and “technical log” packages; Rosso recognises all three types and shows you which one a deeper analysis needs.',
      'When you upload the file to Rosso, your history is processed into two things: a Spotify recap for every month and year, and a music journey (Journey) showing how your taste changed over the years. The upload goes only to your account; nobody can see anyone else’s history.',
      'We wrote separately about how we protect your data: the file is deleted after processing, and everything goes irreversibly when you delete your account.',
    ],
  },
  {
    slug: 'spotify-wrapped-alternatifi-aylik-recap',
    title: 'A Spotify Wrapped alternative: a monthly recap',
    date: '2026-09-25',
    topic: 'Product',
    excerpt:
      'Wrapped comes once a year and skips the last months. Rosso makes a Spotify recap every month, and you can go back in time. Free alpha.',
    moduller: ['recap', 'taste'],
    body: [
      'Spotify Wrapped is published at the same time every year, covers part of the year, and is not refreshed afterwards. You cannot see, during the year, the month a favourite song peaked or when your taste shifted.',
      'Rosso turns that around: it produces a Spotify recap for every month. Your top songs, artists and albums, the busiest day of the month, your listening streak and a short story of the period arrive as a story-style flow.',
      'Recap gives you the numbers; Taste tells you what kind of listener you are: your genre DNA, your rhythm through the day and the artists you have never left. They answer different questions, so they live on different pages.',
      'For recaps of past years, upload the listening history you downloaded from Spotify; Rosso builds past months and years too. Connecting your account brings in new listening automatically.',
      'Rosso is free during the alpha and nobody can see anyone else’s data: there are no profiles, follows or messages. Your recap belongs only to you.',
    ],
  },
]

const YAZILAR: Record<Dil, BlogPost[]> = { tr: TR, en: EN }

/** Dilin yazıları, en yeniden eskiye. */
export function yazilar(dil: Dil): BlogPost[] {
  return [...YAZILAR[dil]].sort((a, b) => b.date.localeCompare(a.date))
}

/** Slug listesi — iki dilde aynı (sitemap ve `generateStaticParams`). */
export const YAZI_SLUGLARI: readonly string[] = TR.map((p) => p.slug)

export function getPost(slug: string, dil: Dil = 'tr'): BlogPost | undefined {
  return YAZILAR[dil].find((p) => p.slug === slug)
}

/** Dakika cinsinden tahmini okuma süresi (~200 kelime/dk). */
export function readingMinutes(post: BlogPost): number {
  const words = post.body.join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

/** Tarih formatı — 'short' liste satırları, 'long' detay başlığı için. */
export function formatPostDate(
  dateStr: string,
  variant: 'short' | 'long' = 'short',
  dil: Dil = 'tr',
): string {
  return new Date(dateStr).toLocaleDateString(TARIH_YERELI[dil], {
    year: 'numeric',
    month: variant === 'long' ? 'long' : 'short',
    day: 'numeric',
  })
}
