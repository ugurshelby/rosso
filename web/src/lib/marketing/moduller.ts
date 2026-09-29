import type { Dil } from './dil'

/**
 * Modül tanıtım sayfaları — SEO içeriği ve veri modeli (2026-09-25).
 *
 * ─── Amaç ───────────────────────────────────────────────────────────────
 * "İstatistikten öteye." bölümündeki her modül için ayrı, aranabilir bir sayfa:
 * `/modules/<slug>` (TR) ve `/en/modules/<slug>` (EN). Hedef, Rosso'nun niş
 * kitlesinin arama kelimeleri: "spotify recap", "spotify playlist oluşturucu",
 * "spotify wrapped alternatifi", "spotify dinleme geçmişi analizi" …
 *
 * ─── Kurallar ───────────────────────────────────────────────────────────
 * 1. Slug İKİ DİLDE AYNI (blog ile aynı desen; `hreflang` ve dil değiştirici
 *    slug üzerinden eşleşir). Slug'lar İngilizce-anahtar kelimeli: "spotify recap",
 *    "spotify playlist" Türkçe aramalarda da İngilizce yazılır.
 * 2. Yalnız GERÇEKTEN çalışan özellikler yazılır (Sahip, 2026-09-22: yanlış vaatler
 *    temizlendi). Sosyal özellik yok (V2); taşıma yok (saf Spotify).
 * 3. `/taste` `/recap` `/journey` `/playlists` adresleri dashboard'dur ve
 *    `robots.ts` tarafından kapalıdır — bu yüzden tanıtım sayfaları `/modules/…`
 *    altında, ayrı bir adreste.
 * 4. Bu dosya İÇERİK ve VERİ tutar; görsel tasarım (mockup, yerleşim, hareket)
 *    Antigravity'nin işidir.
 */

export const MODUL_ANAHTARLARI = ['taste', 'recap', 'journey', 'playlists'] as const
export type ModulAnahtari = (typeof MODUL_ANAHTARLARI)[number]

/** İki dilde aynı URL parçası. */
export const MODUL_SLUGLARI: Record<ModulAnahtari, string> = {
  taste: 'spotify-taste-profile',
  recap: 'spotify-recap',
  journey: 'spotify-listening-journey',
  playlists: 'spotify-playlist-creator',
}

/** Tanıtım sayfasının Türkçe (öneksiz) yolu; dile göre önek `yerelYol` ile gelir. */
export function modulYolu(anahtar: ModulAnahtari): string {
  return `/modules/${MODUL_SLUGLARI[anahtar]}`
}

export function modulAnahtariBul(slug: string): ModulAnahtari | null {
  const bulunan = MODUL_ANAHTARLARI.find((k) => MODUL_SLUGLARI[k] === slug)
  return bulunan ?? null
}

export interface ModulBolumu {
  /** H2 başlığı. */
  baslik: string
  /** Paragraflar. */
  govde: string[]
}

export interface ModulIcerigi {
  /** Kısa ad (kartta/menüde): "Taste", "Recap"… */
  ad: string
  /** Sekme başlığı (kök şablon " — Rosso" ekler). ≤ ~50 karakter. */
  metaBaslik: string
  /** Meta açıklama, 110–160 karakter. */
  metaAciklama: string
  /** Sayfada ve `keywords` içinde kullanılan aranan ifadeler (birincil ilk sırada). */
  anahtarKelimeler: string[]
  /** Üst küçük etiket. */
  ustYazi: string
  /** H1. */
  baslik: string
  /** H1 altındaki ana cümle. */
  giris: string
  /** Madde madde gerçek yetenekler. */
  ozellikler: string[]
  /** İçerik bölümleri (H2 + paragraflar). */
  bolumler: ModulBolumu[]
  /** Nasıl çalışır — sıralı adımlar. */
  adimlar: string[]
  /** Sık sorulan sorular (sayfada görünür + FAQPage yapısal verisi). */
  sss: Array<{ q: string; a: string }>
  /** Sayfa sonu çağrı metni. */
  cta: string
  /** İlgili diğer modüller (iç bağlantı). */
  ilgili: ModulAnahtari[]
}

