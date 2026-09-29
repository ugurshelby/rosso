import type { Dil } from './dil'

/**
 * Marketing arayüz metinleri — iki dilin tek kaynağı.
 *
 * Türkçe ANA dildir; İngilizce onun karşılığıdır. Yeni bir metin eklenirken
 * İKİ dile birden yazılır — tip (`MarketingSozluk`) Türkçe nesneden
 * türetildiği için İngilizcede eksik anahtar derleme hatası verir.
 *
 * Kapsam dışı: bölüm bileşenlerinin kendi içinde tuttuğu kopya
 * (`DepthEcosystemSection`, `ProcessStreamSection`, vibe kartları) ve blog
 * yazılarının gövdesi (`app/(marketing)/blog/posts.ts`).
 *
 * ⚠ Ürün iddiası yazarken: Rosso saf Spotify platformudur (CLAUDE.md §4).
 * Çok platform / playlist taşıma vaadi YAZILMAZ — 2026-09-22'de fiyat
 * sayfasında ve blogda bu türden eski vaatler temizlendi.
 */

const tr = {
  kabuk: {
    menuEtiketi: 'Site menüsü',
    yardim: 'Yardım',
    gizlilik: 'Gizlilik',
    blog: 'Blog',
    moduller: 'Modüller',
    planlar: 'Planlar',
    girisYap: 'Giriş yap',
    footerNotu: '© 2026 Project Rosso — müzik geçmişin, tek yerde',
    footerMenuEtiketi: 'Alt menü',
    /** Dil değiştiricide gösterilen, KARŞI dilin kısaltması. */
    karsiDilKisa: 'EN',
    karsiDilEtiketi: 'Switch to English',
  },
  /*
   * ⚠ Metin DAVRANIŞI anlatmak zorunda (2026-09-22, KVKK denetimi).
   * Eski cümle "yalnızca temel çerezler kullanıyoruz" diyordu; oysa Vercel
   * Web Analytics de yükleniyordu ve "Reddet" onu kapatmıyordu. Artık
   * "Reddet" ölçümü fiilen kapatıyor, metin de bunu söylüyor.
   */
  cerez: {
    baslik: 'Gizliliğin önemli',
    metinOnce:
      'Site için gereken temel çerezler her hâlükârda çalışır. Bunun dışında ' +
      'yalnızca isimsiz ziyaret ölçümü var ve onu sen açıyorsun — "Reddet" ' +
      'dersen hiç yüklenmez. Ayrıntılar ',
    link: 'gizlilik politikasında',
    metinSonra: '.',
    reddet: 'Reddet',
    kabul: 'Kabul et',
    bildirimEtiketi: 'Çerez bildirimi',
  },
  anaSayfa: {
    metaBaslik: 'Rosso — müzik kimliğin',
    metaAciklama:
      'Spotify ne dinlediğini gösterir, Rosso seni anlatır. Dinleme geçmişini ' +
      'tek yerde topla; recap, journey ve müzik kimliğini keşfet.',
    paylasimAciklamasi: 'Spotify ne dinlediğini gösterir, Rosso seni anlatır.',
    rozet: 'Müzik Kimliği Platformu',
    girisSoluk: 'Spotify ne dinlediğini gösterir.',
    girisOnce: 'Rosso ',
    girisVurgu: 'seni',
    girisSonra: ' anlatır.',
    cta: 'Ücretsiz başla',
    platformEtiketi: 'Desteklenen platformlar',
    platformDestekleniyor: 'destekleniyor',
    kapanisUstYazi: 'Son',
    kapanisBaslik: 'Perde burada açılıyor',
    kapanisAlt: 'Spotify’ını bağla; müzik kimliğin birkaç dakikada hazır.\nŞimdilik ücretsiz.',
  },
  kimlikSeridi: {
    ekranOkuyucu: 'Rosso’nun çıkardığı dinleme profili örnekleri: ',
    kelimeler: [
      'Gece Kuşu',
      'Şafak Dinleyicisi',
      'Erken Keşifçi',
      'Sadık Küratör',
      'Gezgin Dinleyici',
      'Uykusuz Indie Ayı',
      'Sürpriz Kombinasyon',
      'Odaklı Dinleyici',
      'Eklektik Ruh',
      'Arşiv Bekçisi',
      'Keşif Modunda',
    ],
  },
  vibe: {
    bolumEtiketi: 'Vibe kartları vitrini',
    kartEtiketi: 'vibe kartı',
  },
  fiyat: {
    metaBaslik: 'Planlar',
    metaAciklama:
      'Rosso alfa boyunca tamamen ücretsiz: Spotify geçmişin, recap, journey, ' +
      'taste ve ruh haline göre çalma listeleri. Kart istenmez.',
    ustYazi: 'Planlar',
    baslik: 'Alfa boyunca ücretsiz',
    giris:
      'Rosso şu an alfa aşamasında ve her özelliği açık. Kart istenmez. ' +
      'Kalıcı fiyatlar yayından önce duyurulur; o güne kadar ödeme yok.',
    plan: {
      ad: 'Alfa',
      durum: 'Şimdi kullanılabilir',
      aciklama: 'Spotify geçmişinle Rosso’nun her köşesi açık.',
      fiyat: '₺0',
      birim: 'alfa boyunca',
      ozellikler: [
        'Spotify dinleme geçmişini (ZIP) yükleme',
        'Yeni dinlemelerin kendiliğinden eşitlenmesi',
        'Aylık ve yıllık Recap',
        'Journey: yıllara yayılan dinleme yolculuğun',
        'Taste ve sana özel vibe kartı',
        'Ruh haline göre çalma listeleri',
      ],
      cta: 'Hikâyeni başlat',
    },
    kapanisEtiketi: 'Alfaya katıl',
    kapanisUstYazi: 'Son',
    kapanisBaslik: 'Alfa boyunca ödeme yok',
    kapanisAlt:
      'Kart istenmez. Erken katılanlar Rosso’nun nasıl şekilleneceğine de yön verir.',
    kapanisCta: 'Hikâyeni başlat',
    notOnce: 'Verin senin — satılmaz, reklam için kullanılmaz. Ayrıntı ',
    notLink: 'gizlilik politikasında',
    notSonra: '.',
  },
  yardim: {
    metaBaslik: 'Yardım ve sık sorulan sorular',
    metaAciklama: 'Rosso nasıl çalışır, Spotify geçmişini nasıl yüklersin, verilerin nasıl korunur ve destek nasıl alınır — sık sorulan soruların kısa cevapları.',
    geri: 'Ana sayfa',
    baslik: 'Yardım',
    giris:
      'Sık sorulan sorular ve destek. Hesap işlemleri için giriş yapıp ' +
      'Settings sayfasını kullan.',
    sssBaslik: 'Sık sorulan sorular',
    sss: [
      {
        q: 'Recap ne zaman hazır olur?',
        a: 'Aylık recap ay bitince görünür; yıllık recap, Spotify dinleme geçmişini yükledikten sonra oluşur. Henüz görünmüyorsa birkaç gün bekle ya da Data sayfasından geçmişini kontrol et.',
      },
      {
        q: 'Rosso ne yapar?',
        a: 'Spotify dinleme geçmişini recap’lere, bir müzik kimliğine ve çalma listelerine dönüştürür; ruh haline göre listeler de üretir.',
      },
      {
        q: 'Spotify bağlantısını koparırsam verilerim silinir mi?',
        a: 'Hayır. Geçmiş dinleme verin kalır, yalnızca güncellemeler durur. Yeniden bağlandığında kaldığın yerden devam edersin.',
      },
      {
        q: 'Hesabımı nasıl silerim?',
        a: 'Giriş yaptıktan sonra Settings → Danger zone bölümünden hesabını kalıcı olarak silebilirsin. Bu işlem tüm verini kaldırır ve geri alınamaz.',
      },
      {
        q: 'Verilerimin bir kopyasını nasıl alırım?',
        a: 'Settings › Download my data bölümünden JSON biçiminde bir kopya indirebilirsin.',
      },
    ],
    iletisimBaslik: 'İletişim',
    iletisimEpostaOnce: 'Cevabını bulamadın mı, yardıma mı ihtiyacın var? Bize yaz: ',
    iletisimGirisOnce: 'Giriş yaptıktan sonra hesap işlemlerini ',
    iletisimAyarlar: 'Settings',
    iletisimOrta: ' sayfasından yönetebilirsin. Verilerinin bir kopyası için ',
    iletisimIndir: 'Download my data',
    iletisimSon: ' bölümünü kullan.',
  },
  blog: {
    metaBaslik: 'Blog: Spotify verisi ve dinleme notları',
    metaAciklama: 'Spotify geçmiş verini indirme, aylık recap, dinleme alışkanlıkları ve gizlilik üzerine kısa, uygulamalı yazılar.',
    ustYazi: 'Blog',
    baslik: 'Notlar',
    giris: 'Müzik verisi, dinleme alışkanlıkları ve gizlilik. Kararlarımızın arka planı.',
    yaziSayisiEtiketi: 'yazı',
    oneCikanEtiketi: 'Öne çıkan yazı',
    dkOkuma: 'dk okuma',
    dk: 'dk',
    yaziyiOku: 'Yazıyı oku',
    tumYazilarEtiketi: 'Tüm yazılar',
    arsiv: 'Arşiv',
    kapanisEtiketi: 'Kayıt ol',
    kapanisUstYazi: 'Son',
    kapanisBaslik: 'Geçmişini keşfet',
    kapanisAlt:
      'Rosso alfa aşamasında ve ücretsiz. Spotify’ını bağla, dinleme geçmişine yeniden bak.',
    kapanisCta: 'Geçmişini keşfet',
    tumYazilar: 'Tüm yazılar',
    anaSayfa: 'Ana sayfa',
    oncekiYazi: 'Önceki yazı',
    sonrakiYazi: 'Sonraki yazı',
    yazilarArasi: 'Yazılar arası gezinme',
    bulunamadi: 'Yazı bulunamadı',
  },
}