const TR: Record<ModulAnahtari, ModulIcerigi> = {
  taste: {
    ad: 'Taste',
    metaBaslik: 'Spotify müzik zevki analizi ve müzik kimliği',
    metaAciklama:
      'Spotify geçmişinden müzik zevki analizi: tür DNA’n, dinleme saatlerin, sadık sanatçıların ve sana özel bir müzik kimliği. Ücretsiz başla.',
    anahtarKelimeler: ['spotify müzik zevki analizi', 'müzik kimliği', 'spotify tür analizi', 'müzik kişiliği testi', 'spotify dinleme alışkanlıkları'],
    ustYazi: 'TASTE · MÜZİKAL KİMLİK',
    baslik: 'Spotify müzik zevki analizi: ne dinlediğini değil, nasıl bir dinleyici olduğunu gör',
    giris:
      'Taste, Spotify dinleme geçmişini bir müzik kimliğine çevirir: baskın türlerin, günün hangi saatinde dinlediğin, yıllardır sadık kaldığın sanatçılar ve seni anlatan bir vibe kartı.',
    ozellikler: [
      'Tür DNA’n: dinlemelerinin türlere göre ağırlıklı dağılımı',
      'Gün içi ritmin: saat saat dinleme yoğunluğu ve zirve saatin',
      'Şu An ve Değişmeyenler: son günlerin ruh hali ile yıllardır yanında olan şarkılar',
      'Sadık sanatçılar: zaman içinde bırakmadığın isimler',
      'Sana özel vibe kartı ve kimlik kelimeleri',
      'Top 5 şarkı, sanatçı ve albüm; dinleme serin ve keşif skorun',
    ],
    bolumler: [
      {
        baslik: 'Spotify sana ne dinlediğini gösterir, Taste nasıl dinlediğini',
        govde: [
          'Çoğu Spotify istatistik aracı en çok dinlediğin şarkıları ve toplam dakikayı listeler. Taste bir adım ileri gider: dinleme örüntülerini okuyup sana bir müzik kimliği çıkarır.',
          'Sabah mı gece mi dinliyorsun, hangi türlerde ağırlık taşıyorsun, hangi sanatçılara yıllardır dönüyorsun? Bunlar sayıdan çok karakteri anlatır.',
        ],
      },
      {
        baslik: 'Verin yalnız senin',
        govde: [
          'Rosso’da profil, takip ya da mesajlaşma yok. Müzik kimliğini yalnız sen görürsün. Kendi Spotify hesabını bağlarsın; istersen geçmiş yıllar için Spotify’dan indirdiğin veri dosyasını da yüklersin.',
        ],
      },
    ],
    adimlar: [
      'Rosso’ya ücretsiz kayıt ol.',
      'Kendi Spotify hesabını bağla (kendi geliştirici uygulaman ile, birkaç dakika).',
      'İstersen Spotify’dan indirdiğin geçmiş verini yükle.',
      'Taste sayfan dinleme verinden otomatik oluşur.',
    ],
    sss: [
      {
        q: 'Spotify müzik zevki analizi nasıl çalışır?',
        a: 'Rosso, Spotify dinleme geçmişindeki şarkı, sanatçı, tür ve saat bilgilerini işler; türlere göre ağırlıklı bir dağılım, gün içi dinleme ritmi ve sadık sanatçılar çıkarır.',
      },
      {
        q: 'Müzik kimliğimi başkaları görebilir mi?',
        a: 'Hayır. Rosso’da kullanıcılar birbirini görmez; Taste sayfası yalnız sana aittir.',
      },
      {
        q: 'Analiz için Spotify verimi indirmem gerekiyor mu?',
        a: 'Zorunlu değil. Hesabını bağlamak yeni dinlemeleri getirir; Spotify’dan indirdiğin geçmiş veri dosyası ise yıllara yayılan derin analiz için opsiyoneldir.',
      },
    ],
    cta: 'Müzik kimliğini ücretsiz keşfet',
    ilgili: ['recap', 'journey'],
  },

  recap: {
    ad: 'Recap',
    metaBaslik: 'Spotify recap: aylık ve yıllık dinleme özeti',
    metaAciklama:
      'Yılda bir değil, her ay Spotify recap: en çok dinlediğin şarkılar, sanatçılar, albümler ve dönemin hikâyesi. Wrapped’a ücretsiz alternatif.',
    anahtarKelimeler: ['spotify recap', 'spotify wrapped alternatifi', 'spotify aylık özet', 'spotify yıllık özet', 'spotify dinleme istatistikleri'],
    ustYazi: 'RECAP · DÖNEMSEL AYNA',
    baslik: 'Spotify recap her ay: Wrapped’ı yılda bir beklemek zorunda değilsin',
    giris:
      'Recap, Spotify dinleme geçmişini aylık ve yıllık özetlere çevirir: en çok dinlediğin şarkılar, sanatçılar, albümler, en yoğun günün ve o dönemin küçük bir hikâyesi.',
    ozellikler: [
      'Aylık ve yıllık Recap özetleri',
      'En çok dinlenen şarkı, sanatçı ve albüm listeleri',
      'Dönemin zirve günü, dinleme serisi ve keşifleri',
      'Story akışıyla sayfa sayfa gezilen özet',
      'Paylaşılabilir görsel kartlar',
    ],
    bolumler: [
      {
        baslik: 'Wrapped bir kez gelir, Recap sürekli',
        govde: [
          'Spotify Wrapped yılda bir kez yayımlanır ve yılın geri kalanında ne dinlediğini görmeni sağlamaz. Rosso Recap’i her ay üretir; böylece mayıs ayının uykusuz indie ayı olduğunu mayısta görürsün.',
          'Recap sayısal özet verir: kaç saat, hangi şarkılar, hangi sanatçılar. Neden böyle dinlediğini ve kim olduğunu anlatmak ise Taste ve Journey’nin işidir.',
        ],
      },
      {
        baslik: 'Kendi verinle, kendi hesabınla',
        govde: [
          'Rosso kendi Spotify hesabını ve istersen indirdiğin geçmiş veri dosyanı kullanır. Recap yalnız sana görünür; paylaşmak istersen kartı sen dışarı alırsın.',
        ],
      },
    ],
    adimlar: [
      'Ücretsiz kayıt ol ve Spotify hesabını bağla.',
      'Geçmiş aylar için Spotify’dan indirdiğin veri dosyasını yükle (isteğe bağlı).',
      'Aylık ve yıllık Recap’lerin otomatik oluşur.',
    ],
    sss: [
      {
        q: 'Spotify Recap ile Wrapped arasındaki fark ne?',
        a: 'Wrapped yılda bir kez, Spotify tarafından üretilir. Rosso Recap’i ise her ay, senin dinleme verinden üretir ve geçmiş dönemlere geri dönmene izin verir.',
      },
      {
        q: 'Geçmiş yılların Recap’ini görebilir miyim?',
        a: 'Evet; Spotify’dan indirdiğin geçmiş dinleme dosyasını yüklersen geçmiş aylar ve yıllar için de Recap oluşur.',
      },
      {
        q: 'Recap ücretsiz mi?',
        a: 'Rosso alfa süresince tamamen ücretsizdir.',
      },
    ],
    cta: 'Aylık Spotify recap’ini başlat',
    ilgili: ['taste', 'journey'],
  },

  journey: {
    ad: 'Journey',
    metaBaslik: 'Spotify dinleme geçmişi: yıllar boyu müzik yolculuğun',
    metaAciklama:
      'Spotify dinleme geçmişini yıllara yayılan bir yolculuğa çevir: keşif patlamaları, kırılma anları, ilk şarkından bugüne müzikal arşivin.',
    anahtarKelimeler: ['spotify dinleme geçmişi', 'spotify geçmiş verisi analizi', 'müzik yolculuğu', 'spotify tüm zamanlar', 'spotify extended streaming history'],
    ustYazi: 'JOURNEY · ÖMÜR BOYU ARŞİV',
    baslik: 'Spotify dinleme geçmişin yıllar içinde nasıl değişti?',
    giris:
      'Journey, Spotify geçmiş verini yıl yıl gezilebilir bir yolculuğa çevirir: hangi yıl neyi keşfettin, zevkin nerede kırıldı, hangi şarkılar zamana direndi.',
    ozellikler: [
      'Yıl yıl dinleme arşivi ve o yılın yüzleri',
      'Keşif patlamalarının ve kırılma anlarının tespiti',
      'Zamana direnen şarkılar ve sanatçılar',
      'Dinleme geçmişinin başından bugüne akışı',
      'Kapaklarla görselleştirilen sinematik gezinti',
    ],
    bolumler: [
      {
        baslik: 'Yıllık özet bir yılı anlatır, Journey seni',
        govde: [
          'Recap dönemi anlatır; Journey ise yıllar boyunca nasıl bir dinleyiciye dönüştüğünü. Bunun için uzun bir geçmiş gerekir: Spotify’dan indirdiğin geçmiş dinleme dosyası yıllar öncesine kadar uzanır.',
          'Veriyi yükleyince Rosso onu işler; yıllara göre grupladığı arşivde keşif dönemlerini ve zevkinin değiştiği noktaları gösterir.',
        ],
      },
      {
        baslik: 'Spotify geçmiş verini nasıl alırsın?',
        govde: [
          'Spotify hesap ayarlarında gizlilik bölümünden "verilerini indir" talebi açarsın; genişletilmiş dinleme geçmişi Spotify hazırlayınca (genellikle birkaç gün, en fazla 30 gün) e-postana gelir. Rosso içinde adım adım bir rehber var.',
        ],
      },
    ],
    adimlar: [
      'Spotify’dan genişletilmiş dinleme geçmişini iste.',
      'Gelen dosyayı Rosso’ya yükle.',
      'Journey yıllara göre otomatik oluşur.',
    ],
    sss: [
      {
        q: 'Spotify tüm zamanların dinleme geçmişini nasıl görebilirim?',
        a: 'Spotify’dan genişletilmiş dinleme geçmişini talep edip Rosso’ya yüklersen Journey bu geçmişi yıllara göre gezilebilir hale getirir.',
      },
      {
        q: 'Journey için ne kadar geçmiş gerekir?',
        a: 'Ne kadar uzun geçmiş yüklersen yolculuk o kadar zengin olur; birkaç yıllık veri bile keşif dönemlerini göstermeye yeter.',
      },
      {
        q: 'Verim başkalarına açılıyor mu?',
        a: 'Hayır. Rosso’da kullanıcılar birbirini görmez; Journey yalnız sana aittir.',
      },
    ],
    cta: 'Yıllara yayılan yolculuğunu gör',
    ilgili: ['recap', 'taste'],
  },

  playlists: {
    ad: 'Playlists',
    metaBaslik: 'Spotify playlist oluşturucu: ruh haline göre listeler',
    metaAciklama:
      'Spotify playlist oluşturucu: ruh haline göre çalma listeleri, dinlemene göre kurallar ve tüm Spotify listelerin, beğendiklerin tek yerde.',
    anahtarKelimeler: ['spotify playlist oluşturucu', 'ruh haline göre playlist', 'spotify çalma listesi oluştur', 'mood playlist', 'otomatik spotify playlist'],
    ustYazi: 'PLAYLISTS · YAŞAYAN LİSTELER',
    baslik: 'Spotify playlist oluşturucu: dinlemene ve ruh haline göre çalma listeleri',
    giris:
      'Playlists, Spotify listelerini tek yerde toplar ve dinleme geçmişine göre yeni listeler üretir: ruh haline göre mood listeleri, senin kurallarınla otomatik listeler.',
    ozellikler: [
      'Tüm Spotify çalma listelerin ve beğendiğin şarkılar tek ekranda',
      'Ruh haline göre çalma listeleri (mood)',
      'Kurallarla otomatik oluşturulan listeler (otomasyonlar)',
      'Listeyi tek dokunuşla Spotify hesabına ekleme',
      'Kendi seçtiğin şarkılarla elle liste oluşturma',
    ],
    bolumler: [
      {
        baslik: 'Listeler statik kalmasın',
        govde: [
          'Bir kez oluşturulan çalma listesi zamanla eskir. Rosso, dinleme geçmişindeki örüntülere bakarak sana uyan listeler üretir; ruh haline göre bir liste istediğinde geçmişinde o havaya en yakın şarkıları getirir.',
          'Yapay zekâ katmanı yalnızca bir küratör yardımcısıdır; kapansa bile listeler çalışmaya devam eder.',
        ],
      },
      {
        baslik: 'Kontrol sende',
        govde: [
          'Rosso senin adına bir şeyi sessizce yazmaz: listeyi önce görürsün, Spotify hesabına eklemek senin kararındır. Bağlantı kendi Spotify geliştirici uygulaman üzerinden kurulur.',
        ],
      },
    ],
    adimlar: [
      'Ücretsiz kayıt ol ve Spotify hesabını bağla.',
      'Ruh halini seç ya da bir otomasyon kuralı belirle.',
      'Oluşan listeyi incele, beğendiysen Spotify’a ekle.',
    ],
    sss: [
      {
        q: 'Spotify için playlist oluşturucu olarak Rosso ne yapar?',
        a: 'Dinleme geçmişine göre ruh haline uygun çalma listeleri üretir, senin kurallarınla otomatik listeler oluşturur ve tüm Spotify listelerini tek yerde gösterir.',
      },
      {
        q: 'Oluşan liste kendiliğinden Spotify’a yazılıyor mu?',
        a: 'Hayır. Listeyi önce görürsün; Spotify hesabına eklemek senin onayınla olur.',
      },
      {
        q: 'Ruh haline göre playlist nasıl seçiliyor?',
        a: 'Rosso, geçmişindeki şarkılarının türü ve dinleme bağlamı gibi sinyallerle o havaya uyanları öne çıkarır; çıkan liste her zaman senin kendi geçmişinden gelir.',
      },
    ],
    cta: 'Ücretsiz playlist oluşturmaya başla',
    ilgili: ['taste', 'recap'],
  },
}

const EN: Record<ModulAnahtari, ModulIcerigi> = {
  taste: {
    ad: 'Taste',
    metaBaslik: 'Spotify taste analysis and your music identity',
    metaAciklama:
      'Turn your Spotify history into a music taste analysis: genre DNA, listening hours, loyal artists and a personal music identity. Start free.',
    anahtarKelimeler: ['spotify taste analysis', 'music personality', 'spotify genre analysis', 'music taste profile', 'spotify listening habits'],
    ustYazi: 'TASTE · MUSICAL IDENTITY',
    baslik: 'Spotify taste analysis: see not what you listen to, but who you are as a listener',
    giris:
      'Taste turns your Spotify listening history into a music identity: your dominant genres, the hours you listen, the artists you have stayed loyal to for years, and a vibe card that describes you.',
    ozellikler: [
      'Your genre DNA: a weighted breakdown of your listening by genre',
      'Your daily rhythm: hour-by-hour listening intensity and your peak hour',
      'Right Now and Constants: your recent mood versus songs that have stayed for years',
      'Loyal artists: names you never left',
      'A personal vibe card and identity words',
      'Top 5 tracks, artists and albums; your listening streak and discovery score',
    ],
    bolumler: [
      {
        baslik: 'Spotify shows what you play, Taste shows how you listen',
        govde: [
          'Most Spotify stats tools list your top songs and total minutes. Taste goes one step further: it reads your listening patterns and builds a music identity from them.',
          'Do you listen in the morning or at night, which genres carry you, which artists do you keep returning to? Those say more about character than raw counts.',
        ],
      },
      {
        baslik: 'Your data stays yours',
        govde: [
          'Rosso has no public profiles, follows or messages. Only you see your music identity. You connect your own Spotify account and, if you like, upload the history file you downloaded from Spotify for earlier years.',
        ],
      },
    ],
    adimlar: [
      'Sign up for Rosso for free.',
      'Connect your own Spotify account (through your own developer app, a few minutes).',
      'Optionally upload the listening history you downloaded from Spotify.',
      'Your Taste page builds itself from your listening data.',
    ],
    sss: [
      {
        q: 'How does Spotify taste analysis work?',
        a: 'Rosso processes the songs, artists, genres and times in your Spotify listening history and builds a weighted genre breakdown, a daily listening rhythm and your loyal artists.',
      },
      {
        q: 'Can other people see my music identity?',
        a: 'No. Users cannot see each other in Rosso; your Taste page belongs only to you.',
      },
      {
        q: 'Do I need to download my Spotify data?',
        a: 'Not required. Connecting your account brings in new listening; the history file you download from Spotify is optional and adds deep, multi-year analysis.',
      },
    ],
    cta: 'Discover your music identity for free',
    ilgili: ['recap', 'journey'],
  },

  recap: {
    ad: 'Recap',
    metaBaslik: 'Spotify recap: monthly and yearly listening summary',
    metaAciklama:
      'A Spotify recap every month, not once a year: your top songs, artists, albums and the story of the period. A free Spotify Wrapped alternative.',
    anahtarKelimeler: ['spotify recap', 'spotify wrapped alternative', 'spotify monthly recap', 'spotify yearly summary', 'spotify listening stats'],
    ustYazi: 'RECAP · A MIRROR FOR EACH PERIOD',
    baslik: 'A Spotify recap every month: you should not have to wait a year for Wrapped',
    giris:
      'Recap turns your Spotify listening history into monthly and yearly summaries: your top songs, artists and albums, your busiest day and a short story of the period.',
    ozellikler: [
      'Monthly and yearly Recap summaries',
      'Most played songs, artists and albums',
      'Peak day, listening streak and discoveries of the period',
      'A story-style flow you swipe through',
      'Shareable image cards',
    ],
    bolumler: [
      {
        baslik: 'Wrapped comes once, Recap keeps coming',
        govde: [
          'Spotify Wrapped is published once a year and tells you nothing for the rest of it. Rosso produces a Recap every month, so you see that May was a sleepless indie month in May.',
          'Recap gives you the numbers: how many hours, which songs, which artists. Explaining why you listen this way and who you are is the job of Taste and Journey.',
        ],
      },
      {
        baslik: 'Your data, your account',
        govde: [
          'Rosso uses your own Spotify account and, optionally, the history file you downloaded. Recap is visible only to you; if you want to share, you take the card out yourself.',
        ],
      },
    ],
    adimlar: [
      'Sign up for free and connect your Spotify account.',
      'Optionally upload the data file you downloaded from Spotify for past months.',
      'Your monthly and yearly Recaps build automatically.',
    ],
    sss: [
      {
        q: 'What is the difference between Spotify Recap and Wrapped?',
        a: 'Wrapped is made by Spotify once a year. Rosso’s Recap is generated every month from your own listening data and lets you go back to past periods.',
      },
      {
        q: 'Can I see a Recap for past years?',
        a: 'Yes. If you upload the listening history you downloaded from Spotify, Recaps are created for past months and years too.',
      },
      {
        q: 'Is Recap free?',
        a: 'Rosso is completely free during the alpha.',
      },
    ],
    cta: 'Start your monthly Spotify recap',
    ilgili: ['taste', 'journey'],
  },

  journey: {
    ad: 'Journey',
    metaBaslik: 'Spotify listening history: your music journey by year',
    metaAciklama:
      'Turn your Spotify listening history into a multi-year journey: discovery waves, turning points and your music archive from your first song to today.',
    anahtarKelimeler: ['spotify listening history', 'spotify extended streaming history analysis', 'music journey', 'spotify all time stats', 'spotify history visualizer'],
    ustYazi: 'JOURNEY · A LIFELONG ARCHIVE',
    baslik: 'How has your Spotify listening history changed over the years?',
    giris:
      'Journey turns your Spotify history into a year-by-year journey: what you discovered each year, where your taste turned, and which songs stood the test of time.',
    ozellikler: [
      'A year-by-year listening archive and the faces of each year',
      'Detection of discovery waves and turning points',
      'Songs and artists that stood the test of time',
      'The flow of your listening from the beginning to today',
      'A cinematic walk-through built from cover art',
    ],
    bolumler: [
      {
        baslik: 'A yearly summary tells a year, Journey tells you',
        govde: [
          'Recap describes a period; Journey shows how you became the listener you are over the years. It needs a long history: the extended listening history you can download from Spotify reaches back years.',
          'Once you upload the file, Rosso processes it and groups it by year, showing discovery periods and the points where your taste shifted.',
        ],
      },
      {
        baslik: 'How to get your Spotify listening history',
        govde: [
          'In your Spotify account privacy settings you request your data download; the extended streaming history arrives by email once Spotify has prepared it (usually a few days, up to 30). Rosso includes a step-by-step guide.',
        ],
      },
    ],
    adimlar: [
      'Request your extended listening history from Spotify.',
      'Upload the file you receive to Rosso.',
      'Journey builds itself by year.',
    ],
    sss: [
      {
        q: 'How can I see my all-time Spotify listening history?',
        a: 'Request your extended streaming history from Spotify and upload it to Rosso; Journey turns it into a year-by-year experience you can browse.',
      },
      {
        q: 'How much history do I need for Journey?',
        a: 'The longer the history you upload, the richer the journey; even a few years of data is enough to show discovery periods.',
      },
      {
        q: 'Is my data shared with others?',
        a: 'No. Users cannot see each other in Rosso; Journey belongs only to you.',
      },
    ],
    cta: 'See your journey across the years',
    ilgili: ['recap', 'taste'],
  },

  playlists: {
    ad: 'Playlists',
    metaBaslik: 'Spotify playlist creator: mood-based playlists',
    metaAciklama:
      'A Spotify playlist creator: mood-based playlists, rule-based automatic lists and all your Spotify playlists and liked songs in one place.',
    anahtarKelimeler: ['spotify playlist creator', 'mood playlist generator', 'create spotify playlist', 'automatic spotify playlist', 'spotify playlist maker'],
    ustYazi: 'PLAYLISTS · LIVING LISTS',
    baslik: 'Spotify playlist creator: playlists that follow your listening and your mood',
    giris:
      'Playlists gathers your Spotify playlists in one place and creates new ones from your listening history: mood-based lists and automatic lists driven by your own rules.',
    ozellikler: [
      'All your Spotify playlists and liked songs on one screen',
      'Mood-based playlists',
      'Rule-driven automatic playlists (automations)',
      'Add a list to your Spotify account in one tap',
      'Build lists by hand from songs you choose',
    ],
    bolumler: [
      {
        baslik: 'Playlists should not go stale',
        govde: [
          'A playlist you build once ages over time. Rosso looks at the patterns in your listening history and creates lists that fit you; when you ask for a mood, it brings the songs in your history closest to that feeling.',
          'The AI layer is only a curator’s helper; if it is off, your lists still work.',
        ],
      },
      {
        baslik: 'You stay in control',
        govde: [
          'Rosso never writes to your account silently: you see the list first and adding it to Spotify is your decision. The connection is made through your own Spotify developer app.',
        ],
      },
    ],
    adimlar: [
      'Sign up for free and connect your Spotify account.',
      'Pick a mood or set an automation rule.',
      'Review the generated list and add it to Spotify if you like it.',
    ],
    sss: [
      {
        q: 'What does Rosso do as a Spotify playlist creator?',
        a: 'It creates mood-fitting playlists from your listening history, builds automatic lists from your own rules, and shows all your Spotify playlists in one place.',
      },
      {
        q: 'Is the generated playlist written to Spotify automatically?',
        a: 'No. You see the list first; adding it to your Spotify account happens only with your approval.',
      },
      {
        q: 'How is a mood playlist chosen?',
        a: 'Rosso surfaces songs from your own history that fit the feeling using signals like genre and listening context; the result always comes from your own history.',
      },
    ],
    cta: 'Start creating playlists for free',
    ilgili: ['taste', 'recap'],
  },
}