export type MarketingSozluk = typeof tr

const en: MarketingSozluk = {
  kabuk: {
    menuEtiketi: 'Site menu',
    yardim: 'Help',
    gizlilik: 'Privacy',
    blog: 'Blog',
    moduller: 'Modules',
    planlar: 'Plans',
    girisYap: 'Sign in',
    footerNotu: '© 2026 Project Rosso — your music history, in one place',
    footerMenuEtiketi: 'Footer menu',
    karsiDilKisa: 'TR',
    karsiDilEtiketi: 'Türkçeye geç',
  },
  cerez: {
    baslik: 'Your privacy matters',
    metinOnce:
      'Essential cookies always run so the site works. Beyond that there is ' +
      'only anonymous visit measurement, and you turn it on — choose ' +
      '“Decline” and it never loads. Details in our ',
    link: 'privacy policy',
    metinSonra: '.',
    reddet: 'Decline',
    kabul: 'Accept',
    bildirimEtiketi: 'Cookie notice',
  },
  anaSayfa: {
    metaBaslik: 'Rosso — your musical identity',
    metaAciklama:
      'Spotify shows what you listened to; Rosso tells who you are. Bring your ' +
      'listening history together and discover your recap, journey and musical identity.',
    paylasimAciklamasi: 'Spotify shows what you listened to. Rosso tells who you are.',
    rozet: 'Musical Identity Platform',
    girisSoluk: 'Spotify shows what you listened to.',
    girisOnce: 'Rosso tells ',
    girisVurgu: 'who you are',
    girisSonra: '.',
    cta: 'Start free',
    platformEtiketi: 'Supported platforms',
    platformDestekleniyor: 'supported',
    kapanisUstYazi: 'Finale',
    kapanisBaslik: 'The curtain rises here',
    kapanisAlt: 'Connect Spotify; your musical identity is ready in minutes.\nFree for now.',
  },
  kimlikSeridi: {
    ekranOkuyucu: 'Examples of listening profiles Rosso creates: ',
    kelimeler: [
      'Night Owl',
      'Dawn Listener',
      'Early Discoverer',
      'Loyal Curator',
      'Wandering Listener',
      'Sleepless Indie Month',
      'Surprise Combination',
      'Focused Listener',
      'Eclectic Soul',
      'Archive Keeper',
      'In Discovery Mode',
    ],
  },
  vibe: {
    bolumEtiketi: 'Vibe cards showcase',
    kartEtiketi: 'vibe card',
  },
  fiyat: {
    metaBaslik: 'Plans',
    metaAciklama:
      'Rosso is completely free during alpha: your Spotify history, recap, journey, ' +
      'taste and mood-based playlists. No card required.',
    ustYazi: 'Plans',
    baslik: 'Free during alpha',
    giris:
      'Rosso is in alpha and every feature is open. No card required. ' +
      'Permanent pricing will be announced before launch; until then, nothing to pay.',
    plan: {
      ad: 'Alpha',
      durum: 'Available now',
      aciklama: 'Every corner of Rosso, open with your Spotify history.',
      fiyat: '$0',
      birim: 'during alpha',
      ozellikler: [
        'Upload your Spotify listening history (ZIP)',
        'New listens sync automatically',
        'Monthly and yearly Recap',
        'Journey: your listening story across the years',
        'Taste and a vibe card of your own',
        'Mood-based playlists',
      ],
      cta: 'Start your story',
    },
    kapanisEtiketi: 'Join the alpha',
    kapanisUstYazi: 'Finale',
    kapanisBaslik: 'Nothing to pay during alpha',
    kapanisAlt: 'No card required. Early members help shape where Rosso goes next.',
    kapanisCta: 'Start your story',
    notOnce: 'Your data is yours — never sold, never used for ads. Details in our ',
    notLink: 'privacy policy',
    notSonra: '.',
  },
  yardim: {
    metaBaslik: 'Help and FAQ',
    metaAciklama: 'How Rosso works, how to upload your Spotify history, how your data is protected and how to reach support — short answers to common questions.',
    geri: 'Home',
    baslik: 'Help',
    giris:
      'Frequently asked questions and support. For account actions, sign in ' +
      'and use Settings.',
    sssBaslik: 'Frequently asked questions',
    sss: [
      {
        q: 'When is Recap ready?',
        a: 'Monthly recaps appear when the month ends; yearly recaps after you upload your Spotify listening history. If it isn’t visible yet, wait a few days or check your history on the Data page.',
      },
      {
        q: 'What does Rosso do?',
        a: 'It turns your Spotify listening history into recaps, a musical identity, and playlists; it also builds mood-based playlists.',
      },
      {
        q: 'If I disconnect Spotify, is my data deleted?',
        a: 'No. Past listening data stays; only updates stop. Reconnect and you continue from where you left off.',
      },
      {
        q: 'How do I delete my account?',
        a: 'After you sign in, go to Settings → Danger zone to delete your account permanently. This removes all data and cannot be undone.',
      },
      {
        q: 'How do I request a copy of my data?',
        a: 'Download a JSON copy from Settings › Download my data.',
      },
    ],
    iletisimBaslik: 'Contact',
    iletisimEpostaOnce: 'Didn’t find an answer, or need help? Write to us: ',
    iletisimGirisOnce: 'After you sign in, you can manage account actions from ',
    iletisimAyarlar: 'Settings',
    iletisimOrta: '. For a copy of your data, use ',
    iletisimIndir: 'Download my data',
    iletisimSon: '.',
  },
  blog: {
    metaBaslik: 'Blog: Spotify data and listening notes',
    metaAciklama: 'Short, practical posts on downloading your Spotify history, monthly recaps, listening habits and privacy.',
    ustYazi: 'Blog',
    baslik: 'Notes',
    giris: 'Music data, listening habits and privacy. The thinking behind our decisions.',
    yaziSayisiEtiketi: 'posts',
    oneCikanEtiketi: 'Featured post',
    dkOkuma: 'min read',
    dk: 'min',
    yaziyiOku: 'Read the post',
    tumYazilarEtiketi: 'All posts',
    arsiv: 'Archive',
    kapanisEtiketi: 'Sign up',
    kapanisUstYazi: 'Finale',
    kapanisBaslik: 'Rediscover your history',
    kapanisAlt:
      'Rosso is in alpha and free. Connect Spotify and take a fresh look at your listening history.',
    kapanisCta: 'Rediscover your history',
    tumYazilar: 'All posts',
    anaSayfa: 'Home',
    oncekiYazi: 'Previous post',
    sonrakiYazi: 'Next post',
    yazilarArasi: 'Post navigation',
    bulunamadi: 'Post not found',
  },
}

export const SOZLUK: Record<Dil, MarketingSozluk> = { tr, en }