export const MODUL_ICERIGI: Record<Dil, Record<ModulAnahtari, ModulIcerigi>> = { tr: TR, en: EN }

/** Modül merkez (hub) sayfasının SEO metni. */
export const MODUL_MERKEZI: Record<
  Dil,
  { metaBaslik: string; metaAciklama: string; baslik: string; giris: string; anaSayfa: string; ustYazi: string }
> = {
  tr: {
    metaBaslik: 'Rosso modülleri: Spotify recap, playlist, müzik kimliği',
    metaAciklama:
      'Rosso’nun modülleri: müzik kimliğin (Taste), aylık Spotify recap, yıllara yayılan Journey ve Spotify playlist oluşturucu. Ücretsiz alfa.',
    baslik: 'İstatistikten öteye: Rosso modülleri',
    giris:
      'Spotify dinleme geçmişini hikâyeye çeviren dört modül: müzik kimliğin, aylık ve yıllık özetlerin, yıllara yayılan yolculuğun ve yaşayan çalma listelerin.',
    anaSayfa: 'Ana sayfa',
    ustYazi: 'MODÜLLER',
  },
  en: {
    metaBaslik: 'Rosso modules: Spotify recap, playlists, music identity',
    metaAciklama:
      'Rosso’s modules: your music identity (Taste), a monthly Spotify recap, the multi-year Journey and a Spotify playlist creator. Free alpha.',
    baslik: 'Beyond the numbers: Rosso modules',
    giris:
      'Four modules that turn your Spotify listening history into a story: your music identity, monthly and yearly summaries, a journey across the years and living playlists.',
    anaSayfa: 'Home',
    ustYazi: 'MODULES',
  },
}
